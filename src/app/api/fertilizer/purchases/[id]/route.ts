import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const quantity = Number(body.quantity);
    const totalCost = Number(body.totalPrice);
    const purchaseDate = new Date(body.purchaseDate);
    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(totalCost) || totalCost < 0 || Number.isNaN(purchaseDate.getTime())) {
      return NextResponse.json({ error: 'Enter a valid quantity, total price, and purchase date.' }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const purchase = await tx.fertilizerPurchase.findUnique({ where: { id: params.id }, include: { inventoryItem: true } });
      if (!purchase) throw new Error('Purchase entry not found.');
      const item = purchase.inventoryItem;
      if (body.unit && body.unit !== item.unit) throw new Error(`This stock uses ${item.unit}; its unit cannot be changed in purchase history.`);
      const newStock = item.quantity - purchase.quantity + quantity;
      if (newStock < -0.0001) throw new Error(`Only ${item.quantity} ${item.unit} is currently available. This change would make stock negative.`);
      const ratePerUnit = totalCost / quantity;
      const estimatedStockValue = Math.max(0, item.quantity * item.unitPrice - purchase.totalCost + totalCost);
      const unitPrice = newStock > 0 ? estimatedStockValue / newStock : 0;
      const name = String(body.name || item.name).trim();
      if (!name) throw new Error('Fertilizer name is required.');

      await tx.inventoryItem.update({ where: { id: item.id }, data: { name, quantity: Math.max(0, newStock), unitPrice } });
      return tx.fertilizerPurchase.update({
        where: { id: purchase.id },
        data: { purchaseDate, quantity, ratePerUnit, totalCost, supplier: String(body.supplier || '').trim() || null, notes: String(body.notes || '').trim() || null },
        include: { inventoryItem: true },
      });
    });
    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update purchase entry.';
    return NextResponse.json({ error: message }, { status: /not found/i.test(message) ? 404 : 400 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.$transaction(async (tx) => {
      const purchase = await tx.fertilizerPurchase.findUnique({ where: { id: params.id }, include: { inventoryItem: true } });
      if (!purchase) throw new Error('Purchase entry not found.');
      const item = purchase.inventoryItem;
      const newStock = item.quantity - purchase.quantity;
      if (newStock < -0.0001) throw new Error(`This purchase has been used. Only ${item.quantity} ${item.unit} remains, so deleting ${purchase.quantity} ${item.unit} would make stock negative.`);
      const estimatedStockValue = Math.max(0, item.quantity * item.unitPrice - purchase.totalCost);
      await tx.inventoryItem.update({ where: { id: item.id }, data: { quantity: Math.max(0, newStock), unitPrice: newStock > 0 ? estimatedStockValue / newStock : 0 } });
      await tx.fertilizerPurchase.delete({ where: { id: purchase.id } });
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to delete purchase entry.';
    return NextResponse.json({ error: message }, { status: /not found/i.test(message) ? 404 : 400 });
  }
}
