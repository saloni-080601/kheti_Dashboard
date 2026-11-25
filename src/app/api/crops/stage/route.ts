export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { HORTICULTURE_STAGES } from '@/lib/horticulture';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      cropId,
      stageNumber,
      status,
      actualDate,
      workerCount,
      workDays,
      wagePerDay,
      materialItems,
      materialCost,
      notes,
    } = body;

    if (!cropId || !stageNumber) {
      return NextResponse.json({ error: 'Crop ID and Stage number are required' }, { status: 400 });
    }

    const stageNum = parseInt(stageNumber, 10);
    const workers = workerCount ? parseInt(workerCount, 10) : 0;
    const days = workDays ? parseFloat(workDays) : 0;
    const wage = wagePerDay ? parseFloat(wagePerDay) : 0;
    const labourCost = workers * days * wage;
    const matCost = materialCost ? parseFloat(materialCost) : 0;
    const totalCost = labourCost + matCost;

    const crop = await prisma.crop.findUnique({
      where: { id: cropId },
    });

    if (!crop) {
      return NextResponse.json({ error: 'Crop not found' }, { status: 404 });
    }

    const stageDef = HORTICULTURE_STAGES.find((s) => s.stageNumber === stageNum);

    const updatedStage = await prisma.cropStage.upsert({
      where: {
        cropId_stageNumber: {
          cropId,
          stageNumber: stageNum,
        },
      },
      update: {
        status: status || 'COMPLETED',
        ...(actualDate ? { actualDate: new Date(actualDate) } : {}),
        completedDate: status === 'COMPLETED' ? new Date(actualDate || Date.now()) : null,
        workerCount: workers,
        workDays: days,
        wagePerDay: wage,
        labourCost,
        materialItems: materialItems || '',
        materialCost: matCost,
        totalCost,
        notes: notes || '',
      },
      create: {
        cropId,
        stageNumber: stageNum,
        stageKey: stageDef?.stageKey || `STAGE_${stageNum}`,
        stageName: stageDef?.stageName || `Stage ${stageNum}`,
        hindiName: stageDef?.hindiName || '',
        status: status || 'COMPLETED',
        expectedDate: actualDate ? new Date(actualDate) : new Date(),
        actualDate: actualDate ? new Date(actualDate) : new Date(),
        completedDate: status === 'COMPLETED' ? new Date(actualDate || Date.now()) : null,
        workerCount: workers,
        workDays: days,
        wagePerDay: wage,
        labourCost,
        materialItems: materialItems || '',
        materialCost: matCost,
        totalCost,
        notes: notes || '',
      },
    });

    // If costs were incurred, create corresponding Expense records for financial accuracy
    if (labourCost > 0) {
      await prisma.expense.create({
        data: {
          farmId: crop.farmId,
          fieldId: crop.fieldId,
          cropId: crop.id,
          stageNumber: stageNum,
          category: 'LABOUR',
          title: `Labour: ${stageDef?.stageName || 'Stage ' + stageNum} (${workers} workers × ${days} days)`,
          amount: labourCost,
          date: actualDate ? new Date(actualDate) : new Date(),
          paymentStatus: 'PAID',
          paymentMode: 'CASH',
          notes: notes || '',
        },
      });
    }

    if (matCost > 0) {
      await prisma.expense.create({
        data: {
          farmId: crop.farmId,
          fieldId: crop.fieldId,
          cropId: crop.id,
          stageNumber: stageNum,
          category: 'FERTILIZERS',
          title: `Materials: ${stageDef?.stageName || 'Stage ' + stageNum} (${materialItems || 'Supplies'})`,
          amount: matCost,
          date: actualDate ? new Date(actualDate) : new Date(),
          paymentStatus: 'PAID',
          paymentMode: 'CASH',
          notes: notes || '',
        },
      });
    }

    // Auto-advance crop's currentStageNumber if completed
    if (status === 'COMPLETED' && crop.currentStageNumber <= stageNum && stageNum < 9) {
      const nextStageNum = stageNum + 1;
      const nextStageDef = HORTICULTURE_STAGES.find((s) => s.stageNumber === nextStageNum);

      await prisma.crop.update({
        where: { id: cropId },
        data: {
          currentStageNumber: nextStageNum,
          currentStageName: nextStageDef?.stageName || `Stage ${nextStageNum}`,
          status: nextStageNum === 8 ? 'HARVESTING' : crop.status,
        },
      });
    }

    return NextResponse.json(updatedStage, { status: 200 });
  } catch (error) {
    console.error('Error logging crop stage:', error);
    return NextResponse.json({ error: 'Failed to update crop stage' }, { status: 500 });
  }
}
