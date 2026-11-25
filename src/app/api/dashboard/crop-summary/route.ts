export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const farmId = searchParams.get('farmId');
    const crops = await prisma.crop.findMany({
      where: farmId && farmId !== 'ALL' ? { farmId } : {},
      include: {
        field: { select: { name: true } },
        productionEntries: { where: { batchId: null } },
        productionBatches: { include: { entries: true } },
      },
      orderBy: { sowingDate: 'desc' },
    });

    const cropSummaries = crops.map((crop) => {
      const legacyEntries = crop.productionEntries;
      const batchEntries = crop.productionBatches.flatMap((batch) => batch.entries);
      const entries = [...legacyEntries, ...batchEntries];
      const totalProduction = entries.reduce((sum, entry) => sum + entry.productionKg, 0);
      const grossSales = entries.reduce((sum, entry) => sum + entry.productionKg * entry.ratePerKg, 0);
      const hamali = crop.productionBatches.reduce((sum, batch) => sum + batch.hamaliCost, 0) +
        legacyEntries.reduce((sum, entry) => sum + entry.hamaliCost, 0);
      const transport = crop.productionBatches.reduce((sum, batch) => sum + batch.transportCost, 0) +
        legacyEntries.reduce((sum, entry) => sum + entry.transportCost, 0);
      const commission = crop.productionBatches.reduce((sum, batch) => sum + batch.commissionCost, 0) +
        legacyEntries.reduce((sum, entry) => sum + entry.commissionCost, 0);

      return {
        id: crop.id,
        name: crop.name,
        field: crop.field?.name || 'Field not set',
        sowingDate: crop.sowingDate,
        totalProduction,
        averageRate: totalProduction ? grossSales / totalProduction : 0,
        grossSales,
        hamali,
        transport,
        commission,
        netIncome: grossSales - hamali - transport - commission,
      };
    });

    const totals = cropSummaries.reduce((sum, crop) => ({
      grossSales: sum.grossSales + crop.grossSales,
      hamali: sum.hamali + crop.hamali,
      transport: sum.transport + crop.transport,
      commission: sum.commission + crop.commission,
      netIncome: sum.netIncome + crop.netIncome,
    }), { grossSales: 0, hamali: 0, transport: 0, commission: 0, netIncome: 0 });

    return NextResponse.json({ totals, crops: cropSummaries });
  } catch (error) {
    console.error('Error loading crop summary:', error);
    return NextResponse.json({ error: 'Unable to load crop management summary.' }, { status: 500 });
  }
}
