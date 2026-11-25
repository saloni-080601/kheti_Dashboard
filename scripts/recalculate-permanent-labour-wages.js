const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const applyChanges = process.argv.includes('--apply');

function indiaDateKey(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function getDaysInMonth(dateKey) {
  const [year, month] = dateKey.slice(0, 7).split('-').map(Number);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

async function main() {
  const logs = await prisma.labourLog.findMany({
    where: { labourer: { workerType: 'PERMANENT' } },
    include: { labourer: { select: { monthlySalary: true } } },
    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
  });

  const changes = [];
  const claimedExpenseIds = new Set();
  for (const log of logs) {
    const monthlySalary = Number(log.labourer.monthlySalary || 0);
    if (monthlySalary <= 0) continue;
    const days = getDaysInMonth(indiaDateKey(log.date));
    const dailyWage = monthlySalary / days;
    const dayFraction = log.attendanceStatus === 'ABSENT' ? 0 : Math.min(1, Math.max(0, log.hoursWorked / 8));
    const totalEarned = dailyWage * dayFraction;
    const changed = Math.abs(log.dailyWage - dailyWage) > 0.005 || Math.abs(log.totalEarned - totalEarned) > 0.005;
    if (!changed) continue;

    const expenseNotes = [
      `Attendance log for worker ${log.labourerId}`,
      `Labour log entry for worker ID ${log.labourerId}`,
    ];
    const expense = totalEarned > 0 ? await prisma.expense.findFirst({
      where: {
        farmId: log.farmId,
        category: 'LABOUR',
        date: log.date,
        amount: log.totalEarned,
        notes: { in: expenseNotes },
        id: { notIn: Array.from(claimedExpenseIds) },
      },
      select: { id: true },
    }) : null;
    if (expense) claimedExpenseIds.add(expense.id);

    changes.push({ log, dailyWage, totalEarned, expenseId: expense?.id || null });
  }

  const matchedExpenses = changes.filter((row) => row.expenseId).length;
  const missingExpenses = changes.filter((row) => row.totalEarned > 0 && !row.expenseId).length;
  console.log(JSON.stringify({
    mode: applyChanges ? 'apply' : 'dry-run',
    permanentLogsFound: logs.length,
    logsToUpdate: changes.length,
    matchingExpensesToUpdate: matchedExpenses,
    earnedLogsWithoutMatchingExpense: missingExpenses,
    totalEarnedBefore: Number(changes.reduce((sum, row) => sum + row.log.totalEarned, 0).toFixed(2)),
    totalEarnedAfter: Number(changes.reduce((sum, row) => sum + row.totalEarned, 0).toFixed(2)),
  }, null, 2));

  if (!applyChanges) return;
  let updatedExpenses = 0;
  for (const row of changes) {
    await prisma.$transaction(async (tx) => {
      await tx.labourLog.update({
        where: { id: row.log.id },
        data: { dailyWage: row.dailyWage, totalEarned: row.totalEarned },
      });
      if (row.expenseId) {
        await tx.expense.update({ where: { id: row.expenseId }, data: { amount: row.totalEarned } });
        updatedExpenses += 1;
      }
    });
  }
  console.log(JSON.stringify({ updatedLogs: changes.length, updatedExpenses }, null, 2));
}

main()
  .catch((error) => {
    console.error('Unable to recalculate permanent monthly labour wages:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
