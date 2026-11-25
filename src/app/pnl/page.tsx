'use client';

import React, { useState, useEffect } from 'react';
import { useFarm } from '@/context/FarmContext';
import {
  TrendingUp,
  TrendingDown,
  Printer,
  Download,
  Coins,
  Receipt,
  Layers,
  Sprout,
  Percent,
} from 'lucide-react';

export default function PnLPage() {
  const { selectedFarmId } = useFarm();
  const [pnlData, setPnlData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/pnl?farmId=${selectedFarmId}`);
      if (res.ok) {
        setPnlData(await res.json());
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

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  if (loading && !pnlData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-stone-500 font-medium text-sm">Calculating profit & loss margins...</p>
        </div>
      </div>
    );
  }

  const { cropPnl = [], fieldPnl = [], overall = {} } = pnlData || {};
  const isOverallProfit = overall.netProfit >= 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Print Report Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm no-print">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <span>Crop & Field Profit / Loss Report</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
              मुनाफा और घाटा विश्लेषण
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Precise crop-wise and field-wise net margin, cost per quintal, and profit per acre.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors shadow-sm self-start sm:self-auto"
        >
          <Printer className="w-4 h-4" /> Print / PDF Financial Statement
        </button>
      </div>

      {/* Overall Agricultural Financial Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
          <span className="text-xs font-bold text-stone-500 uppercase flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-blue-600" /> Total Farm Revenue
          </span>
          <p className="text-2xl font-extrabold text-stone-900 mt-1">
            {formatCurrency(overall.totalIncome)}
          </p>
          <p className="text-xs text-stone-500 mt-0.5">Crop sales income</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
          <span className="text-xs font-bold text-stone-500 uppercase flex items-center gap-1.5">
            <Receipt className="w-4 h-4 text-rose-500" /> Total Operating Expenses
          </span>
          <p className="text-2xl font-extrabold text-stone-900 mt-1">
            {formatCurrency(overall.totalExpenses)}
          </p>
          <p className="text-xs text-stone-500 mt-0.5">Seeds, fert, labour, fuel, lease</p>
        </div>

        <div
          className={`p-5 rounded-2xl border shadow-sm ${
            isOverallProfit ? 'bg-blue-50/70 border-blue-200' : 'bg-amber-50/70 border-amber-200'
          }`}
        >
          <span className="text-xs font-bold uppercase flex items-center gap-1.5 text-stone-700">
            {isOverallProfit ? (
              <TrendingUp className="w-4 h-4 text-blue-700" />
            ) : (
              <TrendingDown className="w-4 h-4 text-amber-700" />
            )}
            Net Agricultural Profit / Loss
          </span>
          <p
            className={`text-2xl font-black mt-1 ${
              isOverallProfit ? 'text-blue-800' : 'text-amber-900'
            }`}
          >
            {formatCurrency(overall.netProfit)}
          </p>
          <p className="text-xs text-stone-600 mt-0.5">
            {isOverallProfit ? 'Net surplus realized' : 'Current input development phase'}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
          <span className="text-xs font-bold text-stone-500 uppercase flex items-center gap-1.5">
            <Percent className="w-4 h-4 text-blue-600" /> Return on Investment (ROI)
          </span>
          <p className="text-2xl font-extrabold text-stone-900 mt-1">
            {overall.roiPercentage}%
          </p>
          <p className="text-xs text-stone-500 mt-0.5">Profit to cost ratio</p>
        </div>
      </div>

      {/* Section 1: Crop-Wise Profit and Loss */}
      <div className="bg-white rounded-2xl border border-stone-200/90 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-stone-200 bg-stone-50/60 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <Sprout className="w-4 h-4 text-blue-600" /> Crop-wise Profit & Loss (प्रति फसल लाभ/हानि)
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Breakdown of total revenue, direct expenses, net margin, and profitability per acre
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-100 text-stone-700 font-bold uppercase tracking-wider border-b border-stone-200">
              <tr>
                <th className="p-3.5">Crop Name</th>
                <th className="p-3.5">Field / Parcel</th>
                <th className="p-3.5">Area (Acres)</th>
                <th className="p-3.5">Yield (Q)</th>
                <th className="p-3.5 text-right">Income (₹)</th>
                <th className="p-3.5 text-right">Expenses (₹)</th>
                <th className="p-3.5 text-right">Net Profit / Loss</th>
                <th className="p-3.5 text-right">Profit / Acre</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {cropPnl.map((crop: any) => {
                const isProfit = crop.netProfit >= 0;

                return (
                  <tr key={crop.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="p-3.5 font-bold text-stone-900 text-sm">
                      {crop.name}
                      <span className="block text-[11px] font-semibold text-blue-700">
                        {crop.variety || 'Standard'} ({crop.season})
                      </span>
                    </td>
                    <td className="p-3.5 text-stone-700 font-medium">
                      {crop.fieldName}
                      <span className="block text-[11px] text-stone-400">{crop.farmName}</span>
                    </td>
                    <td className="p-3.5 font-extrabold text-stone-900 text-sm">
                      {crop.area} Ac
                    </td>
                    <td className="p-3.5 text-stone-800 font-bold">
                      {crop.totalYield > 0 ? `${crop.totalYield} Q` : 'Growing'}
                    </td>
                    <td className="p-3.5 text-right font-bold text-stone-900 text-sm">
                      {formatCurrency(crop.totalIncome)}
                    </td>
                    <td className="p-3.5 text-right font-bold text-stone-700">
                      {formatCurrency(crop.totalExpenses)}
                    </td>
                    <td
                      className={`p-3.5 text-right font-extrabold text-sm whitespace-nowrap ${
                        isProfit ? 'text-blue-700' : 'text-amber-700'
                      }`}
                    >
                      {formatCurrency(crop.netProfit)}
                    </td>
                    <td
                      className={`p-3.5 text-right font-extrabold whitespace-nowrap ${
                        isProfit ? 'text-blue-800' : 'text-amber-800'
                      }`}
                    >
                      {crop.area > 0 ? `${formatCurrency(crop.profitPerAcre)} / Ac` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: Field-Wise Profit and Loss */}
      <div className="bg-white rounded-2xl border border-stone-200/90 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-stone-200 bg-stone-50/60 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" /> Field-wise Profit & Loss (प्रति खेत लाभ/हानि)
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Financial performance of individual agricultural land parcels
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-100 text-stone-700 font-bold uppercase tracking-wider border-b border-stone-200">
              <tr>
                <th className="p-3.5">Field (Khet)</th>
                <th className="p-3.5">Farm</th>
                <th className="p-3.5">Total Area</th>
                <th className="p-3.5">Soil Type</th>
                <th className="p-3.5 text-right">Field Income</th>
                <th className="p-3.5 text-right">Field Expenses</th>
                <th className="p-3.5 text-right">Net Profit / Loss</th>
                <th className="p-3.5 text-right">Profit / Acre</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {fieldPnl.map((field: any) => {
                const isProfit = field.netProfit >= 0;

                return (
                  <tr key={field.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="p-3.5 font-bold text-stone-900 text-sm">
                      {field.name}
                      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                        {field.crops.map((c: any, i: number) => (
                          <span
                            key={i}
                            className="text-[10px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded"
                          >
                            {c.name} ({c.area} Ac)
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3.5 text-stone-700 font-medium">
                      {field.farmName}
                    </td>
                    <td className="p-3.5 font-extrabold text-stone-900 text-sm">
                      {field.area} Acres
                    </td>
                    <td className="p-3.5 text-stone-600 font-medium">
                      {field.soilType}
                    </td>
                    <td className="p-3.5 text-right font-bold text-stone-900 text-sm">
                      {formatCurrency(field.totalIncome)}
                    </td>
                    <td className="p-3.5 text-right font-bold text-stone-700">
                      {formatCurrency(field.totalExpenses)}
                    </td>
                    <td
                      className={`p-3.5 text-right font-extrabold text-sm whitespace-nowrap ${
                        isProfit ? 'text-blue-700' : 'text-amber-700'
                      }`}
                    >
                      {formatCurrency(field.netProfit)}
                    </td>
                    <td
                      className={`p-3.5 text-right font-extrabold whitespace-nowrap ${
                        isProfit ? 'text-blue-800' : 'text-amber-800'
                      }`}
                    >
                      {field.area > 0 ? `${formatCurrency(field.profitPerAcre)} / Ac` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
