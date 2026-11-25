'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import { Users, Package, Calendar, Coins, CheckCircle2, AlertCircle } from 'lucide-react';

interface StageActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  stageData: any;
  onSuccess: () => void;
}

export function StageActivityModal({
  isOpen,
  onClose,
  stageData,
  onSuccess,
}: StageActivityModalProps) {
  const [status, setStatus] = useState('COMPLETED');
  const [actualDate, setActualDate] = useState('');
  const [workerCount, setWorkerCount] = useState('');
  const [workDays, setWorkDays] = useState('1');
  const [wagePerDay, setWagePerDay] = useState('400');
  const [materialItems, setMaterialItems] = useState('');
  const [materialCost, setMaterialCost] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (stageData) {
      setStatus(stageData.status || 'COMPLETED');
      setActualDate(
        stageData.actualDate
          ? new Date(stageData.actualDate).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0]
      );
      setWorkerCount(stageData.workerCount ? String(stageData.workerCount) : '');
      setWorkDays(stageData.workDays ? String(stageData.workDays) : '1');
      setWagePerDay(stageData.wagePerDay ? String(stageData.wagePerDay) : '400');
      setMaterialItems(stageData.materialItems || '');
      setMaterialCost(stageData.materialCost ? String(stageData.materialCost) : '');
      setNotes(stageData.notes || '');
      setErrorMsg('');
    }
  }, [stageData]);

  const workers = parseFloat(workerCount) || 0;
  const days = parseFloat(workDays) || 0;
  const wage = parseFloat(wagePerDay) || 0;
  const calculatedLabourCost = workers * days * wage;
  const calculatedMaterialCost = parseFloat(materialCost) || 0;
  const totalStageCost = calculatedLabourCost + calculatedMaterialCost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/crops/stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cropId: stageData.cropId,
          stageNumber: stageData.stageNumber,
          status,
          actualDate,
          workerCount: workers,
          workDays: days,
          wagePerDay: wage,
          materialItems,
          materialCost: calculatedMaterialCost,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update stage activity');

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Stage ${stageData?.stageNumber}: ${stageData?.stageName}`}
      subtitle={`${stageData?.hindiName || ''} - Labour & Kharcha Record`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Status & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Stage Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 bg-white font-medium"
            >
              <option value="IN_PROGRESS">In Progress (कार्य चालू है)</option>
              <option value="COMPLETED">Completed (पूर्ण हो चुका है)</option>
              <option value="PENDING">Pending (प्रस्तावित)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Date Performed (तारीख) *
            </label>
            <input
              type="date"
              required
              value={actualDate}
              onChange={(e) => setActualDate(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40"
            />
          </div>
        </div>

        {/* Labour Section */}
        <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-blue-600" />
              1. Labour Record (मजदूरों की संख्या व मजदूरी)
            </span>
            <span className="text-xs font-bold text-blue-700">
              Labour Total: {formatCurrency(calculatedLabourCost)}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                Workers (मजदूर)
              </label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 4"
                value={workerCount}
                onChange={(e) => setWorkerCount(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-stone-300 rounded-lg text-sm bg-white font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                Days (दिन)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                placeholder="e.g. 1"
                value={workDays}
                onChange={(e) => setWorkDays(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-stone-300 rounded-lg text-sm bg-white font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                Daily Wage (₹)
              </label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 400"
                value={wagePerDay}
                onChange={(e) => setWagePerDay(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-stone-300 rounded-lg text-sm bg-white font-bold"
              />
            </div>
          </div>
        </div>

        {/* Material / Material Cost Section */}
        <div className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-100 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-amber-600" />
              2. Material Cost (सामान, खाद, बीज, पाइप, दवा)
            </span>
            <span className="text-xs font-bold text-amber-800">
              Material: {formatCurrency(calculatedMaterialCost)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                Items Used (सामग्री का विवरण व मात्रा)
              </label>
              <input
                type="text"
                placeholder="e.g. 2 Bag DAP, 4 Trolley Gobar, 2 Roll Mulch..."
                value={materialItems}
                onChange={(e) => setMaterialItems(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-stone-300 rounded-lg text-sm bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                Material Cost (₹)
              </label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 3200"
                value={materialCost}
                onChange={(e) => setMaterialCost(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-stone-300 rounded-lg text-sm bg-white font-bold text-amber-900"
              />
            </div>
          </div>
        </div>

        {/* Total Cost Summary Card */}
        <div className="flex items-center justify-between p-3 bg-stone-100 rounded-xl border border-stone-200">
          <div>
            <span className="text-xs text-stone-500 font-semibold uppercase">Total Stage Cost (कुल खर्च)</span>
            <p className="text-xs text-stone-400">Labour + Material combined</p>
          </div>
          <span className="text-xl font-black text-stone-900">
            {formatCurrency(totalStageCost)}
          </span>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            Notes / Observations (टिप्पणी)
          </label>
          <textarea
            rows={2}
            placeholder="Work completed smoothly, drip leakage checked..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/40"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-stone-200/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-stone-300 rounded-xl text-xs font-semibold text-stone-700 hover:bg-stone-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            {loading ? 'Saving...' : 'Save Stage Activity & Cost'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
