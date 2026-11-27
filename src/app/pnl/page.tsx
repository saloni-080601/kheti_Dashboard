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
  Sprout,
  Percent,
} from 'lucide-react';

export default function PnLPage() {
  const { selectedFarmId } = useFarm();
  const [pnlData, setPnlData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCropId, setSelectedCropId] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/pnl?farmId=${selectedFarmId}`);
      if (res.ok) {
        const data = await res.json();
        setPnlData(data);
        setSelectedCropId((current) => data.cropPnl.some((crop: any) => crop.id === current) ? current : data.cropPnl[0]?.id || '');
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

  const { cropPnl = [], overall = {} } = pnlData || {};
  const isOverallProfit = overall.netProfit >= 0;
  const selectedCrop = cropPnl.find((crop: any) => crop.id === selectedCropId);
  const selectedCropHistory = selectedCrop?.salesHistory || [];
  const selectedCropUnit = selectedCrop && /tomato|टमाटर/i.test(selectedCrop.name) ? 'crates' : 'kg';
  const productionProgress = selectedCrop?.targetYield > 0
    ? Math.min(100, ((selectedCrop.actualProduction || 0) / selectedCrop.targetYield) * 100)
    : 0;
  const formatDate = (value: string) => new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));


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

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-stone-900">Crop-wise Sales History</h2>
          <p className="mt-1 text-xs text-stone-500">Choose a crop to see every dated sale, quantity, rate, and deduction.</p>
        </div>
        {cropPnl.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {cropPnl.map((crop: any) => (
              <button
                key={crop.id}
                type="button"
                onClick={() => setSelectedCropId(crop.id)}
                aria-pressed={selectedCropId === crop.id}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-semibold transition-colors ${
                  selectedCropId === crop.id
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-stone-200 bg-white text-stone-700 hover:border-blue-300 hover:bg-blue-50'
                }`}
              >
                <Sprout className="h-4 w-4" />
                <span>{crop.name}<span className="block text-xs font-normal opacity-80">{crop.fieldName}</span></span>
              </button>
            ))}
          </div>
        ) : <p className="mt-4 text-sm text-stone-500">No crops are available for this farm.</p>}

        {selectedCrop && (
          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                <p className="text-xs text-stone-500">Crop Net Sales Income</p>
                <p className="mt-1 font-bold text-stone-900">{formatCurrency(selectedCrop.totalIncome)}</p>
              </div>
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                <p className="text-xs text-stone-500">Crop Expenses</p>
                <p className="mt-1 font-bold text-stone-900">{formatCurrency(selectedCrop.totalExpenses)}</p>
              </div>
              <div className={`rounded-xl border p-3 ${selectedCrop.netProfit >= 0 ? 'border-blue-200 bg-blue-50' : 'border-amber-200 bg-amber-50'}`}>
                <p className="text-xs text-stone-500">Net Profit / Loss</p>
                <p className="mt-1 font-bold text-stone-900">{formatCurrency(selectedCrop.netProfit)}</p>
              </div>
            </div>

            <div>
              <div className="mb-1 text-right text-sm font-bold text-blue-700">{Math.round(productionProgress)}%</div>
              <div
                role="progressbar"
                aria-label={`${selectedCrop.name} production progress`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(productionProgress)}
                className="h-3 w-full overflow-hidden rounded-full bg-stone-100"
              >
                <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${productionProgress}%` }} />
              </div>
              <div className="mt-2 flex flex-wrap justify-between gap-1 text-xs text-stone-600">
                <span>Actual: {(selectedCrop.actualProduction || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })} {selectedCropUnit}</span>
                <span>Target: {selectedCrop.targetYield > 0 ? `${Number(selectedCrop.targetYield).toLocaleString('en-IN', { maximumFractionDigits: 2 })} ${selectedCropUnit}` : `Not set (${selectedCropUnit})`}</span>
              </div>
            </div>

            {selectedCropHistory.length ? (
              <div className="overflow-x-auto rounded-xl border border-stone-200">
                <table className="w-full min-w-[1080px] text-left text-sm">
                  <thead className="border-b border-stone-200 bg-stone-50 text-xs text-stone-600">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Source</th>
                      <th className="px-3 py-2 text-right">Quantity</th>
                      <th className="px-3 py-2">Sale lines (quantity × rate)</th>
                      <th className="px-3 py-2 text-right">Gross</th>
                      <th className="px-3 py-2 text-right">Transport</th>
                      <th className="px-3 py-2 text-right">Hamali</th>
                      <th className="px-3 py-2 text-right">Commission</th>
                      <th className="px-3 py-2 text-right">Other deductions</th>
                      <th className="px-3 py-2 text-right">Net sale</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {selectedCropHistory.map((row: any) => {
                      const quantity = row.entries.reduce((sum: number, entry: any) => sum + entry.productionKg, 0);
                      const gross = row.grossAmount ?? row.entries.reduce((sum: number, entry: any) => sum + entry.productionKg * entry.ratePerKg, 0);
                      const otherDeductions = row.otherDeductions || 0;
                      const net = row.netAmount ?? gross - row.transportCost - row.hamaliCost - row.commissionCost - otherDeductions;
                      const unit = row.unit || selectedCropUnit;
                      return (
                        <tr key={row.id}>
                          <td className="px-3 py-3 whitespace-nowrap">{formatDate(row.entryDate)}</td>
                          <td className="px-3 py-3">
                            <span>{row.source}</span>
                            {(row.buyerName || row.mandiName) && <span className="block text-xs text-stone-500">{row.buyerName || row.mandiName}</span>}
                          </td>
                          <td className="px-3 py-3 text-right font-semibold">{quantity.toLocaleString('en-IN')} {unit}</td>
                          <td className="px-3 py-3">
                            {row.entries.map((entry: any, index: number) => (
                              <p key={`${row.id}-${index}`} className="whitespace-nowrap">
                                {entry.productionKg.toLocaleString('en-IN')} {unit} × {formatCurrency(entry.ratePerKg)} = {formatCurrency(entry.productionKg * entry.ratePerKg)}
                              </p>
                            ))}
                          </td>
                          <td className="px-3 py-3 text-right">{formatCurrency(gross)}</td>
                          <td className="px-3 py-3 text-right">{formatCurrency(row.transportCost)}</td>
                          <td className="px-3 py-3 text-right">{formatCurrency(row.hamaliCost)}</td>
                          <td className="px-3 py-3 text-right">{formatCurrency(row.commissionCost)}</td>
                          <td className="px-3 py-3 text-right">{formatCurrency(otherDeductions)}</td>
                          <td className="px-3 py-3 text-right font-bold">{formatCurrency(net)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : <p className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-4 text-center text-sm text-stone-500">No sales history recorded for this crop yet.</p>}
          </div>
        )}
      </section>

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

    </div>
  );
}
