export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const farmId = searchParams.get('farmId');
    const cropId = searchParams.get('cropId');

    const reminders = await prisma.farmReminder.findMany({
      where: {
        ...(farmId && farmId !== 'ALL' ? { farmId } : {}),
        ...(cropId ? { cropId } : {}),
      },
      include: {
        crop: true,
      },
      orderBy: { dueDate: 'asc' },
    });

    return NextResponse.json(reminders);
  } catch (error) {
    console.error('Error fetching reminders:', error);
    return NextResponse.json({ error: 'Failed to fetch reminders' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, isResolved } = body;

    if (!id) {
      return NextResponse.json({ error: 'Reminder ID is required' }, { status: 400 });
    }

    const updated = await prisma.farmReminder.update({
      where: { id },
      data: {
        isResolved: isResolved !== undefined ? Boolean(isResolved) : true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update reminder' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { farmId, cropId, stageNumber, title, category, dueDate, priority, notes } = body;

    if (!title || !dueDate) {
      return NextResponse.json({ error: 'Title and due date are required' }, { status: 400 });
    }

    const reminder = await prisma.farmReminder.create({
      data: {
        farmId: farmId || null,
        cropId: cropId || null,
        stageNumber: stageNumber ? parseInt(stageNumber, 10) : null,
        title,
        category: category || 'OTHER',
        dueDate: new Date(dueDate),
        priority: priority || 'MEDIUM',
        notes: notes || '',
      },
    });

    return NextResponse.json(reminder, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create reminder' }, { status: 500 });
  }
}
