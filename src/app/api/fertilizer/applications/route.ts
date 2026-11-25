import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams;
  const farmId = params.get('farmId');
  const cropId = params.get('cropId');
  try {
    const applications = await prisma.fertilizerApplication.findMany({
      where: { ...(farmId && farmId !== 'ALL' ? { farmId } : {}), ...(cropId ? { cropId } : {}) },
      include: { crop: { include: { field: true, fieldSection: true } }, inventoryItem: true },
      orderBy: [{ applicationDate: 'desc' }, { createdAt: 'desc' }],
    });
    return NextResponse.json(applications);
  } catch {
    return NextResponse.json({ error: 'Unable to load fertilizer applications.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const cropId = String(body.cropId || '');
    const inventoryItemId = String(body.inventoryItemId || '');
    const quantity = Number(body.quantity);
    const applicationDate = new Date(body.applicationDate);
    if (!cropId || !inventoryItemId || !Number.isFinite(quantity) || quantity <= 0 || Number.isNaN(applicationDate.getTime())) {
      return NextResponse.json({ error: 'Crop, fertilizer, date, and a positive quantity are required.' }, { status: 400 });
    }
    const application = await prisma.$transaction(async (tx) => {
      const crop = await tx.crop.findUnique({ where: { id: cropId }, include: { field: true } });
      if (!crop) throw new Error('Crop not found.');
      const item = await tx.inventoryItem.findFirst({ where: { id: inventoryItemId, farmId: crop.farmId, category: 'FERTILIZER' } });
      if (!item) throw new Error('Fertilizer stock not found for this farm.');
      if (quantity > item.quantity) throw new Error(`Only ${item.quantity} ${item.unit} is available in stock.`);
      const totalCost = quantity * item.unitPrice;
      const record = await tx.fertilizerApplication.create({
        data: { farmId: crop.farmId, cropId, fieldId: crop.fieldId, inventoryItemId, applicationDate, quantity, unit: item.unit, unitPrice: item.unitPrice, totalCost, method: body.method?.trim() || null, notes: body.notes?.trim() || null },
        include: { crop: { include: { field: true, fieldSection: true } }, inventoryItem: true },
      });
      await tx.inventoryItem.update({ where: { id: item.id }, data: { quantity: { decrement: quantity } } });
      await tx.expense.create({ data: { farmId: crop.farmId, fieldId: crop.fieldId, cropId, category: 'FERTILIZERS', title: `${item.name} applied to ${crop.name}`, amount: totalCost, date: applicationDate, paymentStatus: 'PAID', paymentMode: 'CASH', notes: `Fertilizer application: ${quantity} ${item.unit}${body.method ? `; ${body.method}` : ''}${body.notes ? `; ${body.notes}` : ''}` } });
      return record;
    });
    return NextResponse.json(application, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to save fertilizer application.';
    return NextResponse.json({ error: message }, { status: /not found/i.test(message) ? 404 : 400 });
  }
}
