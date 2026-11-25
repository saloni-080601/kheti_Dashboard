export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const farms = await prisma.farm.findMany({
      include: {
        fields: {
          include: {
            sections: true,
            crops: {
              where: { status: { in: ['PLANNING', 'SOWN', 'GROWING', 'HARVESTING'] } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const enrichedFarms = farms.map((farm) => {
      const totalFieldAcres = farm.fields.reduce((acc, f) => acc + f.area, 0);
      const totalCultivatedAcres = farm.fields.reduce((acc, f) => {
        return acc + f.crops.reduce((cAcc, c) => cAcc + c.area, 0);
      }, 0);
      const remainingFarmAcres = Math.max(0, farm.totalArea - totalFieldAcres);
      const uncultivatedAcres = Math.max(0, farm.totalArea - totalCultivatedAcres);

      return {
        ...farm,
        totalFieldAcres,
        totalCultivatedAcres,
        remainingFarmAcres,
        uncultivatedAcres,
      };
    });

    return NextResponse.json(enrichedFarms);
  } catch (error) {
    console.error('Error fetching farms:', error);
    return NextResponse.json({ error: 'Failed to fetch farms' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, location, totalArea, ownershipType, leaseCostPerYear, description } = body;

    if (!name || !totalArea || isNaN(Number(totalArea))) {
      return NextResponse.json(
        { error: 'Farm name and valid total area (acres) are required' },
        { status: 400 }
      );
    }

    const farm = await prisma.farm.create({
      data: {
        name,
        location: location || '',
        totalArea: parseFloat(totalArea),
        ownershipType: ownershipType || 'OWNED',
        leaseCostPerYear: leaseCostPerYear ? parseFloat(leaseCostPerYear) : 0,
        description: description || '',
      },
    });

    return NextResponse.json(farm, { status: 201 });
  } catch (error) {
    console.error('Error creating farm:', error);
    return NextResponse.json({ error: 'Failed to create farm' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Farm ID required' }, { status: 400 });

    await prisma.farm.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete farm' }, { status: 500 });
  }
}
