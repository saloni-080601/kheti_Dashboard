import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const farmId = new URL(request.url).searchParams.get('farmId');
  try {
    const purchases = await prisma.fertilizerPurchase.findMany({
      where: farmId && farmId !== 'ALL' ? { farmId } : {},
      include: { inventoryItem: true },
      orderBy: [{ purchaseDate: 'desc' }, { createdAt: 'desc' }],
    });
    return NextResponse.json(purchases);
  } catch {
    return NextResponse.json({ error: 'Unable to load fertilizer purchases.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const farmId = String(body.farmId || '');
    const isBulk = Array.isArray(body.entries);
    const rawEntries = isBulk ? body.entries : [body];
    if (!farmId || !rawEntries.length) {
      return NextResponse.json({ error: 'Farm and at least one fertilizer purchase are required.' }, { status: 400 });
    }
    const entries = rawEntries.map((entry: any) => {
      const quantity = Number(entry.quantity);
      const totalCost = Number(entry.totalPrice ?? (Number(entry.ratePerUnit) * quantity));
      const purchaseDate = new Date(entry.purchaseDate || body.purchaseDate);
      return { ...entry, quantity, totalCost, ratePerUnit: quantity > 0 ? totalCost / quantity : 0, purchaseDate, unit: String(entry.unit || 'kg'), name: String(entry.name || '').trim() };
    });
    const invalidIndex = entries.findIndex((entry: any) => !entry.name || !Number.isFinite(entry.quantity) || entry.quantity <= 0 || !Number.isFinite(entry.totalCost) || entry.totalCost < 0 || Number.isNaN(entry.purchaseDate.getTime()));
    if (invalidIndex >= 0) {
      return NextResponse.json({ error: `Check fertilizer name, quantity, total price, and purchase date in row ${invalidIndex + 1}.` }, { status: 400 });
    }
    const purchases = await prisma.$transaction(async (tx) => {
      const farm = await tx.farm.findUnique({ where: { id: farmId } });
      if (!farm) throw new Error('Farm not found.');
      const created = [];
      for (const entry of entries) {
        let item = entry.inventoryItemId
          ? await tx.inventoryItem.findFirst({ where: { id: String(entry.inventoryItemId), farmId, category: 'FERTILIZER' } })
          : await tx.inventoryItem.findFirst({ where: { farmId, category: 'FERTILIZER', name: { equals: entry.name, mode: 'insensitive' }, unit: entry.unit } });
        if (item && item.unit !== entry.unit) throw new Error(`${entry.name} uses ${item.unit}. Use the same unit for every purchase.`);
        if (entry.inventoryItemId && !item) throw new Error('Selected fertilizer stock was not found.');
        if (!item) item = await tx.inventoryItem.create({ data: { farmId, name: entry.name, category: 'FERTILIZER', quantity: 0, unit: entry.unit, unitPrice: 0, minStockAlert: 5 } });
        const totalQuantity = item.quantity + entry.quantity;
        const averageRate = totalQuantity > 0 ? ((item.quantity * item.unitPrice) + (entry.quantity * entry.ratePerUnit)) / totalQuantity : entry.ratePerUnit;
        await tx.inventoryItem.update({ where: { id: item.id }, data: { quantity: totalQuantity, unitPrice: averageRate } });
        created.push(await tx.fertilizerPurchase.create({
          data: { farmId, inventoryItemId: item.id, purchaseDate: entry.purchaseDate, quantity: entry.quantity, unit: entry.unit, ratePerUnit: entry.ratePerUnit, totalCost: entry.totalCost, supplier: String(entry.supplier ?? body.supplier ?? '').trim() || null, notes: String(entry.notes ?? body.notes ?? '').trim() || null },
          include: { inventoryItem: true },
        }));
      }
      return created;
    });
    return NextResponse.json(isBulk ? purchases : purchases[0], { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to save fertilizer purchase.';
    return NextResponse.json({ error: message }, { status: message === 'Farm not found.' ? 404 : 400 });
  }
}
