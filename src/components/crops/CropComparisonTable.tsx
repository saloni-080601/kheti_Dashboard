'use client';

import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Coins,
  Scale,
  Receipt,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

interface CropComparisonTableProps {
  crops: any[];
}

export function CropComparisonTable({ crops }: CropComparisonTableProps) {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const chartData = crops.map((c) => ({
    name: c.name.split(' ')[0], // e.g. "Cucumber", "Tomato"
    kharcha: c.totalExpenses || c.totalExpense || 0,
    kamai: c.totalIncome || 0,
    profit: (c.totalIncome || 0) - (c.totalExpenses || c.totalExpense || 0),
  }));

  return (
    <div className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
        <div>
          <h3 className="text-base font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <span>Horticulture Multi-Crop Comparison</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
              फसल तुलना (खेती vs कमाई)
            </span>
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Compare Kheera, Tamatar, Mirchi on investment, yield (kg/acre), average rate, and net profit.
          </p>
        </div>
      </div>

      {/* Comparison Chart */}
      {crops.length > 0 && (
        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
              <YAxis
                stroke="#64748b"
                fontSize={10}
                tickFormatter={(v) => `₹${Number(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
              />
              <Tooltip
                formatter={(val: any) => formatCurrency(Number(val))}
                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
              <Bar dataKey="kharcha" name="Total Lagat (₹)" fill="#f97316" radius={[4, 4, 0, 0]} />
              <Bar dataKey="kamai" name="Mandi Kamai (₹)" fill="#2563eb" radius={[4, 4, 0, 0]} />
              <Bar dataKey="profit" name="Net Munafa (₹)" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Comparison Detailed Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-stone-200 text-stone-600 font-bold bg-stone-50">
              <th className="py-2.5 px-3">Crop / Fasal</th>
              <th className="py-2.5 px-3">Area</th>
              <th className="py-2.5 px-3">Stage</th>
              <th className="py-2.5 px-3">Total Yield (Kg)</th>
              <th className="py-2.5 px-3">Yield / Acre</th>
              <th className="py-2.5 px-3">Avg Rate (₹/Kg)</th>
              <th className="py-2.5 px-3">Total Lagat (₹)</th>
              <th className="py-2.5 px-3">Net Earning (₹)</th>
              <th className="py-2.5 px-3">Net Munafa (₹)</th>
              <th className="py-2.5 px-3">Profit / Acre</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 font-medium">
            {crops.map((c) => {
              const totalExp = c.totalExpenses || c.totalExpense || 0;
              const totalInc = c.totalIncome || 0;
              const netProfit = totalInc - totalExp;
              const profitAcre = c.area > 0 ? netProfit / c.area : 0;
              const isProfit = netProfit >= 0;
              const yieldKg = c.totalHarvestKg || c.totalHarvestedKg || 0;
              const yieldAcre = c.area > 0 ? yieldKg / c.area : 0;
              const avgRate = c.avgRatePerKg || c.avgRealizedRatePerKg || 0;

              return (
                <tr key={c.id} className="hover:bg-blue-50/40 transition-colors">
                  <td className="py-3 px-3">
                    <span className="font-bold text-stone-900 block">{c.name}</span>
                    <span className="text-[10px] text-stone-400 font-normal">
                      {c.field?.name ? `Field: ${c.field.name}` : ''}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-semibold text-stone-700">{c.area} Ac</td>
                  <td className="py-3 px-3">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                      Stage {c.currentStageNumber || 1}: {c.currentStageName || 'Growing'}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-bold text-stone-900">
                    {yieldKg.toLocaleString('en-IN')} kg
                  </td>
                  <td className="py-3 px-3 text-stone-600">
                    {yieldAcre > 0 ? `${Math.round(yieldAcre).toLocaleString('en-IN')} kg/ac` : '-'}
                  </td>
                  <td className="py-3 px-3 font-bold text-blue-900">
                    {avgRate > 0 ? `₹${avgRate.toFixed(1)}/kg` : '-'}
                  </td>
                  <td className="py-3 px-3 font-semibold text-amber-900">
                    {formatCurrency(totalExp)}
                  </td>
                  <td className="py-3 px-3 font-semibold text-emerald-900">
                    {formatCurrency(totalInc)}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`font-black flex items-center gap-1 ${
                        isProfit ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {isProfit ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      {formatCurrency(netProfit)}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-semibold text-stone-700">
                    {formatCurrency(profitAcre)}/ac
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
