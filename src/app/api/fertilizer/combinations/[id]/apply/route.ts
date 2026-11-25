import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { convertFertilizerQuantity } from '@/lib/fertilizer-units';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const applicationDate = new Date(body.applicationDate);
    if (Number.isNaN(applicationDate.getTime())) return NextResponse.json({ error: 'Choose a valid application date.' }, { status: 400 });
    const records = await prisma.$transaction(async (tx) => {
      const mix = await tx.cropFertilizerMix.findUnique({ where: { id: params.id }, include: { crop: { include: { field: true } } } });
      if (!mix) throw new Error('Saved fertilizer combination not found.');
      const doses = JSON.parse(mix.items) as { inventoryItemId: string; quantity: number; unit: string }[];
      const applied = [];
      for (const dose of doses) {
        const item = await tx.inventoryItem.findFirst({ where: { id: dose.inventoryItemId, farmId: mix.crop.farmId, category: 'FERTILIZER' } });
        if (!item) throw new Error('A fertilizer in this combination is no longer available in stock.');
        const stockQuantity = convertFertilizerQuantity(dose.quantity, dose.unit, item.unit);
        if (stockQuantity > item.quantity + 0.0000001) throw new Error(`Not enough ${item.name}. Required: ${dose.quantity} ${dose.unit}; stock: ${item.quantity} ${item.unit}.`);
        const totalCost = stockQuantity * item.unitPrice;
        const application = await tx.fertilizerApplication.create({
          data: { farmId: mix.crop.farmId, cropId: mix.cropId, fieldId: mix.crop.fieldId, inventoryItemId: item.id, applicationDate, quantity: dose.quantity, unit: dose.unit, unitPrice: item.unitPrice, totalCost, method: `Combination: ${mix.name}`, notes: null },
          include: { crop: { include: { field: true, fieldSection: true } }, inventoryItem: true },
        });
        await tx.inventoryItem.update({ where: { id: item.id }, data: { quantity: { decrement: stockQuantity } } });
        await tx.expense.create({ data: { farmId: mix.crop.farmId, fieldId: mix.crop.fieldId, cropId: mix.cropId, category: 'FERTILIZERS', title: `${item.name} applied to ${mix.crop.name} (${mix.name})`, amount: totalCost, date: applicationDate, paymentStatus: 'PAID', paymentMode: 'CASH', notes: `Fertilizer combination: ${mix.name}; ${dose.quantity} ${dose.unit}` } });
        applied.push(application);
      }
      return applied;
    }, {
      // Applying a mix writes one application, stock update, and expense per
      // ingredient; allow the full set to finish before Prisma closes it.
      maxWait: 10_000,
      timeout: 30_000,
    });
    return NextResponse.json({ count: records.length, applications: records }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to apply fertilizer combination.';
    return NextResponse.json({ error: message }, { status: /not found/i.test(message) ? 404 : 400 });
  }
}
