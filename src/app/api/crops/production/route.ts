import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (Array.isArray(body.entries)) {
      const saleDate = new Date(`${body.entryDate}T00:00:00+05:30`);
      const submitted = body.entries.map((entry: any) => ({
        cropId: String(entry.cropId || ''),
        parsed: parseSaleBatch({ entryDate: body.entryDate, lines: entry.lines, transportCost: entry.transportCost }),
      }));
      if (Number.isNaN(saleDate.getTime()) || !body.entryDate || !submitted.length || submitted.some((entry: any) => !entry.cropId || !entry.parsed)) {
        return NextResponse.json({ error: 'Choose a date and enter valid quantity, rate, and crop for every row.' }, { status: 400 });
      }
      if (new Set(submitted.map((entry: any) => entry.cropId)).size !== submitted.length) {
        return NextResponse.json({ error: 'Choose each crop only once in this bill.' }, { status: 400 });
      }

      const cropIds = submitted.map((entry: any) => entry.cropId);
      const cropRecords = await prisma.crop.findMany({
        where: { id: { in: cropIds } },
        select: { id: true, name: true, hamaliRatePerPack: true, hamaliPackSize: true, hamaliPackUnit: true },
      });
      if (cropRecords.length !== cropIds.length) return NextResponse.json({ error: 'One or more selected crops could not be found.' }, { status: 404 });

      const cropById = new Map(cropRecords.map((crop) => [crop.id, crop]));
      for (const entry of submitted) {
        const crop = cropById.get(entry.cropId)!;
        if (/tomato|टमाटर/i.test(crop.name) && entry.parsed!.lines.some((line: any) => !Number.isInteger(line.productionKg))) {
          return NextResponse.json({ error: 'Tomato quantity must be entered as whole crates.' }, { status: 400 });
        }
      }

      const batches = await prisma.$transaction(async (tx) => Promise.all(submitted.map((entry: any) => {
        const crop = cropById.get(entry.cropId)!;
        const costs = calculateCosts(crop, entry.parsed.lines);
        return tx.productionBatch.create({
          data: {
            cropId: crop.id,
            entryDate: entry.parsed.entryDate,
            ...costs,
            transportCost: entry.parsed.transportCost,
            entries: {
              create: entry.parsed.lines.map((line: any) => ({
                cropId: crop.id,
                entryDate: entry.parsed.entryDate,
                productionKg: line.productionKg,
                ratePerKg: line.ratePerKg,
              })),
            },
          },
          include: { entries: true },
        });
      })));
      return NextResponse.json(batches, { status: 201 });
    }

    const parsed = parseSaleBatch(body);
    if (!body.cropId || !parsed) return invalidBatchResponse();

    const crop = await prisma.crop.findUnique({
      where: { id: body.cropId },
      select: { id: true, name: true, hamaliRatePerPack: true, hamaliPackSize: true, hamaliPackUnit: true },
    });
    if (!crop) return NextResponse.json({ error: 'Crop not found.' }, { status: 404 });
    if (/tomato|टमाटर/i.test(crop.name) && parsed.lines.some((line) => !Number.isInteger(line.productionKg))) {
      return NextResponse.json({ error: 'Tomato quantity must be entered as whole crates.' }, { status: 400 });
    }

    const costs = calculateCosts(crop, parsed.lines);

    const batch = await prisma.productionBatch.create({
      data: {
        cropId: crop.id,
        entryDate: parsed.entryDate,
        ...costs,
        transportCost: parsed.transportCost,
        entries: {
          create: parsed.lines.map((line) => ({
            cropId: crop.id,
            entryDate: parsed.entryDate,
            productionKg: line.productionKg,
            ratePerKg: line.ratePerKg,
          })),
        },
      },
      include: { entries: true },
    });

    return NextResponse.json(batch, { status: 201 });
  } catch (error) {
    console.error('Error recording crop production:', error);
    return NextResponse.json({ error: 'Unable to save the production record.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = parseSaleBatch(body);
    if (!parsed || (!body.id && !body.entryId)) return invalidBatchResponse();

    if (body.entryId) {
      const entry = await prisma.productionEntry.findUnique({
        where: { id: body.entryId },
        include: { crop: { select: { name: true, hamaliRatePerPack: true, hamaliPackSize: true, hamaliPackUnit: true } } },
      });
      if (!entry || entry.batchId) return NextResponse.json({ error: 'History entry not found.' }, { status: 404 });
      const line = parsed.lines[0];
      if (/tomato|टमाटर/i.test(entry.crop.name) && !Number.isInteger(line.productionKg)) {
        return NextResponse.json({ error: 'Tomato quantity must be entered as whole crates.' }, { status: 400 });
      }
      const costs = calculateCosts(entry.crop, [line]);
      const updatedEntry = await prisma.productionEntry.update({
        where: { id: entry.id },
        data: {
          entryDate: parsed.entryDate,
          productionKg: line.productionKg,
          ratePerKg: line.ratePerKg,
          transportCost: parsed.transportCost,
          ...costs,
        },
      });
      return NextResponse.json(updatedEntry);
    }

    const existing = await prisma.productionBatch.findUnique({
      where: { id: body.id },
      include: { crop: { select: { name: true, hamaliRatePerPack: true, hamaliPackSize: true, hamaliPackUnit: true } } },
    });
    if (!existing) return NextResponse.json({ error: 'Sale entry not found.' }, { status: 404 });
    if (/tomato|टमाटर/i.test(existing.crop.name) && parsed.lines.some((line) => !Number.isInteger(line.productionKg))) {
      return NextResponse.json({ error: 'Tomato quantity must be entered as whole crates.' }, { status: 400 });
    }

    const costs = calculateCosts(existing.crop, parsed.lines);
    const updated = await prisma.$transaction(async (tx) => {
      await tx.productionEntry.deleteMany({ where: { batchId: existing.id } });
      return tx.productionBatch.update({
        where: { id: existing.id },
        data: {
          entryDate: parsed.entryDate,
          transportCost: parsed.transportCost,
          ...costs,
          entries: {
            create: parsed.lines.map((line) => ({
              cropId: existing.cropId,
              entryDate: parsed.entryDate,
              productionKg: line.productionKg,
              ratePerKg: line.ratePerKg,
            })),
          },
        },
        include: { entries: true },
      });
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating crop sale batch:', error);
    return NextResponse.json({ error: 'Unable to update the sale entry.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type');
    if (!id) return NextResponse.json({ error: 'Entry ID is required.' }, { status: 400 });

    if (type === 'entry') {
      const deleted = await prisma.productionEntry.deleteMany({ where: { id, batchId: null } });
      if (!deleted.count) return NextResponse.json({ error: 'History entry not found.' }, { status: 404 });
      return NextResponse.json({ success: true });
    }

    await prisma.productionBatch.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting crop sale batch:', error);
    return NextResponse.json({ error: 'Unable to delete the sale entry.' }, { status: 500 });
  }
}

function parseSaleBatch(body: any) {
  // Store the chosen calendar date at midnight in India Standard Time.
  const date = new Date(`${body.entryDate}T00:00:00+05:30`);
  const lines = Array.isArray(body.lines) ? body.lines.map((line: any) => ({
    productionKg: Number(line.productionKg),
    ratePerKg: Number(line.ratePerKg),
  })) : [];
  const transportCost = Number(body.transportCost || 0);

  if (
    !body.entryDate || Number.isNaN(date.getTime()) || lines.length === 0 ||
    lines.some((line: { productionKg: number; ratePerKg: number }) =>
      !Number.isFinite(line.productionKg) || line.productionKg <= 0 ||
      !Number.isFinite(line.ratePerKg) || line.ratePerKg < 0
    ) ||
    !Number.isFinite(transportCost) || transportCost < 0
  ) return null;

  return { entryDate: date, lines, transportCost };
}

function calculateCosts(crop: { name: string; hamaliRatePerPack: number | null; hamaliPackSize: number | null; hamaliPackUnit: string | null }, lines: Array<{ productionKg: number; ratePerKg: number }>) {
  const gross = lines.reduce((sum, line) => sum + line.productionKg * line.ratePerKg, 0);
  const quantity = lines.reduce((sum, line) => sum + line.productionKg, 0);
  const defaultConfig = defaultHamaliConfig(crop.name);
  const ratePerPack = crop.hamaliRatePerPack ?? defaultConfig.ratePerPack;
  const packSize = crop.hamaliPackSize ?? defaultConfig.packSize;
  return {
    commissionCost: Number((gross * 0.08).toFixed(2)),
    hamaliCost: Math.ceil(quantity / packSize) * ratePerPack,
  };
}

function defaultHamaliConfig(cropName: string) {
  if (/tomato|टमाटर/i.test(cropName)) return { ratePerPack: 5, packSize: 1, packUnit: 'crate' };
  if (/cucumber|kheera|खीरा/i.test(cropName)) return { ratePerPack: 3, packSize: 20, packUnit: 'kg' };
  if (/chilli|chili|मिर्च/i.test(cropName)) return { ratePerPack: 3, packSize: 15, packUnit: 'kg' };
  return { ratePerPack: 0, packSize: 1, packUnit: 'kg' };
}

function invalidBatchResponse() {
  return NextResponse.json(
    { error: 'Enter a date, quantity, and valid rate for every line.' },
    { status: 400 }
  );
}
