'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BarChart3, Coins, Receipt, Sprout, TrendingUp, Truck, Users, type LucideIcon } from 'lucide-react';
import { useFarm } from '@/context/FarmContext';

type CropSummary = {
  id: string;
  name: string;
  field: string;
  sowingDate: string;
  totalProduction: number;
  averageRate: number;
  grossSales: number;
  hamali: number;
  transport: number;
  commission: number;
  netIncome: number;
};

type DashboardData = {
  totals: { grossSales: number; hamali: number; transport: number; commission: number; netIncome: number };
  crops: CropSummary[];
};

type DailyFinancials = {
  days: number;
  revenueTotal: number;
  averageDailyRevenue: number;
  expenseTotal: number;
  averageDailyExpense: number;
  categories: Record<string, number>;
};

function todayInIndia() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function cropLabel(name: string) {
  if (/cucumber|kheera|खीरा/i.test(name)) return 'Cucumber';
  if (/tomato|टमाटर/i.test(name)) return 'Tomato';
  if (/chilli|chili|मिर्च/i.test(name)) return 'Chilli';
  return name;
}

function cropUnit(name: string) {
  return /tomato|टमाटर/i.test(name) ? 'crates' : 'kg';
}

export default function DashboardPage() {
  const { selectedFarmId } = useFarm();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDailyFinancials, setShowDailyFinancials] = useState(false);
  const [period, setPeriod] = useState(() => {
    const today = todayInIndia();
    return { startDate: `${today.slice(0, 4)}-01-01`, endDate: today };
  });
  const [dailyFinancials, setDailyFinancials] = useState<DailyFinancials | null>(null);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyError, setDailyError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/dashboard/crop-summary?farmId=${selectedFarmId}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to load dashboard.');
        if (active) setData(result);
      } catch (err: any) {
        if (active) setError(err.message || 'Unable to load dashboard.');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [selectedFarmId]);

  useEffect(() => {
    if (!showDailyFinancials) return;
    let active = true;
    const loadDailyFinancials = async () => {
      setDailyLoading(true);
      setDailyError('');
      try {
        const params = new URLSearchParams({ farmId: selectedFarmId, ...period });
        const response = await fetch(`/api/dashboard/daily-financials?${params.toString()}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to load daily averages.');
        if (active) setDailyFinancials(result);
      } catch (err: any) {
        if (active) setDailyError(err.message || 'Unable to load daily averages.');
      } finally {
        if (active) setDailyLoading(false);
      }
    };
    loadDailyFinancials();
    return () => { active = false; };
  }, [selectedFarmId, showDailyFinancials, period]);

  const currency = (amount: number) => new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 2,
  }).format(amount || 0);
  const date = (value: string) => new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(value));

  return (
    <main className="mx-auto max-w-6xl space-y-6 pb-12">
      <header className="flex flex-col justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-stone-900"><Sprout className="h-6 w-6 text-blue-600" /> Crop Income Dashboard</h1>
          <p className="mt-1 text-sm text-stone-500">All-time totals from Crop Management records.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" aria-expanded={showDailyFinancials} onClick={() => setShowDailyFinancials((visible) => !visible)} className="flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100">
            <BarChart3 className="h-4 w-4" /> Daily Revenue & Expense
          </button>
          <Link href="/crops" className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
            Open Crop Management <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>}

      {showDailyFinancials && <section className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-lg font-bold text-emerald-950">Daily Average Revenue & Expense</h2>
            <p className="mt-1 text-sm text-emerald-800">All crops combined · average uses every calendar day in the selected period.</p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs font-semibold text-stone-700">From<input type="date" value={period.startDate} max={period.endDate} onChange={(event) => setPeriod((value) => ({ ...value, startDate: event.target.value }))} className="mt-1 block rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm" /></label>
            <label className="text-xs font-semibold text-stone-700">To<input type="date" value={period.endDate} min={period.startDate} max={todayInIndia()} onChange={(event) => setPeriod((value) => ({ ...value, endDate: event.target.value }))} className="mt-1 block rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm" /></label>
          </div>
        </div>
        {dailyError && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{dailyError}</p>}
        {dailyLoading && <p className="text-sm text-stone-500">Calculating selected period…</p>}
        {dailyFinancials && !dailyLoading && <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <DashboardMetric title="Average Revenue / Day" value={currency(dailyFinancials.averageDailyRevenue)} icon={Coins} primary />
            <DashboardMetric title="Average Expense / Day" value={currency(dailyFinancials.averageDailyExpense)} icon={Receipt} />
            <DashboardMetric title="Total Revenue · Period" value={currency(dailyFinancials.revenueTotal)} icon={Coins} />
            <DashboardMetric title="Total Expense · Period" value={currency(dailyFinancials.expenseTotal)} icon={Receipt} />
            <DashboardMetric title="Net Profit · Period" value={currency(dailyFinancials.revenueTotal - dailyFinancials.expenseTotal)} icon={TrendingUp} primary />
          </div>
          <div className="rounded-xl border border-emerald-100 bg-white p-4">
            <div className="mb-2 flex items-center justify-between text-sm"><h3 className="font-bold text-stone-800">Expense breakdown</h3><span className="text-stone-500">{dailyFinancials.days} days</span></div>
            <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(dailyFinancials.categories).sort(([a], [b]) => a.localeCompare(b)).map(([category, amount]) => <div key={category} className="flex items-center justify-between gap-3 rounded-lg bg-stone-50 px-3 py-2"><span className="text-stone-600">{category === 'LABOUR' ? 'Labour' : category === 'FERTILIZERS' ? 'Fertilizer' : category === 'PESTICIDES' ? 'Spray / Pesticide' : category.replaceAll('_', ' ')}</span><span className="text-right"><strong className="block text-stone-900">{currency(amount)}</strong><span className="text-xs text-stone-500">{currency(amount / dailyFinancials.days)} / day</span></span></div>)}
              {!Object.keys(dailyFinancials.categories).length && <p className="text-stone-500">No expenses recorded for this period.</p>}
            </div>
          </div>
        </>}
      </section>}

      {loading && !data ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center text-stone-500">Loading crop totals…</div>
      ) : data && (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <DashboardMetric title="Total Net Income" value={currency(data.totals.netIncome)} icon={Coins} primary />
            <DashboardMetric title="Gross Sales" value={currency(data.totals.grossSales)} icon={Receipt} />
            <DashboardMetric title="Total Hamali" value={currency(data.totals.hamali)} icon={Users} />
            <DashboardMetric title="Total Transport" value={currency(data.totals.transport)} icon={Truck} />
            <DashboardMetric title="Total Commission" value={currency(data.totals.commission)} icon={Receipt} />
          </section>

          <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50 px-5 py-4">
              <div>
                <h2 className="font-bold text-stone-900">Crop-wise Income</h2>
                <p className="mt-0.5 text-xs text-stone-500">Each planting cycle is listed separately.</p>
              </div>
              <span className="text-sm text-stone-500">{data.crops.length} crop cycles</span>
            </div>

            {data.crops.length === 0 ? (
              <div className="p-12 text-center">
                <p className="font-semibold text-stone-800">No crops added yet</p>
                <p className="mt-1 text-sm text-stone-500">Add a crop in Crop Management to see income here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="border-b border-stone-200 text-xs text-stone-500">
                    <tr>
                      <th className="px-4 py-3">Crop / Plot</th>
                      <th className="px-4 py-3">Planting Date</th>
                      <th className="px-4 py-3 text-right">Total Production</th>
                      <th className="px-4 py-3 text-right">Average Rate</th>
                      <th className="px-4 py-3 text-right">Gross Sales</th>
                      <th className="px-4 py-3 text-right">Net Income</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {data.crops.map((crop) => (
                      <tr key={crop.id} className="hover:bg-stone-50">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-stone-900">{cropLabel(crop.name)}</p>
                          <p className="text-xs text-stone-500">{crop.field}</p>
                        </td>
                        <td className="px-4 py-3 text-stone-600">{date(crop.sowingDate)}</td>
                        <td className="px-4 py-3 text-right font-medium">{crop.totalProduction.toLocaleString('en-IN')} {cropUnit(crop.name)}</td>
                        <td className="px-4 py-3 text-right">{currency(crop.averageRate)} / {cropUnit(crop.name) === 'crates' ? 'crate' : 'kg'}</td>
                        <td className="px-4 py-3 text-right">{currency(crop.grossSales)}</td>
                        <td className="px-4 py-3 text-right font-bold text-blue-700">{currency(crop.netIncome)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}

function DashboardMetric({ title, value, icon: Icon, primary = false }: {
  title: string;
  value: string;
  icon: LucideIcon;
  primary?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${primary ? 'border-blue-200 bg-blue-50' : 'border-stone-200 bg-white'}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{title}</p>
        <Icon className={`h-5 w-5 ${primary ? 'text-blue-600' : 'text-stone-400'}`} />
      </div>
      <p className={`mt-2 text-2xl font-black ${primary ? 'text-blue-800' : 'text-stone-900'}`}>{value}</p>
    </div>
  );
}
