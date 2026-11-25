export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const farmId = searchParams.get('farmId');
    const attendanceDateParam = searchParams.get('attendanceDate');

    const labourers = await prisma.labourer.findMany({
      include: {
        logs: {
          where: farmId && farmId !== 'ALL' ? { farmId } : {},
          include: { farm: true, field: true, crop: true },
          orderBy: { date: 'desc' },
        },
        payments: {
          orderBy: { date: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    const enrichedLabourers = labourers.map((worker) => {
      const totalEarned = worker.logs.reduce((s, l) => s + l.totalEarned, 0);
      const totalPaid = worker.payments.reduce((s, p) => s + p.amount, 0);
      const balancePending = Math.max(0, totalEarned - totalPaid);
      const totalDaysWorked = worker.logs.reduce((sum, log) => sum + (log.attendanceStatus === 'PRESENT' ? 1 : log.attendanceStatus === 'HALF_DAY' ? 0.5 : 0), 0);

      return {
        ...worker,
        attendanceAlreadyLogged: false,
        totalEarned,
        totalPaid,
        balancePending,
        totalDaysWorked,
      };
    });

    if (attendanceDateParam) {
      const attendanceDate = new Date(attendanceDateParam);
      if (Number.isNaN(attendanceDate.getTime())) return NextResponse.json({ error: 'Invalid attendance date.' }, { status: 400 });
      const recorded = await prisma.labourLog.findMany({
        where: { ...(farmId && farmId !== 'ALL' ? { farmId } : {}), date: attendanceDate },
        select: { labourerId: true },
      });
      const recordedIds = new Set(recorded.map((entry) => entry.labourerId));
      for (const worker of enrichedLabourers) worker.attendanceAlreadyLogged = recordedIds.has(worker.id);
    }

    return NextResponse.json(enrichedLabourers);
  } catch (error) {
    console.error('Error fetching labourers:', error);
    return NextResponse.json({ error: 'Failed to fetch labour data' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // Action 1: Add new worker
    if (action === 'CREATE_WORKER') {
      const { name, phone, workerType, dailyWage, monthlySalary, emergencyContact, notes } = body;
      const isPermanent = workerType === 'PERMANENT';
      const wageValue = Number(isPermanent ? monthlySalary : dailyWage);
      if (!name || !Number.isFinite(wageValue) || wageValue < 0) {
        return NextResponse.json({ error: isPermanent ? 'Name and monthly salary are required' : 'Name and daily wage are required' }, { status: 400 });
      }

      const labourer = await prisma.labourer.create({
        data: {
          name,
          phone: phone || '',
          workerType: workerType || 'DAILY_WAGE',
          dailyWage: isPermanent ? 0 : wageValue,
          monthlySalary: isPermanent ? wageValue : null,
          emergencyContact: emergencyContact || '',
          notes: notes || '',
        },
      });
      return NextResponse.json(labourer, { status: 201 });
    }

    if (action === 'UPDATE_ATTENDANCE') {
      const { logId, status } = body;
      const validStatuses = new Set(['PRESENT', 'ABSENT', 'HALF_DAY']);
      if (!logId || !validStatuses.has(status)) {
        return NextResponse.json({ error: 'An attendance record and a valid status are required.' }, { status: 400 });
      }

      const updatedLog = await prisma.$transaction(async (tx) => {
        const existingLog = await tx.labourLog.findUnique({ where: { id: logId }, include: { labourer: true } });
        if (!existingLog) throw new Error('Attendance record not found. Refresh and try again.');

        const hoursWorked = status === 'PRESENT' ? 8 : status === 'HALF_DAY' ? 4 : 0;
        const totalEarned = status === 'ABSENT' ? 0 : existingLog.dailyWage * (status === 'HALF_DAY' ? 0.5 : 1);
        const paymentStatus = totalEarned <= 0 || existingLog.amountPaid >= totalEarned
          ? 'PAID'
          : existingLog.amountPaid > 0 ? 'PARTIAL' : 'PENDING';
        const log = await tx.labourLog.update({
          where: { id: logId },
          data: {
            attendanceStatus: status,
            hoursWorked,
            totalEarned,
            paymentStatus,
            notes: `Attendance: ${status.replace('_', ' ')}`,
          },
        });

        const attendanceNotes = `Attendance log for worker ${existingLog.labourerId}`;
        const workLogNotes = `Labour log entry for worker ID ${existingLog.labourerId}`;
        const expenseNotes = existingLog.notes?.startsWith('Attendance') ? attendanceNotes : workLogNotes;
        const expense = await tx.expense.findFirst({
          where: { farmId: existingLog.farmId, date: existingLog.date, category: 'LABOUR', notes: expenseNotes },
        });

        if (totalEarned > 0) {
          const expenseData = {
            farmId: existingLog.farmId,
            fieldId: existingLog.fieldId,
            cropId: existingLog.cropId,
            category: 'LABOUR',
            title: `Labour attendance: ${existingLog.labourer.name} (${status.replace('_', ' ')})`,
            amount: totalEarned,
            date: existingLog.date,
            paymentStatus: paymentStatus === 'PAID' ? 'PAID' : 'PENDING',
            paymentMode: expense?.paymentMode || 'CASH',
            notes: expenseNotes,
          };
          if (expense) await tx.expense.update({ where: { id: expense.id }, data: expenseData });
          else await tx.expense.create({ data: expenseData });
        } else if (expense) {
          await tx.expense.delete({ where: { id: expense.id } });
        }

        return log;
      });

      return NextResponse.json(updatedLog);
    }

    if (action === 'LOG_BULK_ATTENDANCE') {
      const { farmId, date, attendance } = body;
      const attendanceDate = new Date(date);
      const validStatuses = new Set(['PRESENT', 'ABSENT', 'HALF_DAY']);
      if (!farmId || Number.isNaN(attendanceDate.getTime()) || !Array.isArray(attendance) || attendance.length === 0 || attendance.some((row: any) => !row.labourerId || !validStatuses.has(row.status))) {
        return NextResponse.json({ error: 'Farm, date, and a valid attendance status for each worker are required.' }, { status: 400 });
      }

      const result = await prisma.$transaction(async (tx) => {
        const farm = await tx.farm.findUnique({ where: { id: farmId } });
        if (!farm) throw new Error('Farm not found.');
        const workers = await tx.labourer.findMany({ where: { id: { in: attendance.map((row: any) => row.labourerId) }, status: 'ACTIVE' } });
        if (workers.length !== attendance.length) throw new Error('One or more selected workers are unavailable. Refresh the page and try again.');
        const alreadyLogged = await tx.labourLog.findFirst({ where: { farmId, date: attendanceDate, labourerId: { in: workers.map((worker) => worker.id) } } });
        if (alreadyLogged) throw new Error('Attendance has already been recorded for one or more workers on this date.');

        const workerById = new Map(workers.map((worker) => [worker.id, worker]));
        const logs = [];
        for (const row of attendance) {
          const worker = workerById.get(row.labourerId)!;
          const status = row.status as 'PRESENT' | 'ABSENT' | 'HALF_DAY';
          const hoursWorked = status === 'PRESENT' ? 8 : status === 'HALF_DAY' ? 4 : 0;
          const [attendanceYear, attendanceMonth] = String(date).slice(0, 10).split('-').map(Number);
          const daysInMonth = new Date(Date.UTC(attendanceYear, attendanceMonth, 0)).getUTCDate();
          const dailyWage = worker.workerType === 'PERMANENT' ? (worker.monthlySalary || 0) / daysInMonth : worker.dailyWage;
          const totalEarned = status === 'ABSENT' ? 0 : dailyWage * (status === 'HALF_DAY' ? 0.5 : 1);
          const log = await tx.labourLog.create({ data: {
            labourerId: worker.id, farmId, date: attendanceDate, attendanceStatus: status,
            hoursWorked, dailyWage, totalEarned, amountPaid: 0,
            paymentStatus: totalEarned > 0 ? 'PENDING' : 'PAID',
            notes: `Attendance: ${status.replace('_', ' ')}`,
          } });
          if (totalEarned > 0) {
            await tx.expense.create({ data: {
              farmId, category: 'LABOUR', title: `Labour attendance: ${worker.name} (${status.replace('_', ' ')})`,
              amount: totalEarned, date: attendanceDate, paymentStatus: 'PENDING', paymentMode: 'CASH',
              notes: `Attendance log for worker ${worker.id}`,
            } });
          }
          logs.push(log);
        }
        return logs;
      });
      return NextResponse.json({ count: result.length, logs: result }, { status: 201 });
    }

    // Action 2: Log attendance / work
    if (action === 'LOG_WORK') {
      const { labourerId, farmId, fieldId, cropId, activityId, date, hoursWorked, dailyWage, amountPaid, notes } = body;

      if (!labourerId || !farmId || !date || !dailyWage) {
        return NextResponse.json(
          { error: 'Worker, farm, date, and wage are required' },
          { status: 400 }
        );
      }

      const hours = hoursWorked ? parseFloat(hoursWorked) : 8;
      const wageRate = parseFloat(dailyWage);
      const totalEarned = (hours / 8) * wageRate;
      const paid = amountPaid ? parseFloat(amountPaid) : 0;
      const paymentStatus = paid >= totalEarned ? 'PAID' : paid > 0 ? 'PARTIAL' : 'PENDING';

      const log = await prisma.labourLog.create({
        data: {
          labourerId,
          farmId,
          fieldId: fieldId || null,
          cropId: cropId || null,
          activityId: activityId || null,
          date: new Date(date),
          hoursWorked: hours,
          dailyWage: wageRate,
          totalEarned,
          amountPaid: paid,
          paymentStatus,
          notes: notes || '',
        },
      });

      // Record corresponding expense
      await prisma.expense.create({
        data: {
          farmId,
          fieldId: fieldId || null,
          cropId: cropId || null,
          category: 'LABOUR',
          title: `Labour: ${hours}h work`,
          amount: totalEarned,
          date: new Date(date),
          paymentStatus: paymentStatus === 'PAID' ? 'PAID' : 'PENDING',
          paymentMode: 'CASH',
          notes: `Labour log entry for worker ID ${labourerId}`,
        },
      });

      return NextResponse.json(log, { status: 201 });
    }

    // Action 3: Make wage payment
    if (action === 'RECORD_PAYMENT') {
      const { labourerId, date, amount, paymentMode, notes } = body;

      if (!labourerId || !amount || !date) {
        return NextResponse.json({ error: 'Worker, amount, and date are required' }, { status: 400 });
      }

      const payment = await prisma.labourPayment.create({
        data: {
          labourerId,
          date: new Date(date),
          amount: parseFloat(amount),
          paymentMode: paymentMode || 'CASH',
          notes: notes || '',
        },
      });

      return NextResponse.json(payment, { status: 201 });
    }

    return NextResponse.json({ error: 'Invalid action specified' }, { status: 400 });
  } catch (error) {
    console.error('Error handling labour request:', error);
    return NextResponse.json({ error: 'Failed to process labour record' }, { status: 500 });
  }
}
