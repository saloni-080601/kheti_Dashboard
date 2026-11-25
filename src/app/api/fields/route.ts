export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const farmId = searchParams.get('farmId');

    const fields = await prisma.field.findMany({
      where: farmId && farmId !== 'ALL' ? { farmId } : {},
      include: {
        farm: true,
        sections: {
          include: {
            crops: {
              where: { status: { in: ['PLANNING', 'SOWN', 'GROWING', 'HARVESTING'] } },
            },
          },
        },
        crops: {
          where: { status: { in: ['PLANNING', 'SOWN', 'GROWING', 'HARVESTING'] } },
        },
        harvestLogs: {
          orderBy: { harvestDate: 'desc' },
          take: 3,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const enrichedFields = fields.map((field) => {
      const cultivatedAcres = field.crops.reduce((acc, c) => acc + c.area, 0);
      const remainingAcres = Math.max(0, field.area - cultivatedAcres);
      const sectionAcres = field.sections.reduce((acc, s) => acc + s.area, 0);

      return {
        ...field,
        cultivatedAcres,
        remainingAcres,
        sectionAcres,
        isFullyCultivated: cultivatedAcres >= field.area,
      };
    });

    return NextResponse.json(enrichedFields);
  } catch (error) {
    console.error('Error fetching fields:', error);
    return NextResponse.json({ error: 'Failed to fetch fields' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { farmId, name, area, location, soilType, irrigationSource, status, notes } = body;

    if (!farmId || !name || !area || isNaN(Number(area))) {
      return NextResponse.json(
        { error: 'Farm, Field name, and valid area (acres) are required' },
        { status: 400 }
      );
    }

    // Verify farm existence and check area limit
    const farm = await prisma.farm.findUnique({
      where: { id: farmId },
      include: { fields: true },
    });

    if (!farm) {
      return NextResponse.json({ error: 'Selected farm not found' }, { status: 404 });
    }

    const currentTotalFieldArea = farm.fields.reduce((sum, f) => sum + f.area, 0);
    const requestedArea = parseFloat(area);

    if (currentTotalFieldArea + requestedArea > farm.totalArea + 0.01) {
      return NextResponse.json(
        {
          error: `Cannot add ${requestedArea} acres. Farm only has ${Math.max(
            0,
            farm.totalArea - currentTotalFieldArea
          ).toFixed(1)} acres unallocated out of total ${farm.totalArea} acres.`,
        },
        { status: 400 }
      );
    }

    const field = await prisma.field.create({
      data: {
        farmId,
        name,
        area: requestedArea,
        location: location || '',
        soilType: soilType || 'Alluvial Loam',
        irrigationSource: irrigationSource || 'Canal & Borewell',
        status: status || 'ACTIVE',
        notes: notes || '',
      },
    });

    return NextResponse.json(field, { status: 201 });
  } catch (error) {
    console.error('Error creating field:', error);
    return NextResponse.json({ error: 'Failed to create field' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Field ID required' }, { status: 400 });

    await prisma.field.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete field' }, { status: 500 });
  }
}
