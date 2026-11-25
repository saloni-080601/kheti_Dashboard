import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function dateKey(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function utcDay(date: string, offset: number) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + offset);
  return value;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const farmId = searchParams.get('farmId');
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || startDate > endDate) {
      return NextResponse.json({ error: 'Choose a valid date range.' }, { status: 400 });
    }

    // Stored dates come from both UTC date inputs and IST midnight timestamps.
    // Query a broad UTC window, then keep records by their Indian calendar date.
    const queryStart = utcDay(startDate, -1);
    const queryEnd = utcDay(endDate, 2);
    const farmFilter = farmId && farmId !== 'ALL' ? { farmId } : {};

    const [expenses, crops] = await Promise.all([
      prisma.expense.findMany({
        where: { ...farmFilter, date: { gte: queryStart, lt: queryEnd } },
        select: { amount: true, category: true, date: true },
      }),
      prisma.crop.findMany({
        where: farmFilter,
        select: {
          productionEntries: { where: { batchId: null, entryDate: { gte: queryStart, lt: queryEnd } } },
          productionBatches: { where: { entryDate: { gte: queryStart, lt: queryEnd } }, include: { entries: true } },
          sales: { where: { saleDate: { gte: queryStart, lt: queryEnd } }, select: { netAmount: true, saleDate: true } },
        },
      }),
    ]);

    const isInRange = (date: Date) => {
      const key = dateKey(date);
      return key >= startDate && key <= endDate;
    };
    const inRangeExpenses = expenses.filter((expense) => isInRange(expense.date));
    const expenseTotal = inRangeExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const categories: Record<string, number> = {};
    for (const expense of inRangeExpenses) categories[expense.category] = (categories[expense.category] || 0) + expense.amount;

    let revenueTotal = 0;
    for (const crop of crops) {
      const legacyEntries = crop.productionEntries.filter((entry) => isInRange(entry.entryDate));
      const batches = crop.productionBatches.filter((batch) => isInRange(batch.entryDate));
      const productionByDay = new Map<string, number>();
      for (const entry of legacyEntries) {
        const key = dateKey(entry.entryDate);
        productionByDay.set(key, (productionByDay.get(key) || 0) + entry.productionKg * entry.ratePerKg - entry.hamaliCost - entry.transportCost - entry.commissionCost);
      }
      for (const batch of batches) {
        const key = dateKey(batch.entryDate);
        const batchGross = batch.entries.reduce((sum, entry) => sum + entry.productionKg * entry.ratePerKg, 0);
        productionByDay.set(key, (productionByDay.get(key) || 0) + batchGross - batch.hamaliCost - batch.transportCost - batch.commissionCost);
      }

      const mandiSalesByDay = new Map<string, number>();
      for (const sale of crop.sales) {
        if (!isInRange(sale.saleDate)) continue;
        const key = dateKey(sale.saleDate);
        mandiSalesByDay.set(key, (mandiSalesByDay.get(key) || 0) + sale.netAmount);
      }
      // Production entries are the dashboard's primary sale source. Use Mandi
      // Sales on a crop/day only when no Crop Management sale was recorded,
      // avoiding counting the same dispatch twice across the two workflows.
      for (const amount of productionByDay.values()) revenueTotal += amount;
      for (const [key, amount] of mandiSalesByDay) {
        if (!productionByDay.has(key)) revenueTotal += amount;
      }
    }

    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T00:00:00.000Z`);
    const days = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
    return NextResponse.json({
      days,
      revenueTotal,
      averageDailyRevenue: revenueTotal / days,
      expenseTotal,
      averageDailyExpense: expenseTotal / days,
      categories,
    });
  } catch (error) {
    console.error('Error loading daily financial summary:', error);
    return NextResponse.json({ error: 'Unable to load daily revenue and expenses.' }, { status: 500 });
  }
}
