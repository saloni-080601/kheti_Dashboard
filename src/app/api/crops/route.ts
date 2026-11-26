export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  calculateDynamicStageDates,
  generateCropReminders,
  CROP_TEMPLATES,
  HORTICULTURE_STAGES,
} from '@/lib/horticulture';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const farmId = searchParams.get('farmId');
    const season = searchParams.get('season');
    const status = searchParams.get('status');

    const crops = await prisma.crop.findMany({
      where: {
        ...(farmId && farmId !== 'ALL' ? { farmId } : {}),
        ...(season && season !== 'ALL' ? { season } : {}),
        ...(status && status !== 'ALL' ? { status } : {}),
      },
      include: {
        farm: true,
        field: true,
        fieldSection: true,
        stages: {
          orderBy: { stageNumber: 'asc' },
        },
        reminders: {
          orderBy: { dueDate: 'asc' },
        },
        activities: {
          orderBy: { date: 'desc' },
        },
        harvestLogs: {
          orderBy: { harvestDate: 'desc' },
        },
        sales: {
          orderBy: { saleDate: 'desc' },
        },
        productionEntries: {
          orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
        },
        productionBatches: {
          include: { entries: { orderBy: { createdAt: 'asc' } } },
          orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
        },
        expenses: {
          orderBy: { date: 'desc' },
        },
        fertilizerApplications: {
          include: { inventoryItem: true },
          orderBy: { applicationDate: 'desc' },
        },
      },
      orderBy: { sowingDate: 'desc' },
    });

    // Enrich crops with calculated financial stats, stage costs & mandi metrics
    const enrichedCrops = crops.map((crop) => {
      const totalExpense = crop.expenses.reduce((s, e) => s + e.amount, 0);
      const totalIncome = crop.sales.reduce((s, sale) => s + sale.netAmount, 0);
      const profitLoss = totalIncome - totalExpense;
      const profitPerAcre = crop.area > 0 ? profitLoss / crop.area : 0;
      
      // Total yield in Kg
      const totalHarvestedKg = crop.harvestLogs.reduce((s, h) => s + h.quantity, 0);
      const yieldPerAcreKg = crop.area > 0 ? totalHarvestedKg / crop.area : 0;

      // Mandi sales analytics
      const totalSoldKg = crop.sales.reduce((s, sale) => s + sale.quantity, 0);
      const totalGrossAmount = crop.sales.reduce((s, sale) => s + sale.totalAmount, 0);
      const totalDeductions = crop.sales.reduce((s, sale) => s + sale.deductions, 0);
      const totalAmountReceived = crop.sales.reduce((s, sale) => s + sale.amountReceived, 0);
      const pendingMandiPayment = Math.max(0, totalIncome - totalAmountReceived);
      const avgRealizedRatePerKg = totalSoldKg > 0 ? totalIncome / totalSoldKg : 0;

      // Stage-wise costs aggregation
      const stageWiseCost: Record<number, { labour: number; material: number; total: number }> = {};
      for (let i = 1; i <= 9; i++) {
        stageWiseCost[i] = { labour: 0, material: 0, total: 0 };
      }

      // Add from stage models
      crop.stages.forEach((st) => {
        stageWiseCost[st.stageNumber] = {
          labour: st.labourCost || 0,
          material: st.materialCost || 0,
          total: st.totalCost || 0,
        };
      });

      // Add from stage-tagged expenses
      crop.expenses.forEach((exp) => {
        if (exp.stageNumber && stageWiseCost[exp.stageNumber]) {
          if (exp.category === 'LABOUR') {
            stageWiseCost[exp.stageNumber].labour += exp.amount;
          } else {
            stageWiseCost[exp.stageNumber].material += exp.amount;
          }
          stageWiseCost[exp.stageNumber].total += exp.amount;
        }
      });

      return {
        ...crop,
        totalExpense,
        totalIncome,
        profitLoss,
        profitPerAcre,
        totalHarvestedKg,
        yieldPerAcreKg,
        totalSoldKg,
        totalGrossAmount,
        totalDeductions,
        totalAmountReceived,
        pendingMandiPayment,
        avgRealizedRatePerKg,
        stageWiseCost,
      };
    });

    return NextResponse.json(enrichedCrops);
  } catch (error) {
    console.error('Error fetching crops:', error);
    return NextResponse.json({ error: 'Failed to fetch crops' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      farmId,
      fieldId,
      fieldSectionId,
      name,
      variety,
      season,
      area,
      sowingDate,
      expectedHarvestDate,
      estDaysToHarvest,
      targetYield,
      notes,
    } = body;

    if (!farmId || !fieldId || !name || !area || isNaN(Number(area)) || !season || !sowingDate) {
      return NextResponse.json(
        { error: 'Crop name, field, season, sowing date, and area (acres) are required' },
        { status: 400 }
      );
    }

    const requestedArea = parseFloat(area);

    // LAND CAPACITY GUARD:
    const field = await prisma.field.findUnique({
      where: { id: fieldId },
      include: {
        crops: {
          where: { status: { in: ['PLANNING', 'SOWN', 'GROWING', 'HARVESTING'] } },
        },
      },
    });

    if (!field) {
      return NextResponse.json({ error: 'Field not found' }, { status: 404 });
    }

    const currentCultivatedArea = field.crops.reduce((acc, c) => acc + c.area, 0);
    const availableArea = Math.max(0, field.area - currentCultivatedArea);

    if (requestedArea > availableArea + 0.01) {
      return NextResponse.json(
        {
          error: `Land limit exceeded! Field "${field.name}" has ${field.area} acres total, ` +
            `with ${currentCultivatedArea.toFixed(1)} acres already cultivated. ` +
            `Only ${availableArea.toFixed(1)} acres available. You requested ${requestedArea} acres.`,
        },
        { status: 400 }
      );
    }

    const template = CROP_TEMPLATES[name];
    const daysToHarvest = estDaysToHarvest
      ? parseInt(estDaysToHarvest, 10)
      : template?.defaultEstDaysToHarvest || 35;

    // Calculate stage dates
    const stagesCalculated = calculateDynamicStageDates({
      sowingDate: new Date(sowingDate),
      cropName: name,
      estDaysToHarvest: daysToHarvest,
    });

    const expectedFirstHarvest = stagesCalculated.find((s) => s.stageNumber === 8)?.expectedDate;

    // Create Crop
    const crop = await prisma.crop.create({
      data: {
        farmId,
        fieldId,
        fieldSectionId: fieldSectionId || null,
        name,
        variety: variety || '',
        season,
        area: requestedArea,
        sowingDate: new Date(sowingDate),
        expectedHarvestDate: expectedHarvestDate ? new Date(expectedHarvestDate) : expectedFirstHarvest,
        expectedFirstHarvest: expectedFirstHarvest,
        estDaysToHarvest: daysToHarvest,
        targetYield: targetYield ? parseFloat(targetYield) : null,
        currentStageNumber: 6, // Planting stage active by default on sowing
        currentStageName: 'Planting / Sowing',
        status: 'GROWING',
        notes: notes || '',
      },
    });

    // Create the 9 CropStage records
    for (const st of stagesCalculated) {
      await prisma.cropStage.create({
        data: {
          cropId: crop.id,
          stageNumber: st.stageNumber,
          stageKey: st.stageKey,
          stageName: st.stageName,
          hindiName: st.hindiName,
          estDaysOffset: st.estDaysOffset,
          expectedDate: st.expectedDate,
          actualDate: st.actualDate,
          status:
            st.stageNumber < 6
              ? 'COMPLETED'
              : st.stageNumber === 6
              ? 'IN_PROGRESS'
              : 'PENDING',
        },
      });
    }

    // Generate Smart Reminders
    const reminders = generateCropReminders({
      cropId: crop.id,
      farmId: crop.farmId,
      cropName: crop.name,
      plantingDate: new Date(sowingDate),
      currentStageNumber: 6,
      estDaysToHarvest: daysToHarvest,
    });

    for (const r of reminders) {
      await prisma.farmReminder.create({
        data: r,
      });
    }

    return NextResponse.json(crop, { status: 201 });
  } catch (error) {
    console.error('Error creating crop:', error);
    return NextResponse.json({ error: 'Failed to create crop' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    if (body.action === 'UPDATE_HAMALI_CONFIG') {
      const rate = Number(body.hamaliRatePerPack);
      const packSize = Number(body.hamaliPackSize);
      const unit = String(body.hamaliPackUnit || 'kg').toLowerCase();
      if (!body.id || !Number.isFinite(rate) || rate < 0 || !Number.isFinite(packSize) || packSize <= 0 || !['kg', 'crate'].includes(unit)) {
        return NextResponse.json({ error: 'Enter a valid hamali rate and pack size.' }, { status: 400 });
      }

      const updatedCrop = await prisma.crop.update({
        where: { id: body.id },
        data: { hamaliRatePerPack: rate, hamaliPackSize: packSize, hamaliPackUnit: unit },
        select: { id: true, hamaliRatePerPack: true, hamaliPackSize: true, hamaliPackUnit: true },
      });
      return NextResponse.json(updatedCrop);
    }

    const {
      id,
      status,
      currentStageNumber,
      estDaysToHarvest,
      actualHarvestDate,
      actualFirstHarvest,
      sowingDate,
      notes,
      name,
      fieldId,
      area,
    } = body;

    if (!id) return NextResponse.json({ error: 'Crop ID is required' }, { status: 400 });

    const existingCrop = await prisma.crop.findUnique({
      where: { id },
      include: { stages: true },
    });

    if (!existingCrop) {
      return NextResponse.json({ error: 'Crop not found' }, { status: 404 });
    }

    let updatedArea: number | undefined;
    if (name !== undefined || fieldId !== undefined || area !== undefined) {
      if (name !== undefined && !String(name).trim()) {
        return NextResponse.json({ error: 'Crop name is required.' }, { status: 400 });
      }
      if (area !== undefined) {
        updatedArea = Number(area);
        if (!Number.isFinite(updatedArea) || updatedArea <= 0) {
          return NextResponse.json({ error: 'Enter a valid crop area greater than zero.' }, { status: 400 });
        }
      }

      const targetFieldId = fieldId || existingCrop.fieldId;
      const targetField = await prisma.field.findUnique({
        where: { id: targetFieldId },
        include: {
          crops: {
            where: {
              id: { not: id },
              status: { in: ['PLANNING', 'SOWN', 'GROWING', 'HARVESTING'] },
            },
          },
        },
      });
      if (!targetField || targetField.farmId !== existingCrop.farmId) {
        return NextResponse.json({ error: 'Select a valid field from this crop’s farm.' }, { status: 400 });
      }
      const requestedArea = updatedArea ?? existingCrop.area;
      const occupiedArea = targetField.crops.reduce((sum, crop) => sum + crop.area, 0);
      if (requestedArea > targetField.area - occupiedArea + 0.01) {
        return NextResponse.json({
          error: `This field has only ${Math.max(0, targetField.area - occupiedArea).toFixed(1)} acres available.`,
        }, { status: 400 });
      }
    }

    const newStageNumber = currentStageNumber !== undefined
      ? parseInt(currentStageNumber, 10)
      : existingCrop.currentStageNumber;

    const stageDef = HORTICULTURE_STAGES.find((s) => s.stageNumber === newStageNumber);
    const newStageName = stageDef ? stageDef.stageName : existingCrop.currentStageName;

    const newDaysToHarvest = estDaysToHarvest !== undefined
      ? parseInt(estDaysToHarvest, 10)
      : existingCrop.estDaysToHarvest || 35;

    const basePlantingDate = sowingDate ? new Date(sowingDate) : existingCrop.sowingDate;
    const firstHarvestActual = actualFirstHarvest ? new Date(actualFirstHarvest) : existingCrop.actualFirstHarvest;

    // Recalibrate dynamic stage dates
    const recalculatedStages = calculateDynamicStageDates({
      sowingDate: basePlantingDate,
      cropName: name || existingCrop.name,
      estDaysToHarvest: newDaysToHarvest,
      actualPlantingDate: basePlantingDate,
      actualFirstHarvestDate: firstHarvestActual,
      existingStages: existingCrop.stages,
    });

    // Update stages in DB
    for (const st of recalculatedStages) {
      await prisma.cropStage.upsert({
        where: {
          cropId_stageNumber: {
            cropId: id,
            stageNumber: st.stageNumber,
          },
        },
        update: {
          estDaysOffset: st.estDaysOffset,
          expectedDate: st.expectedDate,
          ...(st.actualDate ? { actualDate: st.actualDate } : {}),
          status:
            st.stageNumber < newStageNumber
              ? 'COMPLETED'
              : st.stageNumber === newStageNumber
              ? 'IN_PROGRESS'
              : 'PENDING',
        },
        create: {
          cropId: id,
          stageNumber: st.stageNumber,
          stageKey: st.stageKey,
          stageName: st.stageName,
          hindiName: st.hindiName,
          estDaysOffset: st.estDaysOffset,
          expectedDate: st.expectedDate,
          actualDate: st.actualDate,
          status:
            st.stageNumber < newStageNumber
              ? 'COMPLETED'
              : st.stageNumber === newStageNumber
              ? 'IN_PROGRESS'
              : 'PENDING',
        },
      });
    }

    const updatedCrop = await prisma.crop.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(fieldId !== undefined ? { fieldId } : {}),
        ...(updatedArea !== undefined ? { area: updatedArea } : {}),
        currentStageNumber: newStageNumber,
        currentStageName: newStageName,
        estDaysToHarvest: newDaysToHarvest,
        ...(sowingDate ? { sowingDate: new Date(sowingDate) } : {}),
        ...(actualFirstHarvest ? { actualFirstHarvest: new Date(actualFirstHarvest) } : {}),
        ...(actualHarvestDate ? { actualHarvestDate: new Date(actualHarvestDate) } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
      include: {
        stages: { orderBy: { stageNumber: 'asc' } },
        reminders: true,
      },
    });

    return NextResponse.json(updatedCrop);
  } catch (error) {
    console.error('Error updating crop:', error);
    return NextResponse.json({ error: 'Failed to update crop' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Crop ID required' }, { status: 400 });

    await prisma.crop.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete crop' }, { status: 500 });
  }
}
