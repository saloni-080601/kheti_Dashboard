'use client';

import React, { useState, useEffect } from 'react';
import { useFarm } from '@/context/FarmContext';
import { Modal } from '@/components/common/Modal';
import {
  Users,
  Plus,
  CalendarCheck,
  CreditCard,
  Phone,
  Pencil,
  AlertTriangle,
  CheckCircle,
  Clock,
  Layers,
} from 'lucide-react';

function indiaDateKey(date = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function shiftDateKey(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function daysInMonth(dateKey: string) {
  const [year, month] = dateKey.slice(0, 7).split('-').map(Number);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function shiftMonthKey(monthKey: string, amount: number) {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1 + amount, 1)).toISOString().slice(0, 7);
}

export default function LabourPage() {
  const { selectedFarmId } = useFarm();
  const [labourers, setLabourers] = useState<any[]>([]);
  const [farms, setFarms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [attendanceViewDate, setAttendanceViewDate] = useState(indiaDateKey);
  const [attendanceCalendarMonth, setAttendanceCalendarMonth] = useState(() => indiaDateKey().slice(0, 7));
  const [attendanceCalendarWorkerId, setAttendanceCalendarWorkerId] = useState('');

  // Modals
  const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
  const [isLogWorkModalOpen, setIsLogWorkModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedWorkerForPay, setSelectedWorkerForPay] = useState<any>(null);
  const [editingAttendance, setEditingAttendance] = useState<any>(null);
  const [attendanceEditStatus, setAttendanceEditStatus] = useState('PRESENT');

  // Forms
  const [workerForm, setWorkerForm] = useState({
    name: '',
    phone: '',
    workerType: 'DAILY_WAGE',
    dailyWage: '450',
    monthlySalary: '',
    emergencyContact: '',
    notes: '',
  });

  const [logWorkForm, setLogWorkForm] = useState({
    farmId: '',
    date: indiaDateKey(),
  });
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [attendanceAlreadyLogged, setAttendanceAlreadyLogged] = useState<Set<string>>(new Set());
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  const [paymentForm, setPaymentForm] = useState({
    labourerId: '',
    date: new Date().toISOString().split('T')[0],
    amount: '',
    paymentMode: 'CASH',
    notes: '',
  });

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [labRes, farmsRes] = await Promise.all([
        fetch(`/api/labour?farmId=${selectedFarmId}&attendanceDate=${logWorkForm.date}`),
        fetch('/api/farms'),
      ]);

      if (labRes.ok && farmsRes.ok) {
        const labData = await labRes.json();
        const farmsData = await farmsRes.json();

        setLabourers(labData);
        setAttendanceAlreadyLogged(new Set(labData.filter((worker: any) => worker.attendanceAlreadyLogged).map((worker: any) => worker.id)));
        setFarms(farmsData);

        const attendanceFarmId = selectedFarmId !== 'ALL' ? selectedFarmId : farmsData[0]?.id || '';
        if (attendanceFarmId) setLogWorkForm((prev) => ({ ...prev, farmId: attendanceFarmId }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedFarmId]);

  useEffect(() => {
    let current = true;
    setLoadingAttendance(true);
    fetch(`/api/labour?farmId=${selectedFarmId}&attendanceDate=${logWorkForm.date}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to check attendance for this date.');
        if (current) setAttendanceAlreadyLogged(new Set(data.filter((worker: any) => worker.attendanceAlreadyLogged).map((worker: any) => worker.id)));
      })
      .catch((error) => { if (current) setErrorMsg(error.message || 'Unable to check attendance for this date.'); })
      .finally(() => { if (current) setLoadingAttendance(false); });
    return () => { current = false; };
  }, [selectedFarmId, logWorkForm.date]);

  const handleCreateWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await fetch('/api/labour', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_WORKER',
          ...workerForm,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add labourer');

      setSuccessMsg('Labourer registered successfully!');
      setIsWorkerModalOpen(false);
      setWorkerForm({
        name: '',
        phone: '',
        workerType: 'DAILY_WAGE',
        dailyWage: '450',
        monthlySalary: '',
        emergencyContact: '',
        notes: '',
      });
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleLogWork = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const activeLabourers = labourers.filter((worker) => worker.status === 'ACTIVE' && !attendanceAlreadyLogged.has(worker.id));
    const markedLabourers = activeLabourers.filter((worker) => attendance[worker.id]);
    if (!markedLabourers.length) {
      setErrorMsg('Select an attendance status for at least one worker.');
      return;
    }
    try {
      const res = await fetch('/api/labour', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'LOG_BULK_ATTENDANCE',
          farmId: logWorkForm.farmId || (selectedFarmId !== 'ALL' ? selectedFarmId : farms[0]?.id),
          date: logWorkForm.date,
          attendance: markedLabourers.map((worker) => ({ labourerId: worker.id, status: attendance[worker.id] })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to log labour');

      setSuccessMsg(`Attendance saved for ${data.count} worker${data.count === 1 ? '' : 's'}.`);
      setIsLogWorkModalOpen(false);
      setAttendance({});
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await fetch('/api/labour', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RECORD_PAYMENT',
          labourerId: selectedWorkerForPay.id,
          date: paymentForm.date,
          amount: paymentForm.amount,
          paymentMode: paymentForm.paymentMode,
          notes: paymentForm.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record wage payment');

      setSuccessMsg('Wage payment recorded successfully!');
      setIsPaymentModalOpen(false);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleUpdateAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAttendance) return;
    setErrorMsg('');
    try {
      const response = await fetch('/api/labour', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'UPDATE_ATTENDANCE', logId: editingAttendance.id, status: attendanceEditStatus }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update attendance.');
      setEditingAttendance(null);
      setSuccessMsg(`${editingAttendance.worker.name}'s attendance updated.`);
      await loadData();
    } catch (error: any) {
      setErrorMsg(error.message || 'Failed to update attendance.');
    }
  };

  const openWagePayment = (worker: any) => {
    setSelectedWorkerForPay(worker);
    setPaymentForm({
      labourerId: worker.id,
      date: indiaDateKey(),
      amount: worker.balancePending > 0 ? worker.balancePending.toFixed(2) : '',
      paymentMode: 'CASH',
      notes: '',
    });
    setErrorMsg('');
    setIsPaymentModalOpen(true);
  };

  const totalOwedAll = labourers.reduce((s, w) => s + w.balancePending, 0);
  const totalPaidAll = labourers.reduce((s, w) => s + w.totalPaid, 0);
  const selectedDateRecords = labourers.flatMap((worker) => (worker.logs || []).map((log: any) => ({ ...log, worker })))
    .filter((record: any) => String(record.date).slice(0, 10) === attendanceViewDate)
    .sort((a: any, b: any) => a.worker.name.localeCompare(b.worker.name));
  const presentOnDate = selectedDateRecords.filter((record: any) => record.attendanceStatus === 'PRESENT').length;
  const absentOnDate = selectedDateRecords.filter((record: any) => record.attendanceStatus === 'ABSENT').length;
  const halfDayOnDate = selectedDateRecords.filter((record: any) => record.attendanceStatus === 'HALF_DAY').length;
  const sortedLabourers = [...labourers].sort((a, b) => {
    const rank = (worker: any) => worker.workerType === 'PERMANENT' ? 0 : Number(worker.dailyWage) === 400 ? 2 : 1;
    return rank(a) - rank(b) || a.name.localeCompare(b.name);
  });
  const [calendarYear, calendarMonthNumber] = attendanceCalendarMonth.split('-').map(Number);
  const calendarMonthDate = new Date(`${attendanceCalendarMonth}-01T12:00:00`);
  const calendarDayCount = new Date(Date.UTC(calendarYear, calendarMonthNumber, 0)).getUTCDate();
  const calendarStartOffset = new Date(Date.UTC(calendarYear, calendarMonthNumber - 1, 1)).getUTCDay();
  const activeAttendanceWorkers = sortedLabourers.filter((worker) => worker.status === 'ACTIVE' && !attendanceAlreadyLogged.has(worker.id));

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <span>Labour & Wage Management</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
              मजदूर और हाजिरी रजिस्टर
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Track daily attendance, wage logs, pending balances, and pay disbursements.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setErrorMsg('');
              setIsWorkerModalOpen(true);
            }}
            className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors border border-stone-200"
          >
            <Plus className="w-4 h-4" /> Register Worker
          </button>
          <button
            onClick={() => {
              setErrorMsg('');
              setIsLogWorkModalOpen(true);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors shadow-sm shadow-blue-700/20"
          >
            <CalendarCheck className="w-4 h-4" /> Log Daily Work (हाजिरी भरें)
          </button>
        </div>
      </div>

      <section className="flex flex-col justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <div>
          <h2 className="font-bold text-stone-900">Date-wise Attendance</h2>
          <p className="text-xs text-stone-500">Choose a date to see who was present, absent, or on half day.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Previous day" onClick={() => setAttendanceViewDate((date) => shiftDateKey(date, -1))} className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50">← Previous</button>
          <input aria-label="Attendance date" type="date" value={attendanceViewDate} onChange={(event) => setAttendanceViewDate(event.target.value)} className="rounded-lg border border-stone-300 px-3 py-2 text-sm" />
          <button type="button" aria-label="Next day" onClick={() => setAttendanceViewDate((date) => shiftDateKey(date, 1))} className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50">Next →</button>
        </div>
      </section>

      {/* Financial Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
          <span className="text-xs font-bold text-stone-500 uppercase">Active Workers</span>
          <p className="text-2xl font-black text-stone-900 mt-1">{labourers.length} Registered</p>
        </div>
        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 shadow-sm">
          <span className="text-xs font-bold text-emerald-800 uppercase">Present · {new Date(`${attendanceViewDate}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          <p className="text-2xl font-black text-emerald-950 mt-1">{presentOnDate} Present</p>
          <p className="text-xs font-medium text-emerald-800 mt-1">Half day: {halfDayOnDate} · Absent: {absentOnDate}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
          <span className="text-xs font-bold text-stone-500 uppercase">Total Wages Paid</span>
          <p className="text-2xl font-black text-blue-700 mt-1">₹{totalPaidAll.toLocaleString()}</p>
        </div>
        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 shadow-sm">
          <span className="text-xs font-bold text-amber-800 uppercase">Total Pending Wages</span>
          <p className="text-2xl font-black text-amber-950 mt-1">₹{totalOwedAll.toLocaleString()}</p>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-1 border-b border-stone-200 bg-stone-50 px-5 py-4 sm:flex-row sm:items-center">
          <h2 className="font-bold text-stone-800">Attendance Records</h2>
          <span className="text-sm text-stone-500">{selectedDateRecords.length} workers marked on this date</span>
        </div>
        {selectedDateRecords.length === 0 ? <p className="p-8 text-center text-sm text-stone-500">No attendance has been recorded for this date.</p> : <div className="divide-y divide-stone-100">
          {selectedDateRecords.map((record: any) => {
            const label = record.attendanceStatus === 'HALF_DAY' ? 'Half Day' : record.attendanceStatus === 'ABSENT' ? 'Absent' : 'Present';
            const badgeColor = record.attendanceStatus === 'PRESENT' ? 'bg-emerald-100 text-emerald-800' : record.attendanceStatus === 'HALF_DAY' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800';
            return <div key={record.id} className="flex items-center justify-between gap-3 px-5 py-3"><div><p className="font-semibold text-stone-800">{record.worker.name}</p><p className="text-xs text-stone-500">{record.worker.workerType === 'PERMANENT' ? 'Monthly worker' : `₹${record.worker.dailyWage}/day`}</p></div><div className="flex items-center gap-2"><span className={`rounded-full px-3 py-1 text-xs font-bold ${badgeColor}`}>{label}</span><button type="button" onClick={() => { setEditingAttendance(record); setAttendanceEditStatus(record.attendanceStatus); setErrorMsg(''); }} className="flex items-center gap-1 rounded-lg border border-stone-300 px-2.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"><Pencil className="h-3.5 w-3.5" /> Edit</button></div></div>;
          })}
        </div>}
      </section>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> {successMsg}
          </span>
          <button onClick={() => setSuccessMsg('')} className="text-xs text-stone-500 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Workers Cards & Attendance Logs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {sortedLabourers.map((worker) => (
          <div
            key={worker.id}
            className={`bg-white rounded-2xl border shadow-sm flex flex-col overflow-hidden hover:border-blue-300 transition-all ${worker.workerType === 'PERMANENT' ? 'border-violet-300 ring-1 ring-violet-100' : 'border-stone-200/90'}`}
          >
            <div className="p-5 border-b border-stone-100 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-stone-900 text-base">{worker.name}</h3>
                  <span className="text-[11px] font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded">
                    {worker.workerType.replace('_', ' ')}
                  </span>
                  {worker.workerType === 'PERMANENT' && <span className="ml-1 text-[10px] font-bold text-violet-800 bg-violet-100 px-2 py-0.5 rounded">MONTHLY · PRIORITY</span>}
                  {worker.workerType !== 'PERMANENT' && Number(worker.dailyWage) === 400 && <span className="ml-1 text-[10px] font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded">₹400 / DAY</span>}
                </div>
                <div className="text-right">
                  <span className="text-base font-extrabold text-stone-900">
                    ₹{worker.workerType === 'PERMANENT' ? (worker.monthlySalary || 0).toLocaleString() : worker.dailyWage}
                  </span>
                  <span className="text-[11px] text-stone-500 block">{worker.workerType === 'PERMANENT' ? '/ month' : '/ day (8 hrs)'}</span>
                </div>
              </div>

              {worker.phone && (
                <p className="text-xs text-stone-500 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-stone-400" /> {worker.phone}
                </p>
              )}
            </div>

            {/* Financial Ledger for this worker */}
            <div className="p-5 flex-1 space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200/60">
                  <span className="text-stone-500 block text-[11px]">Total Earned</span>
                  <span className="font-bold text-stone-900 text-sm">
                    ₹{worker.totalEarned.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-stone-400 block">{worker.totalDaysWorked} days worked</span>
                </div>
                <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200/60">
                  <span className="text-stone-500 block text-[11px]">Paid Wages</span>
                  <span className="font-bold text-blue-700 text-sm">
                    ₹{worker.totalPaid.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200/70 rounded-xl flex items-center justify-between text-xs">
                <span className="font-bold text-amber-900">Amount Still Due:</span>
                <span className="font-extrabold text-amber-950 text-sm">
                  ₹{worker.balancePending.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="pt-2">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Recent Payments</span>
                  <button type="button" onClick={() => openWagePayment(worker)} className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
                    <CreditCard className="h-3.5 w-3.5" /> Pay Wage
                  </button>
                </div>
                {worker.payments?.length ? <div className="space-y-1 text-xs">
                  {worker.payments.slice(0, 2).map((payment: any) => <div key={payment.id} className="flex items-center justify-between gap-2 rounded border border-stone-200 bg-stone-50 p-2">
                    <span className="text-stone-600">Paid on {new Date(payment.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}</span>
                    <strong className="text-blue-800">₹{Number(payment.amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong>
                  </div>)}
                </div> : <p className="rounded border border-dashed border-stone-200 p-2 text-xs text-stone-500">No wage payment recorded yet.</p>}
                <button
                  type="button"
                  aria-expanded={attendanceCalendarWorkerId === worker.id}
                  onClick={() => setAttendanceCalendarWorkerId((current) => current === worker.id ? '' : worker.id)}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-100"
                >
                  <CalendarCheck className="h-4 w-4" /> {attendanceCalendarWorkerId === worker.id ? 'Hide Monthly Attendance' : 'View Monthly Attendance'}
                </button>
                {attendanceCalendarWorkerId === worker.id && <div className="mt-3 rounded-xl border border-stone-200 bg-white p-3">
                  <div className="mb-3 flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-stone-800">{calendarMonthDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span>
                    <div className="flex items-center gap-1">
                      <button type="button" aria-label={`Previous month for ${worker.name}`} onClick={() => setAttendanceCalendarMonth((month) => shiftMonthKey(month, -1))} className="rounded-md border border-stone-300 px-2 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-50">←</button>
                      <button type="button" aria-label={`Next month for ${worker.name}`} onClick={() => setAttendanceCalendarMonth((month) => shiftMonthKey(month, 1))} className="rounded-md border border-stone-300 px-2 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-50">→</button>
                    </div>
                  </div>
                  <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-medium text-stone-600">
                    <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-emerald-500" /> Present</span>
                    <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-rose-500" /> Absent</span>
                    <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-blue-500" /> Half day</span>
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <div key={`${day}-${index}`} className="py-1 text-center text-[9px] font-bold text-stone-400">{day}</div>)}
                    {Array.from({ length: calendarStartOffset }, (_, index) => <div key={`empty-${index}`} aria-hidden="true" />)}
                    {Array.from({ length: calendarDayCount }, (_, index) => {
                      const day = index + 1;
                      const status = (worker.logs || []).find((log: any) => String(log.date).slice(0, 7) === attendanceCalendarMonth && Number(String(log.date).slice(8, 10)) === day)?.attendanceStatus;
                      const color = status === 'PRESENT' ? 'border-emerald-600 bg-emerald-500 text-white' : status === 'ABSENT' ? 'border-rose-600 bg-rose-500 text-white' : status === 'HALF_DAY' ? 'border-blue-600 bg-blue-500 text-white' : 'border-stone-200 bg-white text-stone-600';
                      const label = status === 'PRESENT' ? 'Present' : status === 'ABSENT' ? 'Absent' : status === 'HALF_DAY' ? 'Half day' : 'Not marked';
                      return <div key={day} aria-label={`${worker.name}, ${attendanceCalendarMonth}-${String(day).padStart(2, '0')}: ${label}`} title={label} className={`flex aspect-square items-center justify-center rounded-md border text-xs font-bold ${color}`}>{day}</div>;
                    })}
                  </div>
                </div>}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-stone-50 border-t border-stone-100 flex items-center justify-between">
              <span className="text-xs text-stone-500">
                {worker.emergencyContact && `Emergency: ${worker.emergencyContact}`}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Register Labourer */}
      <Modal
        isOpen={isWorkerModalOpen}
        onClose={() => setIsWorkerModalOpen(false)}
        title="Register Farm Worker / Labourer"
        subtitle="Add worker profile and wage agreement"
      >
        <form onSubmit={handleCreateWorker} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Worker Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Rameshwar Yadav"
              value={workerForm.name}
              onChange={(e) => setWorkerForm({ ...workerForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Phone Number
              </label>
              <input
                type="text"
                placeholder="+91 98261 00000"
                value={workerForm.phone}
                onChange={(e) => setWorkerForm({ ...workerForm, phone: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Worker Type
              </label>
              <select
                value={workerForm.workerType}
                onChange={(e) => setWorkerForm({ ...workerForm, workerType: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none bg-white font-medium"
              >
                <option value="DAILY_WAGE">Daily Wage (दैनिक मजदूरी)</option>
                <option value="CONTRACT">Contract / Theka (ठेका)</option>
                <option value="PERMANENT">Permanent / Monthly (स्थायी)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                {workerForm.workerType === 'PERMANENT' ? 'Monthly Salary (₹ / Month) *' : 'Daily Wage Rate (₹ / Day) *'}
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={workerForm.workerType === 'PERMANENT' ? workerForm.monthlySalary : workerForm.dailyWage}
                onChange={(e) => setWorkerForm(workerForm.workerType === 'PERMANENT' ? { ...workerForm, monthlySalary: e.target.value } : { ...workerForm, dailyWage: e.target.value })}
                placeholder={workerForm.workerType === 'PERMANENT' ? 'Monthly salary amount' : 'Daily wage amount'}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Emergency Contact
              </label>
              <input
                type="text"
                placeholder="Relative name and phone"
                value={workerForm.emergencyContact}
                onChange={(e) => setWorkerForm({ ...workerForm, emergencyContact: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsWorkerModalOpen(false)}
              className="px-4 py-2 border border-stone-300 rounded-xl text-sm font-semibold text-stone-700 hover:bg-stone-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm"
            >
              Register Worker
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Log Daily Work */}
      <Modal
        isOpen={isLogWorkModalOpen}
        onClose={() => setIsLogWorkModalOpen(false)}
        title="Log Daily Attendance"
        subtitle="Mark each active worker Present, Absent, or Half Day"
        maxWidth="2xl"
      >
        <form onSubmit={handleLogWork} className="space-y-4">
          <label className="block text-xs font-semibold text-stone-700">Attendance Date
            <input type="date" required value={logWorkForm.date} onChange={(e) => { setAttendance({}); setLogWorkForm({ ...logWorkForm, date: e.target.value }); }} className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm" />
          </label>
          <div className="space-y-2">
            {loadingAttendance && <p className="rounded-xl bg-stone-50 p-4 text-center text-sm text-stone-500">Checking attendance for this date…</p>}
            {!loadingAttendance && activeAttendanceWorkers.map((worker) => (
              <div key={worker.id} className={`rounded-xl border p-3 ${worker.workerType === 'PERMANENT' ? 'border-violet-300 bg-violet-50/60' : Number(worker.dailyWage) === 400 ? 'border-stone-200 bg-stone-50' : 'border-stone-200 bg-white'}`}>
                <p className="mb-2 font-semibold text-stone-800">{worker.name}</p>
                <p className="mb-2 text-xs text-stone-500">{worker.workerType === 'PERMANENT' ? `Monthly · ₹${Number(worker.monthlySalary || 0).toLocaleString()} ÷ ${daysInMonth(logWorkForm.date)} days = ₹${(Number(worker.monthlySalary || 0) / daysInMonth(logWorkForm.date)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}/day` : `₹${worker.dailyWage}/day`}</p>
                <div className="grid grid-cols-3 gap-2">
                  {(['PRESENT', 'ABSENT', 'HALF_DAY'] as const).map((status) => {
                    const label = status === 'HALF_DAY' ? 'Half Day' : status === 'PRESENT' ? 'Present' : 'Absent';
                    const active = attendance[worker.id] === status;
                    return <button key={status} type="button" aria-pressed={active} onClick={() => setAttendance((current) => ({ ...current, [worker.id]: status }))} className={`rounded-lg border px-2 py-2 text-sm font-semibold ${active ? (status === 'ABSENT' ? 'border-rose-600 bg-rose-600 text-white' : 'border-blue-600 bg-blue-600 text-white') : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50'}`}>{label}</button>;
                  })}
                </div>
              </div>
            ))}
            {!loadingAttendance && activeAttendanceWorkers.length === 0 && <p className="rounded-xl bg-stone-50 p-4 text-center text-sm text-stone-500">All active workers already have attendance recorded for this date.</p>}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIsLogWorkModalOpen(false)} className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700">Cancel</button>
            <button type="submit" disabled={loadingAttendance || activeAttendanceWorkers.length === 0 || !activeAttendanceWorkers.some((worker) => attendance[worker.id])} className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50">Save Attendance</button>
          </div>
        </form>
      </Modal>

      {/* Modal: Make Wage Payment */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={`Pay Wages to ${selectedWorkerForPay?.name}`}
        subtitle={`Pending balance: ₹${Number(selectedWorkerForPay?.balancePending || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`}
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Payment Amount (₹) *
              </label>
              <input
                type="number"
                required
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none font-extrabold text-base text-blue-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Payment Date *
              </label>
              <input
                type="date"
                required
                value={paymentForm.date}
                onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
              />
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
            <div className="flex justify-between gap-3"><span className="text-amber-900">Due before payment</span><strong className="text-amber-950">₹{Number(selectedWorkerForPay?.balancePending || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong></div>
            <div className="mt-1 flex justify-between gap-3"><span className="text-amber-900">Estimated due after this payment</span><strong className="text-amber-950">₹{Math.max(0, Number(selectedWorkerForPay?.balancePending || 0) - (Number(paymentForm.amount) || 0)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong></div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Payment Method
            </label>
            <select
              value={paymentForm.paymentMode}
              onChange={(e) => setPaymentForm({ ...paymentForm, paymentMode: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none bg-white font-medium"
            >
              <option value="CASH">Cash (नकद)</option>
              <option value="UPI">UPI / PhonePe / Google Pay</option>
              <option value="BANK_TRANSFER">Bank Transfer (बैंक खाता)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Remarks
            </label>
            <input
              type="text"
              placeholder="e.g. Cleared week 3 dues via cash"
              value={paymentForm.notes}
              onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(false)}
              className="px-4 py-2 border border-stone-300 rounded-xl text-sm font-semibold text-stone-700 hover:bg-stone-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm"
            >
              Confirm Payment
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(editingAttendance)}
        onClose={() => setEditingAttendance(null)}
        title="Edit Attendance"
        subtitle={editingAttendance ? `${editingAttendance.worker.name} · ${new Date(editingAttendance.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })}` : ''}
      >
        <form onSubmit={handleUpdateAttendance} className="space-y-4">
          <p className="text-sm font-semibold text-stone-700">Correct this worker’s attendance status:</p>
          <div className="grid grid-cols-3 gap-2">
            {(['PRESENT', 'ABSENT', 'HALF_DAY'] as const).map((status) => {
              const active = attendanceEditStatus === status;
              const label = status === 'HALF_DAY' ? 'Half Day' : status === 'PRESENT' ? 'Present' : 'Absent';
              const colors = status === 'PRESENT' ? 'border-emerald-600 bg-emerald-600' : status === 'ABSENT' ? 'border-rose-600 bg-rose-600' : 'border-blue-600 bg-blue-600';
              return <button key={status} type="button" aria-pressed={active} onClick={() => setAttendanceEditStatus(status)} className={`rounded-lg border px-2 py-3 text-sm font-semibold ${active ? `${colors} text-white` : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50'}`}>{label}</button>;
            })}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setEditingAttendance(null)} className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50">Cancel</button>
            <button type="submit" className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700">Save Changes</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
