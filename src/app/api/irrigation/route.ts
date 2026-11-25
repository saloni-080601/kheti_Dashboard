export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const farmId = searchParams.get('farmId');

    const logs = await prisma.irrigationLog.findMany({
      where: farmId && farmId !== 'ALL' ? { farmId } : {},
      include: {
        farm: true,
        field: true,
      },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(logs);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch irrigation logs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { farmId, fieldId, date, source, durationHours, electricityUnits, fuelLitres, cost, notes } = body;

    if (!farmId || !fieldId || !date || !source || !durationHours) {
      return NextResponse.json(
        { error: 'Farm, field, date, source, and duration are required' },
        { status: 400 }
      );
    }

    const logCost = cost ? parseFloat(cost) : 0;

    const log = await prisma.irrigationLog.create({
      data: {
        farmId,
        fieldId,
        date: new Date(date),
        source,
        durationHours: parseFloat(durationHours),
        electricityUnits: electricityUnits ? parseFloat(electricityUnits) : 0,
        fuelLitres: fuelLitres ? parseFloat(fuelLitres) : 0,
        cost: logCost,
        notes: notes || '',
      },
    });

    if (logCost > 0) {
      await prisma.expense.create({
        data: {
          farmId,
          fieldId,
          category: 'IRRIGATION',
          title: `Irrigation: ${source} (${durationHours} hrs)`,
          amount: logCost,
          date: new Date(date),
          paymentStatus: 'PAID',
          paymentMode: 'CASH',
          notes: notes || 'Watering expense',
        },
      });
    }

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create irrigation log' }, { status: 500 });
  }
}
