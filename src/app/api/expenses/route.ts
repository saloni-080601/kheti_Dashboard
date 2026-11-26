export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const farmId = searchParams.get('farmId');
    const category = searchParams.get('category');

    const expenses = await prisma.expense.findMany({
      where: {
        ...(farmId && farmId !== 'ALL' ? { farmId } : {}),
        ...(category && category !== 'ALL' ? { category } : {}),
      },
      include: {
        farm: true,
        field: true,
        crop: true,
      },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(expenses);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { farmId, fieldId, cropId, category, title, amount, date, paymentStatus, paymentMode, receiptNumber, notes } = body;

    if (!farmId || !category || !title || !amount || !date) {
      return NextResponse.json(
        { error: 'Farm, category, title, amount, and date are required' },
        { status: 400 }
      );
    }

    const expense = await prisma.expense.create({
      data: {
        farmId,
        fieldId: fieldId || null,
        cropId: cropId || null,
        category,
        title,
        amount: parseFloat(amount),
        date: new Date(date),
        paymentStatus: paymentStatus || 'PAID',
        paymentMode: paymentMode || 'CASH',
        receiptNumber: receiptNumber || null,
        notes: notes || '',
      },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json({ error: 'Failed to record expense' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const body = await request.json();
    const ids: string[] = Array.isArray(body.ids) ? body.ids.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0) : [];
    const id = searchParams.get('id') || body.id;
    const { farmId, fieldId, cropId, category, title, amount, date, paymentStatus, paymentMode, receiptNumber, notes } = body;
    const parsedAmount = Number(amount);
    const parsedDate = new Date(date);

    if ((!id && ids.length === 0) || !farmId || !category || !title || !Number.isFinite(parsedAmount) || parsedAmount < 0 || Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: 'Expense ID, farm, category, title, a valid amount, and date are required.' }, { status: 400 });
    }

    const data = {
      farmId,
      fieldId: fieldId || null,
      cropId: cropId || null,
      category,
      title,
      date: parsedDate,
      paymentStatus: paymentStatus || 'PAID',
      paymentMode: paymentMode || 'CASH',
      receiptNumber: receiptNumber || null,
      notes: notes || '',
    };

    if (ids.length > 1) {
      const updated = await prisma.$transaction(async (tx) => {
        const records = await tx.expense.findMany({ where: { id: { in: ids } }, orderBy: { id: 'asc' } });
        if (records.length !== ids.length || records.some((record) => record.category !== 'FERTILIZERS' || !record.notes?.startsWith('Fertilizer combination:'))) {
          throw new Error('Fertilizer combination records were not found or cannot be edited together.');
        }
        const groupSignatures = new Set(records.map((record) => `${record.cropId}:${record.farmId}:${record.date.toISOString()}:${record.notes?.split(';')[0]}`));
        if (groupSignatures.size !== 1) throw new Error('These fertilizer expenses do not belong to the same combination.');
        const oldTotal = records.reduce((sum, record) => sum + record.amount, 0);
        let remainingAmount = parsedAmount;
        const updates = [];
        for (let index = 0; index < records.length; index += 1) {
          const record = records[index];
          const nextAmount = index === records.length - 1
            ? remainingAmount
            : oldTotal > 0 ? parsedAmount * (record.amount / oldTotal) : parsedAmount / records.length;
          remainingAmount -= nextAmount;
          updates.push(await tx.expense.update({
            where: { id: record.id },
            data: {
              ...data,
              category: 'FERTILIZERS',
              title: record.title,
              notes: record.notes,
              amount: nextAmount,
            },
          }));
        }
        return updates;
      });
      return NextResponse.json({ updatedCount: updated.length });
    }

    const expense = await prisma.expense.update({ where: { id: id || ids[0] }, data: { ...data, amount: parsedAmount } });
    return NextResponse.json(expense);
  } catch (error) {
    console.error('Error updating expense:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update expense' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Expense ID required' }, { status: 400 });

    await prisma.expense.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}
