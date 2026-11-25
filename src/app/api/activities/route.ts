export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const farmId = searchParams.get('farmId');
    const status = searchParams.get('status');

    const activities = await prisma.activity.findMany({
      where: {
        ...(farmId && farmId !== 'ALL' ? { farmId } : {}),
        ...(status && status !== 'ALL' ? { status } : {}),
      },
      include: {
        farm: true,
        field: true,
        crop: true,
        labourLogs: {
          include: { labourer: true },
        },
      },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(activities);
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { farmId, fieldId, cropId, title, activityType, date, status, cost, machineryUsed, notes } = body;

    if (!farmId || !title || !activityType || !date) {
      return NextResponse.json(
        { error: 'Farm, title, activity type, and date are required' },
        { status: 400 }
      );
    }

    const activity = await prisma.activity.create({
      data: {
        farmId,
        fieldId: fieldId || null,
        cropId: cropId || null,
        title,
        activityType,
        date: new Date(date),
        status: status || 'PENDING',
        cost: cost ? parseFloat(cost) : 0,
        machineryUsed: machineryUsed || null,
        notes: notes || '',
      },
    });

    // If there is an associated cost and it's marked completed or incurred, also record under expenses automatically!
    if (cost && parseFloat(cost) > 0) {
      await prisma.expense.create({
        data: {
          farmId,
          fieldId: fieldId || null,
          cropId: cropId || null,
          category: activityType === 'FERTILIZING' ? 'FERTILIZERS' :
                    activityType === 'PESTICIDE' ? 'PESTICIDES' :
                    activityType === 'IRRIGATION' ? 'IRRIGATION' :
                    activityType === 'HARVESTING' ? 'LABOUR' : 'OTHER',
          title: `Activity: ${title}`,
          amount: parseFloat(cost),
          date: new Date(date),
          paymentStatus: 'PAID',
          paymentMode: 'CASH',
          notes: `Automated entry from farming activity: ${title}`,
        },
      });
    }

    return NextResponse.json(activity, { status: 201 });
  } catch (error) {
    console.error('Error creating activity:', error);
    return NextResponse.json({ error: 'Failed to create activity' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, notes } = body;

    if (!id) return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 });

    const activity = await prisma.activity.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
    });

    return NextResponse.json(activity);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update activity' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Activity ID required' }, { status: 400 });

    await prisma.activity.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete activity' }, { status: 500 });
  }
}
