export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfDay, startOfWeek, startOfMonth, startOfYear, subMonths } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const farmId = searchParams.get('farmId'); // optional filter by farm
    const range = searchParams.get('range') || 'season'; // today, week, month, season, year, all

    const now = new Date();
    let startDate: Date | undefined;

    if (range === 'today') {
      startDate = startOfDay(now);
    } else if (range === 'week') {
      startDate = startOfWeek(now, { weekStartsOn: 1 });
    } else if (range === 'month') {
      startDate = startOfMonth(now);
    } else if (range === 'season') {
      // Current season: Rabi starts around October
      const currentMonth = now.getMonth(); // 0-11
      if (currentMonth >= 9) { // Oct, Nov, Dec
        startDate = new Date(now.getFullYear(), 9, 1);
      } else if (currentMonth <= 3) { // Jan-Apr
        startDate = new Date(now.getFullYear() - 1, 9, 1);
      } else { // Kharif (June)
        startDate = new Date(now.getFullYear(), 5, 1);
      }
    } else if (range === 'year') {
      startDate = startOfYear(now);
    }

    const farmFilter = farmId && farmId !== 'ALL' ? { farmId } : {};
    const farmEntityFilter = farmId && farmId !== 'ALL' ? { id: farmId } : {};

    // 1. Farms and Fields overview
    const farms = await prisma.farm.findMany({
      where: farmEntityFilter,
      include: {
        fields: {
          include: {
            crops: {
              where: {
                status: { in: ['PLANNING', 'SOWN', 'GROWING', 'HARVESTING'] },
              },
            },
            sections: true,
          },
        },
      },
    });

    const totalFarmsCount = farms.length;
    let totalLandAcres = 0;
    let ownedLandAcres = 0;
    let leasedLandAcres = 0;
    let totalFieldsCount = 0;
    let totalCultivatedAcres = 0;

    const fieldUtilization = [];

    for (const farm of farms) {
      totalLandAcres += farm.totalArea;
      if (farm.ownershipType === 'OWNED') {
        ownedLandAcres += farm.totalArea;
      } else {
        leasedLandAcres += farm.totalArea;
      }

      for (const field of farm.fields) {
        totalFieldsCount += 1;
        // Calculate cultivated acres in this field from active crops
        const fieldCultivated = field.crops.reduce((acc, c) => acc + c.area, 0);
        totalCultivatedAcres += fieldCultivated;
        const fieldUnused = Math.max(0, field.area - fieldCultivated);

        fieldUtilization.push({
          id: field.id,
          name: field.name,
          farmName: farm.name,
          farmId: farm.id,
          totalArea: field.area,
          cultivatedArea: fieldCultivated,
          unusedArea: fieldUnused,
          soilType: field.soilType,
          irrigationSource: field.irrigationSource,
          status: field.status,
          activeCrops: field.crops.map((c) => ({
            id: c.id,
            name: c.name,
            area: c.area,
            status: c.status,
            season: c.season,
          })),
        });
      }
    }

    const totalUnusedAcres = Math.max(0, totalLandAcres - totalCultivatedAcres);

    // 2. Active Crops
    const activeCrops = await prisma.crop.findMany({
      where: {
        ...farmFilter,
        status: { in: ['PLANNING', 'SOWN', 'GROWING', 'HARVESTING'] },
      },
      include: {
        field: true,
        farm: true,
      },
    });

    // Crop distribution (by area)
    const cropAreaMap: Record<string, number> = {};
    activeCrops.forEach((c) => {
      cropAreaMap[c.name] = (cropAreaMap[c.name] || 0) + c.area;
    });
    const cropDistribution = Object.entries(cropAreaMap).map(([name, area]) => ({
      name,
      area,
      percentage: totalCultivatedAcres > 0 ? Math.round((area / totalCultivatedAcres) * 100) : 0,
    }));

    // 3. Financials (Filtered by date & farm)
    const dateFilter = startDate ? { gte: startDate } : undefined;

    const expenses = await prisma.expense.findMany({
      where: {
        ...farmFilter,
        ...(dateFilter ? { date: dateFilter } : {}),
      },
    });

    const sales = await prisma.cropSale.findMany({
      where: {
        ...(farmId && farmId !== 'ALL'
          ? { crop: { farmId } }
          : {}),
        ...(dateFilter ? { saleDate: dateFilter } : {}),
      },
    });

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const labourExpenses = expenses
      .filter((e) => e.category === 'LABOUR')
      .reduce((sum, e) => sum + e.amount, 0);

    const totalIncome = sales.reduce((sum, s) => sum + s.netAmount, 0);
    const totalProfitLoss = totalIncome - totalExpenses;

    // Expense Category Breakdown
    const categoryMap: Record<string, number> = {};
    expenses.forEach((e) => {
      categoryMap[e.category] = (categoryMap[e.category] || 0) + e.amount;
    });
    const expenseCategoryBreakdown = Object.entries(categoryMap).map(([category, amount]) => ({
      category,
      amount,
      percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
    }));

    // 4. Pending payments & receivables
    // Pending labour wages from labour logs
    const pendingLabourLogs = await prisma.labourLog.findMany({
      where: {
        ...farmFilter,
        paymentStatus: { in: ['PENDING', 'PARTIAL'] },
      },
      include: {
        labourer: true,
        farm: true,
      },
    });
    const pendingLabourAmount = pendingLabourLogs.reduce(
      (sum, l) => sum + (l.totalEarned - l.amountPaid),
      0
    );

    // Pending crop sales payments from buyers
    const pendingSales = await prisma.cropSale.findMany({
      where: {
        ...(farmId && farmId !== 'ALL' ? { crop: { farmId } } : {}),
        paymentStatus: { in: ['PENDING', 'PARTIAL'] },
      },
      include: {
        crop: true,
      },
    });
    const pendingSalesAmount = pendingSales.reduce(
      (sum, s) => sum + (s.netAmount - s.amountReceived),
      0
    );

    // 5. Recent farming activities & upcoming tasks
    const recentActivities = await prisma.activity.findMany({
      where: farmFilter,
      orderBy: { date: 'desc' },
      take: 6,
      include: {
        farm: true,
        field: true,
        crop: true,
      },
    });

    const upcomingTasks = await prisma.activity.findMany({
      where: {
        ...farmFilter,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
      orderBy: { date: 'asc' },
      take: 6,
      include: {
        farm: true,
        field: true,
        crop: true,
      },
    });

    // 6. Monthly financial trend (last 6 months)
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const mStart = startOfMonth(monthDate);
      const mEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59);

      const mExpenses = await prisma.expense.findMany({
        where: {
          ...farmFilter,
          date: { gte: mStart, lte: mEnd },
        },
      });
      const mSales = await prisma.cropSale.findMany({
        where: {
          ...(farmId && farmId !== 'ALL' ? { crop: { farmId } } : {}),
          saleDate: { gte: mStart, lte: mEnd },
        },
      });

      const expSum = mExpenses.reduce((s, e) => s + e.amount, 0);
      const incSum = mSales.reduce((s, sItem) => s + sItem.netAmount, 0);

      monthlyTrend.push({
        month: monthDate.toLocaleString('default', { month: 'short' }),
        year: monthDate.getFullYear(),
        expenses: expSum,
        income: incSum,
        profit: incSum - expSum,
      });
    }

    // 7. Inventory stock alerts
    const lowStockAlerts = await prisma.inventoryItem.findMany({
      where: {
        ...farmFilter,
      },
      orderBy: { quantity: 'asc' },
    });
    const lowStockItems = lowStockAlerts.filter((item) => item.quantity <= item.minStockAlert);

    // 8. Horticulture Crop Cycle Intelligence & Comparison
    const horticultureCrops = await prisma.crop.findMany({
      where: {
        ...farmFilter,
      },
      include: {
        field: true,
        farm: true,
        stages: {
          orderBy: { stageNumber: 'asc' },
        },
        reminders: {
          where: { isResolved: false },
          orderBy: { dueDate: 'asc' },
        },
        harvestLogs: {
          orderBy: { harvestDate: 'desc' },
        },
        sales: {
          orderBy: { saleDate: 'desc' },
        },
        expenses: true,
      },
      orderBy: { sowingDate: 'desc' },
    });

    let totalHarvestKg = 0;
    let totalMandiNetIncome = 0;
    let totalPendingMandiRecovery = 0;

    const cropComparison = horticultureCrops.map((c) => {
      const expSum = c.expenses.reduce((s, e) => s + e.amount, 0);
      const incSum = c.sales.reduce((s, sl) => s + sl.netAmount, 0);
      const recSum = c.sales.reduce((s, sl) => s + sl.amountReceived, 0);
      const hKg = c.harvestLogs.reduce((s, h) => s + h.quantity, 0);
      const soldKg = c.sales.reduce((s, sl) => s + sl.quantity, 0);
      const netProfit = incSum - expSum;
      const profitPerAcre = c.area > 0 ? netProfit / c.area : 0;
      const yieldPerAcreKg = c.area > 0 ? hKg / c.area : 0;
      const avgRatePerKg = soldKg > 0 ? incSum / soldKg : 0;
      const pendingPayment = Math.max(0, incSum - recSum);

      totalHarvestKg += hKg;
      totalMandiNetIncome += incSum;
      totalPendingMandiRecovery += pendingPayment;

      return {
        id: c.id,
        name: c.name,
        variety: c.variety,
        area: c.area,
        season: c.season,
        status: c.status,
        currentStageNumber: c.currentStageNumber,
        currentStageName: c.currentStageName,
        estDaysToHarvest: c.estDaysToHarvest || 35,
        sowingDate: c.sowingDate,
        actualFirstHarvest: c.actualFirstHarvest,
        expectedHarvestDate: c.expectedHarvestDate,
        totalExpenses: expSum,
        totalIncome: incSum,
        netProfit,
        profitPerAcre,
        totalHarvestKg: hKg,
        yieldPerAcreKg,
        totalSoldKg: soldKg,
        avgRatePerKg,
        pendingPayment,
        stages: c.stages,
        field: c.field,
      };
    });

    // 9. Active Reminders (Drip, Fertigation, Spray, Labour booking, Harvest alerts)
    const activeReminders = await prisma.farmReminder.findMany({
      where: {
        ...(farmId && farmId !== 'ALL' ? { farmId } : {}),
        isResolved: false,
      },
      include: {
        crop: true,
      },
      orderBy: { dueDate: 'asc' },
      take: 10,
    });

    return NextResponse.json({
      summary: {
        totalFarmsCount,
        totalFieldsCount,
        totalLandAcres,
        ownedLandAcres,
        leasedLandAcres,
        totalCultivatedAcres,
        totalUnusedAcres,
        activeCropsCount: activeCrops.length,
        totalExpenses,
        labourExpenses,
        totalIncome,
        totalProfitLoss,
        pendingLabourAmount,
        pendingSalesAmount,
        totalHarvestKg,
        totalMandiNetIncome,
        totalPendingMandiRecovery,
      },
      fieldUtilization,
      cropDistribution,
      expenseCategoryBreakdown,
      monthlyTrend,
      recentActivities,
      upcomingTasks,
      pendingLabourLogs,
      pendingSales,
      lowStockItems,
      horticultureCrops: cropComparison,
      cropComparison,
      activeReminders,
      allFarms: farms.map((f) => ({ id: f.id, name: f.name, totalArea: f.totalArea })),
    });
  } catch (error) {
    console.error('Error fetching dashboard statistics:', error);
    return NextResponse.json(
      { error: 'Failed to load dashboard metrics' },
      { status: 500 }
    );
  }
}
