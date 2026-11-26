import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fieldId, name, area, notes } = body;

    if (!fieldId || !name || !area || isNaN(Number(area))) {
      return NextResponse.json(
        { error: 'Field, section name, and area in acres are required' },
        { status: 400 }
      );
    }

    const field = await prisma.field.findUnique({
      where: { id: fieldId },
      include: { sections: true },
    });

    if (!field) {
      return NextResponse.json({ error: 'Field not found' }, { status: 404 });
    }

    const currentSectionArea = field.sections.reduce((s, sec) => s + sec.area, 0);
    const requestedArea = parseFloat(area);

    if (currentSectionArea + requestedArea > field.area + 0.01) {
      return NextResponse.json(
        {
          error: `Section area exceeds field limit. Already partitioned: ${currentSectionArea.toFixed(
            1
          )} / ${field.area} acres. Remaining: ${(field.area - currentSectionArea).toFixed(1)} acres.`,
        },
        { status: 400 }
      );
    }

    const section = await prisma.fieldSection.create({
      data: {
        fieldId,
        name,
        area: requestedArea,
        notes: notes || '',
      },
    });

    return NextResponse.json(section, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create section' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Section ID required' }, { status: 400 });

    await prisma.fieldSection.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete section' }, { status: 500 });
  }
}
