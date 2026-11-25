export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const farmId = searchParams.get('farmId');

    const sales = await prisma.cropSale.findMany({
      where: farmId && farmId !== 'ALL' ? { crop: { farmId } } : {},
      include: {
        crop: {
          include: { farm: true, field: true },
        },
      },
      orderBy: { saleDate: 'desc' },
    });

    return NextResponse.json(sales);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch crop sales' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      cropId,
      buyerName,
      buyerPhone,
      mandiName,
      saleDate,
      quantity,
      unit,
      pricePerUnit,
      commission,
      transportCost,
      hamaliCost,
      deductions,
      amountReceived,
      paymentMode,
      notes,
    } = body;

    if (!buyerName || !saleDate || !quantity || !pricePerUnit) {
      return NextResponse.json(
        { error: 'Buyer name, sale date, quantity, and price per unit are required' },
        { status: 400 }
      );
    }

    const q = parseFloat(quantity);
    const p = parseFloat(pricePerUnit);
    const comm = commission ? parseFloat(commission) : 0;
    const trans = transportCost ? parseFloat(transportCost) : 0;
    const ham = hamaliCost ? parseFloat(hamaliCost) : 0;
    const ded = deductions ? parseFloat(deductions) : comm + trans + ham;
    const totalAmount = q * p;
    const netAmount = totalAmount - ded;
    const received = amountReceived !== undefined && amountReceived !== '' ? parseFloat(amountReceived) : netAmount;

    let paymentStatus = 'PAID';
    if (received <= 0) {
      paymentStatus = 'PENDING';
    } else if (received < netAmount) {
      paymentStatus = 'PARTIAL';
    }

    const invoiceNumber = `MND-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const sale = await prisma.cropSale.create({
      data: {
        cropId: cropId || null,
        buyerName,
        buyerPhone: buyerPhone || '',
        mandiName: mandiName || 'Local Mandi',
        saleDate: new Date(saleDate),
        quantity: q,
        unit: unit || 'Kg',
        pricePerUnit: p,
        totalAmount,
        commission: comm,
        transportCost: trans,
        hamaliCost: ham,
        deductions: ded,
        netAmount,
        amountReceived: received,
        paymentStatus,
        paymentMode: paymentMode || 'BANK_TRANSFER',
        invoiceNumber,
        notes: notes || '',
      },
    });

    if (cropId) {
      // Update Stage 9 in CropStage to IN_PROGRESS or COMPLETED
      await prisma.cropStage.upsert({
        where: { cropId_stageNumber: { cropId, stageNumber: 9 } },
        update: {
          status: 'COMPLETED',
          actualDate: new Date(saleDate),
        },
        create: {
          cropId,
          stageNumber: 9,
          stageKey: 'MANDI_SALE',
          stageName: 'Mandi Sale & Recovery',
          hindiName: 'मंडी बिक्री व पेमेंट वसूली',
          status: 'COMPLETED',
          actualDate: new Date(saleDate),
        },
      });
    }

    return NextResponse.json(sale, { status: 201 });
  } catch (error) {
    console.error('Error creating crop sale:', error);
    return NextResponse.json({ error: 'Failed to record crop sale' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, amountReceived } = body;

    if (!id || amountReceived === undefined) {
      return NextResponse.json({ error: 'Sale ID and amount received are required' }, { status: 400 });
    }

    const sale = await prisma.cropSale.findUnique({ where: { id } });
    if (!sale) return NextResponse.json({ error: 'Sale not found' }, { status: 404 });

    const newReceived = parseFloat(amountReceived);
    let paymentStatus = 'PAID';
    if (newReceived <= 0) {
      paymentStatus = 'PENDING';
    } else if (newReceived < sale.netAmount) {
      paymentStatus = 'PARTIAL';
    }

    const updated = await prisma.cropSale.update({
      where: { id },
      data: {
        amountReceived: newReceived,
        paymentStatus,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update payment' }, { status: 500 });
  }
}
