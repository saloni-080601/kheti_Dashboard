export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function indiaDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function cropSalesIncome(crop: any) {
  const productionIncomeByDay = new Map<string, number>();
  const legacyEntries = (crop.productionEntries || []).filter((entry: any) => !entry.batchId);
  for (const entry of legacyEntries) {
    const key = indiaDateKey(entry.entryDate);
    const net = entry.productionKg * entry.ratePerKg - entry.hamaliCost - entry.transportCost - entry.commissionCost;
    productionIncomeByDay.set(key, (productionIncomeByDay.get(key) || 0) + net);
  }
  for (const batch of crop.productionBatches || []) {
    const key = indiaDateKey(batch.entryDate);
    const gross = batch.entries.reduce((sum: number, entry: any) => sum + entry.productionKg * entry.ratePerKg, 0);
    const net = gross - batch.hamaliCost - batch.transportCost - batch.commissionCost;
    productionIncomeByDay.set(key, (productionIncomeByDay.get(key) || 0) + net);
  }

  const mandiIncomeByDay = new Map<string, number>();
  for (const sale of crop.sales || []) {
    const key = indiaDateKey(sale.saleDate);
    mandiIncomeByDay.set(key, (mandiIncomeByDay.get(key) || 0) + sale.netAmount);
  }

  let income = 0;
  productionIncomeByDay.forEach((amount) => { income += amount; });
  mandiIncomeByDay.forEach((amount, key) => {
    // Prefer Crop Management's sale record for a crop/day to avoid counting
    // the same dispatch again if it was also entered in Mandi Sales.
    if (!productionIncomeByDay.has(key)) income += amount;
  });
  return income;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const farmId = searchParams.get('farmId');

    const farmFilter = farmId && farmId !== 'ALL' ? { farmId } : {};

    // 1. Crop-wise P&L
    const crops = await prisma.crop.findMany({
      where: farmFilter,
      include: {
        farm: true,
        field: true,
        sales: true,
        expenses: true,
        productionEntries: { where: { batchId: null } },
        productionBatches: { include: { entries: true } },
        harvestLogs: true,
      },
      orderBy: { sowingDate: 'desc' },
    });

    const cropPnl = crops.map((crop) => {
      const totalIncome = cropSalesIncome(crop);
      const totalExpenses = crop.expenses.reduce((sum, e) => sum + e.amount, 0);
      const netProfit = totalIncome - totalExpenses;
      const profitPerAcre = crop.area > 0 ? netProfit / crop.area : 0;
      const totalYield = crop.harvestLogs.reduce((sum, h) => sum + h.quantity, 0);
      const costPerQuintal = totalYield > 0 ? totalExpenses / totalYield : 0;
      const avgSellingPrice = totalYield > 0 && totalIncome > 0 ? totalIncome / totalYield : 0;

      // Expense category breakdown for this crop
      const categoryBreakdown: Record<string, number> = {};
      crop.expenses.forEach((e) => {
        categoryBreakdown[e.category] = (categoryBreakdown[e.category] || 0) + e.amount;
      });

      return {
        id: crop.id,
        name: crop.name,
        variety: crop.variety,
        season: crop.season,
        area: crop.area,
        status: crop.status,
        farmName: crop.farm.name,
        fieldName: crop.field.name,
        totalIncome,
        totalExpenses,
        netProfit,
        profitPerAcre,
        totalYield,
        costPerQuintal,
        avgSellingPrice,
        categoryBreakdown,
      };
    });

    // 2. Field-wise P&L
    const fields = await prisma.field.findMany({
      where: farmFilter,
      include: {
        farm: true,
        crops: {
          include: {
            sales: true,
            expenses: true,
            productionEntries: { where: { batchId: null } },
            productionBatches: { include: { entries: true } },
            harvestLogs: true,
          },
        },
        expenses: { where: { cropId: null } },
      },
    });

    const fieldPnl = fields.map((field) => {
      // Income from all crops grown in this field
      let fieldIncome = 0;
      let fieldDirectExpenses = field.expenses.reduce((sum, e) => sum + e.amount, 0);

      field.crops.forEach((crop) => {
        fieldIncome += cropSalesIncome(crop);
        fieldDirectExpenses += crop.expenses.reduce((sum, e) => sum + e.amount, 0);
      });

      const netProfit = fieldIncome - fieldDirectExpenses;
      const profitPerAcre = field.area > 0 ? netProfit / field.area : 0;

      return {
        id: field.id,
        name: field.name,
        farmName: field.farm.name,
        area: field.area,
        soilType: field.soilType,
        cropsCount: field.crops.length,
        totalIncome: fieldIncome,
        totalExpenses: fieldDirectExpenses,
        netProfit,
        profitPerAcre,
        crops: field.crops.map((c) => ({
          name: c.name,
          season: c.season,
          area: c.area,
          yield: c.harvestLogs.reduce((s, h) => s + h.quantity, 0),
        })),
      };
    });

    // 3. Farm-level aggregation
    const totalFarmIncome = cropPnl.reduce((sum, c) => sum + c.totalIncome, 0);
    const allExpenses = await prisma.expense.findMany({ where: farmFilter });
    const totalFarmExpenses = allExpenses.reduce((sum, e) => sum + e.amount, 0);
    const overallNetProfit = totalFarmIncome - totalFarmExpenses;

    return NextResponse.json({
      cropPnl,
      fieldPnl,
      overall: {
        totalIncome: totalFarmIncome,
        totalExpenses: totalFarmExpenses,
        netProfit: overallNetProfit,
        roiPercentage: totalFarmExpenses > 0 ? ((overallNetProfit / totalFarmExpenses) * 100).toFixed(1) : '0',
      },
    });
  } catch (error) {
    console.error('Error calculating P&L:', error);
    return NextResponse.json({ error: 'Failed to calculate Profit & Loss' }, { status: 500 });
  }
}
