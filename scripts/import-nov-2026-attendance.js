const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const applyChanges = process.argv.includes('--apply');
const summaryOnly = process.argv.includes('--summary');
const onlyArg = process.argv.find((arg) => arg.startsWith('--only='));
const nameAliases = { Kkuu: 'Kaku' };

// Transcribed only from marked 1 / 0 / 0.5 cells in the user's November sheet.
// Blank cells and cells with any other value are deliberately omitted.
const sheet = {
  'KUSUM BAI': { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 9: 1, 10: 1, 11: 0, 12: 1, 13: 1, 14: 1, 15: 1, 16: 0.5, 17: 1, 18: 1, 19: 1, 20: 0.5, 21: 1, 22: 1, 23: 1 },
  'GAYATRI BAI': { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 9: 1, 10: 1, 11: 0, 12: 1, 13: 1, 14: 1, 15: 1, 16: 1, 17: 1, 18: 0, 19: 0, 20: 0, 21: 1, 22: 0, 23: 1, 24: 1 },
  'SORAM BAI': { 1: 1, 2: 1, 3: 1, 4: 0, 5: 0, 6: 0, 7: 0, 9: 0, 10: 0, 11: 0, 12: 1, 13: 1, 14: 1, 15: 0, 16: 0, 17: 0, 18: 1, 19: 1, 20: 1, 21: 1, 22: 1, 23: 1 },
  'RAJ MANI BAI': { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 9: 1, 10: 1, 11: 0, 12: 1, 13: 1, 14: 1, 15: 1, 16: 1, 17: 1, 18: 1, 19: 1, 20: 1, 21: 1, 22: 1, 23: 1 },
  Sonu: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 0.5, 8: 0, 9: 0, 10: 1, 11: 1, 12: 1, 13: 1, 14: 1, 15: 1, 16: 1, 17: 1, 18: 1, 19: 1, 20: 1, 21: 1, 22: 1, 23: 1, 24: 1 },
  'Bhabi S': { 1: 0, 2: 0, 3: 0, 4: 1, 5: 1, 6: 1, 7: 0, 9: 0, 10: 0, 11: 0, 12: 0, 13: 1, 14: 1, 15: 1, 16: 1, 17: 1, 18: 1, 19: 0, 20: 0, 21: 1, 22: 1, 23: 1, 24: 1 },
  Neeraj: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 0.5, 9: 0, 11: 0 },
  Ram: Object.fromEntries(Array.from({ length: 24 }, (_, i) => [i + 1, 1])),
  'Bhabi R': { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 9: 1, 10: 0, 11: 0, 12: 1, 13: 1, 14: 1, 15: 1, 16: 1, 17: 1, 18: 1, 19: 1, 20: 1, 21: 1, 22: 1, 23: 1, 24: 1 },
  Golu: { 1: 1, 2: 0, 3: 0, 4: 0, 5: 0, 6: 1, 7: 0.5, 9: 0, 11: 0, 19: 1, 20: 1, 21: 1, 22: 0, 23: 1, 24: 1 },
  Kamni: { 4: 1, 5: 1, 6: 1, 17: 1, 18: 1, 19: 1, 20: 1, 21: 1, 22: 1, 23: 1, 24: 1 },
  Madhu: { 4: 1, 5: 1, 6: 1, 13: 1, 14: 1, 15: 1, 16: 1, 17: 0.5, 18: 0, 19: 0, 20: 0, 21: 0, 22: 0, 23: 0, 24: 0 },
  Roshni: { 5: 1, 6: 1, 17: 1, 18: 1, 19: 1, 20: 1, 21: 1, 22: 1, 23: 1, 24: 1 },
  Rachna: { 4: 1, 5: 1, 6: 1 },
  Pappi: { 4: 1, 5: 1, 6: 1, 13: 1, 14: 1, 15: 1, 18: 0, 19: 0, 20: 0, 21: 0, 22: 0, 23: 0 },
  Maya: { 13: 1, 14: 1, 15: 1, 16: 1, 17: 1, 18: 1, 19: 1, 20: 1, 21: 1, 22: 1, 23: 1, 24: 1 },
  Kkuu: { 18: 0.5, 19: 1, 20: 1, 21: 1, 22: 1, 23: 1, 24: 1 },
  Betli: { 19: 1, 20: 1, 21: 1, 22: 1, 23: 1, 24: 1 },
};

function normalizeName(value) {
  return value.trim().toLocaleLowerCase().replace(/[^a-z0-9]/g, '');
}

function indiaDateKey(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function attendanceDate(day) {
  return new Date(`2026-11-${String(day).padStart(2, '0')}T00:00:00.000Z`);
}

function statusFor(value) {
  return value === 1 ? 'PRESENT' : value === 0 ? 'ABSENT' : 'HALF_DAY';
}

async function main() {
  const selectedNames = onlyArg ? onlyArg.slice('--only='.length).split(',').map((name) => name.trim()).filter(Boolean) : Object.keys(sheet);
  const selectedSheet = Object.fromEntries(selectedNames.map((name) => [name, sheet[name]]).filter(([, entries]) => entries));
  if (!Object.keys(selectedSheet).length) throw new Error(`No sheet rows matched --only=${onlyArg?.slice('--only='.length) || ''}`);
  const [farms, workers] = await Promise.all([
    prisma.farm.findMany({ select: { id: true, name: true } }),
    prisma.labourer.findMany({ select: { id: true, name: true, workerType: true, dailyWage: true, monthlySalary: true } }),
  ]);
  const workerByName = new Map(workers.map((worker) => [normalizeName(worker.name), worker]));
  const matchedWorker = (name) => workerByName.get(normalizeName(nameAliases[name] || name));
  const missingNames = Object.keys(selectedSheet).filter((name) => !matchedWorker(name));
  const matchedWorkers = Object.keys(selectedSheet).map(matchedWorker).filter(Boolean);
  const novemberStart = new Date('2026-10-31T00:00:00.000Z');
  const decemberStart = new Date('2026-12-02T00:00:00.000Z');
  const existingLogs = await prisma.labourLog.findMany({
    where: {
      labourerId: { in: matchedWorkers.map((worker) => worker.id) },
      date: { gte: novemberStart, lt: decemberStart },
    },
    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
  });

  const farmCounts = new Map();
  for (const log of existingLogs) farmCounts.set(log.farmId, (farmCounts.get(log.farmId) || 0) + 1);
  let targetFarmId = farms.length === 1 ? farms[0].id : null;
  if (!targetFarmId && farmCounts.size) {
    const ranking = Array.from(farmCounts.entries()).sort((a, b) => b[1] - a[1]);
    if (ranking.length === 1 || ranking[0][1] > ranking[1][1]) targetFarmId = ranking[0][0];
  }
  const targetFarm = farms.find((farm) => farm.id === targetFarmId);

  const rows = [];
  const duplicates = [];
  for (const [sheetName, markedDays] of Object.entries(selectedSheet)) {
    const worker = matchedWorker(sheetName);
    if (!worker) continue;
    for (const [dayText, value] of Object.entries(markedDays)) {
      const day = Number(dayText);
      const key = `2026-11-${String(day).padStart(2, '0')}`;
      const matches = existingLogs.filter((log) => log.labourerId === worker.id && log.farmId === targetFarmId && indiaDateKey(log.date) === key);
      if (matches.length > 1) duplicates.push({ sheetName, day, matches: matches.length });
      rows.push({ sheetName, worker, day, value, status: statusFor(value), matches });
    }
  }

  const countsByWorker = rows.reduce((result, row) => {
    result[row.sheetName] ||= { marked: 0, present: 0, absent: 0, halfDay: 0, existing: 0 };
    const count = result[row.sheetName];
    count.marked += 1;
    count.present += row.status === 'PRESENT' ? 1 : 0;
    count.absent += row.status === 'ABSENT' ? 1 : 0;
    count.halfDay += row.status === 'HALF_DAY' ? 1 : 0;
    count.existing += row.matches.length > 0 ? 1 : 0;
    return result;
  }, {});

  console.log(JSON.stringify({
    mode: applyChanges ? 'apply' : 'dry-run',
    sheetRows: Object.keys(selectedSheet).length,
    namesMatched: Object.keys(selectedSheet).length - missingNames.length,
    missingNames,
    unmatchedNameCandidates: missingNames.map((name) => {
      const source = normalizeName(name);
      return {
        sheetName: name,
        candidates: workers.filter((worker) => {
          const candidate = normalizeName(worker.name);
          return candidate.includes(source) || source.includes(candidate);
        }).map((worker) => worker.name),
      };
    }),
    workerNames: missingNames.length && !summaryOnly ? workers.map((worker) => worker.name) : undefined,
    farms: farms.map(({ name }) => name),
    selectedFarm: targetFarm?.name || null,
    existingNovemberAttendanceLogsForMatchedWorkers: existingLogs.length,
    explicitAttendanceCells: rows.length,
    recordsToCreate: rows.filter((row) => row.matches.length === 0).length,
    recordsToUpdate: rows.filter((row) => row.matches.length === 1).length,
    duplicateExistingCells: duplicates,
    perWorker: summaryOnly ? undefined : countsByWorker,
  }, null, 2));

  if (!applyChanges) return;
  if (!targetFarmId) throw new Error('Cannot safely select a target farm. Review existing November logs and rerun with an explicit farm mapping.');
  if (duplicates.length) throw new Error('Duplicate attendance logs exist for one or more worker/date cells; refusing to overwrite them automatically.');

  const totals = { created: 0, updated: 0, expensesCreated: 0, expensesUpdated: 0 };
  const batchSize = 20;
  for (let offset = 0; offset < rows.length; offset += batchSize) {
    const batchRows = rows.slice(offset, offset + batchSize);
    const batchResult = await prisma.$transaction(async (tx) => {
      let created = 0;
      let updated = 0;
      let expensesCreated = 0;
      let expensesUpdated = 0;
      for (const row of batchRows) {
      const date = attendanceDate(row.day);
      const daysInMonth = 30;
      const dailyWage = row.worker.workerType === 'PERMANENT'
        ? Number(row.worker.monthlySalary || 0) / daysInMonth
        : Number(row.worker.dailyWage || 0);
      const hoursWorked = row.status === 'PRESENT' ? 8 : row.status === 'HALF_DAY' ? 4 : 0;
      const totalEarned = dailyWage * (row.status === 'PRESENT' ? 1 : row.status === 'HALF_DAY' ? 0.5 : 0);
      const amountPaid = row.matches[0]?.amountPaid || 0;
      const paymentStatus = totalEarned <= 0 || amountPaid >= totalEarned ? 'PAID' : amountPaid > 0 ? 'PARTIAL' : 'PENDING';
      const logData = {
        attendanceStatus: row.status,
        hoursWorked,
        dailyWage,
        totalEarned,
        paymentStatus,
        notes: `Attendance imported from November 2026 sheet (${row.value})`,
      };

      let log;
      if (row.matches.length === 1) {
        log = await tx.labourLog.update({ where: { id: row.matches[0].id }, data: logData });
        updated += 1;
      } else {
        log = await tx.labourLog.create({
          data: {
            ...logData,
            labourerId: row.worker.id,
            farmId: targetFarmId,
            date,
            amountPaid: 0,
            paymentStatus: totalEarned > 0 ? 'PENDING' : 'PAID',
          },
        });
        created += 1;
      }

      const expenseNotes = `Attendance log for worker ${row.worker.id}`;
      const existingExpense = await tx.expense.findFirst({
        where: { farmId: targetFarmId, category: 'LABOUR', date, notes: expenseNotes },
      });
      if (totalEarned > 0) {
        const expenseData = {
          farmId: targetFarmId,
          category: 'LABOUR',
          title: `Labour attendance: ${row.worker.name} (${row.status.replace('_', ' ')})`,
          amount: totalEarned,
          date,
          paymentStatus: paymentStatus === 'PAID' ? 'PAID' : 'PENDING',
          paymentMode: 'CASH',
          notes: expenseNotes,
        };
        if (existingExpense) {
          await tx.expense.update({ where: { id: existingExpense.id }, data: expenseData });
          expensesUpdated += 1;
        } else {
          await tx.expense.create({ data: expenseData });
          expensesCreated += 1;
        }
      } else if (existingExpense) {
        await tx.expense.delete({ where: { id: existingExpense.id } });
      }
      }
      return { created, updated, expensesCreated, expensesUpdated };
    }, { maxWait: 10_000, timeout: 120_000 });
    for (const key of Object.keys(totals)) totals[key] += batchResult[key];
    console.log(JSON.stringify({ batch: `${offset + 1}-${Math.min(offset + batchSize, rows.length)}`, ...batchResult }));
  }
  console.log(JSON.stringify({ applied: totals }, null, 2));
}

main()
  .catch((error) => {
    console.error('Unable to import November attendance:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
