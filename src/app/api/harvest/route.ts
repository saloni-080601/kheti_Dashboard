export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const farmId = searchParams.get('farmId');

    const harvestLogs = await prisma.harvestLog.findMany({
      where: farmId && farmId !== 'ALL' ? { crop: { farmId } } : {},
      include: {
        crop: {
          include: { farm: true },
        },
        field: true,
      },
      orderBy: { harvestDate: 'desc' },
    });

    const inventoryItems = await prisma.inventoryItem.findMany({
      where: farmId && farmId !== 'ALL' ? { farmId } : {},
      include: { farm: true },
      orderBy: { category: 'asc' },
    });

    return NextResponse.json({ harvestLogs, inventoryItems });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch harvest & inventory' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'RECORD_HARVEST') {
      const {
        cropId,
        fieldId,
        harvestDate,
        quantity,
        unit,
        grade,
        cratesCount,
        labourCount,
        storageLocation,
        notes,
      } = body;

      if (!cropId || !fieldId || !harvestDate || !quantity) {
        return NextResponse.json({ error: 'Crop, field, date, and quantity are required' }, { status: 400 });
      }

      const q = parseFloat(quantity);
      const crates = cratesCount ? parseInt(cratesCount, 10) : 0;
      const labour = labourCount ? parseInt(labourCount, 10) : 0;

      const log = await prisma.harvestLog.create({
        data: {
          cropId,
          fieldId,
          harvestDate: new Date(harvestDate),
          quantity: q,
          unit: unit || 'Kg',
          grade: grade || 'Grade A',
          cratesCount: crates,
          labourCount: labour,
          storageLocation: storageLocation || 'Farm Packing Yard',
          notes: notes || '',
        },
      });

      // Update crop status, stage and actual yield
      const crop = await prisma.crop.findUnique({
        where: { id: cropId },
        include: { harvestLogs: true },
      });

      if (crop) {
        const totalYield = crop.harvestLogs.reduce((s, h) => s + h.quantity, 0);
        const isFirstHarvest = !crop.actualFirstHarvest;

        await prisma.crop.update({
          where: { id: cropId },
          data: {
            actualYield: totalYield,
            actualHarvestDate: new Date(harvestDate),
            ...(isFirstHarvest ? { actualFirstHarvest: new Date(harvestDate) } : {}),
            status: 'HARVESTING',
            currentStageNumber: Math.max(crop.currentStageNumber, 8),
            currentStageName: 'Harvesting & Picking',
          },
        });

        // Update Stage 8 in CropStage
        await prisma.cropStage.upsert({
          where: { cropId_stageNumber: { cropId, stageNumber: 8 } },
          update: {
            status: 'IN_PROGRESS',
            ...(isFirstHarvest ? { actualDate: new Date(harvestDate) } : {}),
          },
          create: {
            cropId,
            stageNumber: 8,
            stageKey: 'HARVESTING',
            stageName: 'Harvesting & Picking',
            hindiName: 'तुड़ाई व पिकिंग (Daily/Weekly)',
            status: 'IN_PROGRESS',
            actualDate: new Date(harvestDate),
          },
        });

        // Add to inventory under CROP_HARVEST
        await prisma.inventoryItem.create({
          data: {
            farmId: crop.farmId,
            name: `${crop.name} (Lot: ${grade || 'Grade A'} - ${q} ${unit || 'Kg'})`,
            category: 'CROP_HARVEST',
            quantity: q,
            unit: unit || 'Kg',
            minStockAlert: 10,
            unitPrice: 0,
            notes: `Daily harvest: ${crates} crates from ${storageLocation || 'Field'}`,
          },
        });
      }

      return NextResponse.json(log, { status: 201 });
    }

    if (action === 'ADD_INVENTORY') {
      const { farmId, name, category, quantity, unit, minStockAlert, unitPrice, notes } = body;

      if (!farmId || !name || !category || quantity === undefined) {
        return NextResponse.json({ error: 'Farm, item name, category, and quantity are required' }, { status: 400 });
      }

      const item = await prisma.inventoryItem.create({
        data: {
          farmId,
          name,
          category,
          quantity: parseFloat(quantity),
          unit: unit || 'Bag',
          minStockAlert: minStockAlert ? parseFloat(minStockAlert) : 5,
          unitPrice: unitPrice ? parseFloat(unitPrice) : 0,
          notes: notes || '',
        },
      });

      return NextResponse.json(item, { status: 201 });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error handling harvest & inventory:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
