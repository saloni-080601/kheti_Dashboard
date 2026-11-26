import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { convertFertilizerQuantity } from '@/lib/fertilizer-units';

export const dynamic = 'force-dynamic';

function expenseDetails(application: any, quantity = application.quantity) {
  const method = application.method?.trim() || '';
  const mixName = method.startsWith('Combination: ')
    ? method.slice('Combination: '.length)
    : null;
  const title = mixName
    ? `${application.inventoryItem.name} applied to ${application.crop.name} (${mixName})`
    : `${application.inventoryItem.name} applied to ${application.crop.name}`;
  const notes = mixName
    ? `Fertilizer combination: ${mixName}; ${quantity} ${application.unit}`
    : `Fertilizer application: ${quantity} ${application.unit}${method ? `; ${method}` : ''}${application.notes?.trim() ? `; ${application.notes.trim()}` : ''}`;
  return { title, notes };
}

function validDateKey(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    if (!Array.isArray(body.applications) || !body.applications.length || !validDateKey(body.applicationDate)) {
      return NextResponse.json({ error: 'Choose a valid date and at least one application.' }, { status: 400 });
    }
    const requested = body.applications.map((row: any) => ({ id: String(row.id || ''), quantity: Number(row.quantity) }));
    if (requested.some((row: any) => !row.id || !Number.isFinite(row.quantity) || row.quantity <= 0)) {
      return NextResponse.json({ error: 'Enter a positive quantity for every fertilizer.' }, { status: 400 });
    }
    const applicationDate = new Date(`${body.applicationDate}T00:00:00+05:30`);
    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.fertilizerApplication.findMany({
        where: { id: { in: requested.map((row: any) => row.id) } },
        include: { crop: true, inventoryItem: true },
      });
      if (existing.length !== requested.length) throw new Error('One or more fertilizer application records were not found.');
      const requestedById = new Map<string, number>(requested.map((row: any): [string, number] => [row.id, row.quantity]));
      const result = [];

      for (const application of existing) {
        const quantity = requestedById.get(application.id)!;
        const oldStockQuantity = convertFertilizerQuantity(application.quantity, application.unit, application.inventoryItem.unit);
        const newStockQuantity = convertFertilizerQuantity(quantity, application.unit, application.inventoryItem.unit);
        if (newStockQuantity > application.inventoryItem.quantity + oldStockQuantity + 0.0000001) {
          throw new Error(`Not enough ${application.inventoryItem.name} in stock for the updated quantity.`);
        }
        const totalCost = newStockQuantity * application.unitPrice;
        const oldExpenseDetails = expenseDetails(application);
        const oldExpense = await tx.expense.findFirst({
          where: {
            farmId: application.farmId,
            cropId: application.cropId,
            category: 'FERTILIZERS',
            date: application.applicationDate,
            amount: application.totalCost,
            notes: oldExpenseDetails.notes,
          },
        });
        if (oldExpense) {
          const newExpenseDetails = expenseDetails(application, quantity);
          await tx.expense.update({
            where: { id: oldExpense.id },
            data: { ...newExpenseDetails, amount: totalCost, date: applicationDate },
          });
        }
        await tx.inventoryItem.update({
          where: { id: application.inventoryItemId },
          data: { quantity: { increment: oldStockQuantity - newStockQuantity } },
        });
        result.push(await tx.fertilizerApplication.update({
          where: { id: application.id },
          data: { quantity, totalCost, applicationDate },
          include: { crop: { include: { field: true, fieldSection: true } }, inventoryItem: true },
        }));
      }
      return result;
    }, { maxWait: 10_000, timeout: 30_000 });
    return NextResponse.json({ applications: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update fertilizer application.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    if (!Array.isArray(body.applicationIds) || !body.applicationIds.length) {
      return NextResponse.json({ error: 'Choose at least one application to delete.' }, { status: 400 });
    }
    const ids = body.applicationIds.map((id: unknown) => String(id || '')).filter(Boolean);
    const deletedCount = await prisma.$transaction(async (tx) => {
      const applications = await tx.fertilizerApplication.findMany({
        where: { id: { in: ids } },
        include: { crop: true, inventoryItem: true },
      });
      if (applications.length !== ids.length) throw new Error('One or more fertilizer application records were not found.');
      for (const application of applications) {
        const stockQuantity = convertFertilizerQuantity(application.quantity, application.unit, application.inventoryItem.unit);
        const details = expenseDetails(application);
        const expense = await tx.expense.findFirst({
          where: {
            farmId: application.farmId,
            cropId: application.cropId,
            category: 'FERTILIZERS',
            date: application.applicationDate,
            amount: application.totalCost,
            notes: details.notes,
          },
        });
        if (expense) await tx.expense.delete({ where: { id: expense.id } });
        await tx.inventoryItem.update({ where: { id: application.inventoryItemId }, data: { quantity: { increment: stockQuantity } } });
        await tx.fertilizerApplication.delete({ where: { id: application.id } });
      }
      return applications.length;
    }, { maxWait: 10_000, timeout: 30_000 });
    return NextResponse.json({ success: true, deletedCount });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to delete fertilizer application.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
