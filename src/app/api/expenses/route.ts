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
