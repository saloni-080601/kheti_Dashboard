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
    const quantity = Number(body.quantity);
    const totalCost = Number(body.totalPrice ?? (Number(body.ratePerUnit) * quantity));
    const ratePerUnit = quantity > 0 ? totalCost / quantity : 0;
    const purchaseDate = new Date(body.purchaseDate);
    const unit = String(body.unit || 'kg');
    const name = String(body.name || '').trim();
    if (!farmId || !name || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(totalCost) || totalCost < 0 || Number.isNaN(purchaseDate.getTime())) {
      return NextResponse.json({ error: 'Fertilizer, quantity, total price, farm, and purchase date are required.' }, { status: 400 });
    }
    const purchase = await prisma.$transaction(async (tx) => {
      const farm = await tx.farm.findUnique({ where: { id: farmId } });
      if (!farm) throw new Error('Farm not found.');
      let item = body.inventoryItemId
        ? await tx.inventoryItem.findFirst({ where: { id: String(body.inventoryItemId), farmId, category: 'FERTILIZER' } })
        : await tx.inventoryItem.findFirst({ where: { farmId, category: 'FERTILIZER', name: { equals: name, mode: 'insensitive' }, unit } });
      if (item && item.unit !== unit) throw new Error(`This fertilizer uses ${item.unit}. Use the same unit for every purchase.`);
      if (body.inventoryItemId && !item) throw new Error('Selected fertilizer stock was not found.');
      if (!item) {
        item = await tx.inventoryItem.create({ data: { farmId, name, category: 'FERTILIZER', quantity: 0, unit, unitPrice: 0, minStockAlert: 5 } });
      }
      const oldQuantity = item.quantity;
      const totalQuantity = oldQuantity + quantity;
      const averageRate = totalQuantity > 0 ? ((oldQuantity * item.unitPrice) + (quantity * ratePerUnit)) / totalQuantity : ratePerUnit;
      await tx.inventoryItem.update({ where: { id: item.id }, data: { quantity: totalQuantity, unitPrice: averageRate } });
      return tx.fertilizerPurchase.create({
        data: { farmId, inventoryItemId: item.id, purchaseDate, quantity, unit, ratePerUnit, totalCost, supplier: body.supplier?.trim() || null, notes: body.notes?.trim() || null },
        include: { inventoryItem: true },
      });
    });
    return NextResponse.json(purchase, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to save fertilizer purchase.';
    return NextResponse.json({ error: message }, { status: message === 'Farm not found.' ? 404 : 400 });
  }
}
