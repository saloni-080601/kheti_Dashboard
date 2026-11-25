export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const farmId = searchParams.get('farmId');

    const machinery = await prisma.machinery.findMany({
      where: farmId && farmId !== 'ALL' ? { farmId } : {},
      include: {
        farm: true,
        logs: {
          include: { field: true },
          orderBy: { date: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const enrichedMachinery = machinery.map((m) => {
      const totalHours = m.logs.reduce((s, l) => s + l.hoursUsed, 0);
      const totalFuelCost = m.logs.reduce((s, l) => s + l.fuelCost, 0);
      const totalMaintenanceCost = m.logs.reduce((s, l) => s + l.maintenanceCost, 0);
      const totalRentalCost = m.logs.reduce((s, l) => s + l.rentalCost, 0);

      return {
        ...m,
        totalHours,
        totalFuelCost,
        totalMaintenanceCost,
        totalRentalCost,
        totalCost: totalFuelCost + totalMaintenanceCost + totalRentalCost,
      };
    });

    return NextResponse.json(enrichedMachinery);
  } catch (error) {
    console.error('Error fetching machinery:', error);
    return NextResponse.json({ error: 'Failed to fetch machinery' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'CREATE_MACHINERY') {
      const { farmId, name, model, ownership, fuelType, hourlyRentalRate, status, notes } = body;
      if (!farmId || !name) {
        return NextResponse.json({ error: 'Farm and equipment name are required' }, { status: 400 });
      }

      const machine = await prisma.machinery.create({
        data: {
          farmId,
          name,
          model: model || '',
          ownership: ownership || 'OWNED',
          fuelType: fuelType || 'DIESEL',
          hourlyRentalRate: hourlyRentalRate ? parseFloat(hourlyRentalRate) : 0,
          status: status || 'AVAILABLE',
          notes: notes || '',
        },
      });
      return NextResponse.json(machine, { status: 201 });
    }

    if (action === 'LOG_USAGE') {
      const { machineryId, farmId, fieldId, date, hoursUsed, fuelLitres, fuelCost, maintenanceCost, rentalCost, notes } = body;

      if (!machineryId || !farmId || !date || !hoursUsed) {
        return NextResponse.json({ error: 'Equipment, farm, date, and hours used are required' }, { status: 400 });
      }

      const fCost = fuelCost ? parseFloat(fuelCost) : 0;
      const mCost = maintenanceCost ? parseFloat(maintenanceCost) : 0;
      const rCost = rentalCost ? parseFloat(rentalCost) : 0;
      const totalCost = fCost + mCost + rCost;

      const log = await prisma.machineryLog.create({
        data: {
          machineryId,
          farmId,
          fieldId: fieldId || null,
          date: new Date(date),
          hoursUsed: parseFloat(hoursUsed),
          fuelLitres: fuelLitres ? parseFloat(fuelLitres) : 0,
          fuelCost: fCost,
          maintenanceCost: mCost,
          rentalCost: rCost,
          notes: notes || '',
        },
      });

      if (totalCost > 0) {
        await prisma.expense.create({
          data: {
            farmId,
            fieldId: fieldId || null,
            category: rCost > 0 ? 'MACHINERY_FUEL' : mCost > 0 ? 'EQUIPMENT_REPAIR' : 'MACHINERY_FUEL',
            title: `Machinery Operation: ${hoursUsed} hrs`,
            amount: totalCost,
            date: new Date(date),
            paymentStatus: 'PAID',
            paymentMode: 'CASH',
            notes: `Fuel: ₹${fCost}, Maint: ₹${mCost}, Rent: ₹${rCost}`,
          },
        });
      }

      return NextResponse.json(log, { status: 201 });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error handling machinery action:', error);
    return NextResponse.json({ error: 'Failed to process machinery record' }, { status: 500 });
  }
}
