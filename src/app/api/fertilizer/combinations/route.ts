import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { convertFertilizerQuantity } from '@/lib/fertilizer-units';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const farmId = new URL(request.url).searchParams.get('farmId');
  try {
    const mixes = await prisma.cropFertilizerMix.findMany({
      where: farmId && farmId !== 'ALL' ? { crop: { farmId } } : {},
      include: { crop: { include: { field: true, fieldSection: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const allIds = Array.from(new Set(mixes.flatMap((mix) => (JSON.parse(mix.items) as { inventoryItemId: string }[]).map((row) => row.inventoryItemId))));
    const inventoryItems = await prisma.inventoryItem.findMany({ where: { id: { in: allIds } } });
    const itemById = new Map(inventoryItems.map((item) => [item.id, item]));
    return NextResponse.json(mixes.map((mix) => ({
      ...mix,
      items: (JSON.parse(mix.items) as { inventoryItemId: string; quantity: number; unit: string }[]).map((row) => ({ ...row, inventoryItem: itemById.get(row.inventoryItemId) || null })),
    })));
  } catch {
    return NextResponse.json({ error: 'Unable to load fertilizer combinations.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const cropId = String(body.cropId || '');
    const name = String(body.name || '').trim();
    const rows = body.items;
    if (!cropId || !name || !Array.isArray(rows) || rows.length < 2) return NextResponse.json({ error: 'Choose a crop, combination name, and at least two fertilizers.' }, { status: 400 });
    const saved = await prisma.$transaction(async (tx) => {
      const crop = await tx.crop.findUnique({ where: { id: cropId } });
      if (!crop) throw new Error('Crop or plot not found.');
      const ids = rows.map((row: any) => String(row.inventoryItemId || ''));
      if (ids.some((id: string) => !id) || new Set(ids).size !== ids.length) throw new Error('Select each fertilizer only once in a combination.');
      const stockItems = await tx.inventoryItem.findMany({ where: { id: { in: ids }, farmId: crop.farmId, category: 'FERTILIZER' } });
      if (stockItems.length !== ids.length) throw new Error('One or more fertilizer items are not in stock for this farm.');
      const stockById = new Map(stockItems.map((item) => [item.id, item]));
      const cleanRows = rows.map((row: any) => {
        const inventoryItemId = String(row.inventoryItemId);
        const quantity = Number(row.quantity);
        const unit = String(row.unit || '');
        const stock = stockById.get(inventoryItemId)!;
        if (!Number.isFinite(quantity) || quantity <= 0 || !unit) throw new Error(`Enter a valid dose for ${stock.name}.`);
        convertFertilizerQuantity(quantity, unit, stock.unit);
        return { inventoryItemId, quantity, unit };
      });
      return tx.cropFertilizerMix.create({ data: { cropId, name, items: JSON.stringify(cleanRows) }, include: { crop: { include: { field: true, fieldSection: true } } } });
    });
    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to save fertilizer combination.';
    return NextResponse.json({ error: message }, { status: /not found/i.test(message) ? 404 : 400 });
  }
}
