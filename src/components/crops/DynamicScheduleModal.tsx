'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import { Calendar, Clock, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { addDays, format } from 'date-fns';
import { calculateDynamicStageDates } from '@/lib/horticulture';

interface DynamicScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  crop: any;
  onSuccess: () => void;
}

export function DynamicScheduleModal({
  isOpen,
  onClose,
  crop,
  onSuccess,
}: DynamicScheduleModalProps) {
  const [sowingDate, setSowingDate] = useState('');
  const [estDaysToHarvest, setEstDaysToHarvest] = useState('35');
  const [actualFirstHarvest, setActualFirstHarvest] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (crop) {
      setSowingDate(
        crop.sowingDate
          ? new Date(crop.sowingDate).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0]
      );
      setEstDaysToHarvest(String(crop.estDaysToHarvest || 35));
      setActualFirstHarvest(
        crop.actualFirstHarvest
          ? new Date(crop.actualFirstHarvest).toISOString().split('T')[0]
          : ''
      );
      setErrorMsg('');
    }
  }, [crop]);

  const daysNum = parseInt(estDaysToHarvest, 10) || 35;
  const baseDate = sowingDate ? new Date(sowingDate) : new Date();

  // Dynamic preview of recalculated stages
  const calculatedStages = calculateDynamicStageDates({
    sowingDate: baseDate,
    cropName: crop?.name || '',
    estDaysToHarvest: daysNum,
    actualPlantingDate: baseDate,
    actualFirstHarvestDate: actualFirstHarvest ? new Date(actualFirstHarvest) : null,
    existingStages: crop?.stages || [],
  });

  const expectedFirstHarvestDate = calculatedStages.find((s) => s.stageNumber === 8)?.expectedDate;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/crops', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: crop.id,
          sowingDate,
          estDaysToHarvest: daysNum,
          actualFirstHarvest: actualFirstHarvest || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update schedule');

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Editable Crop Schedule: ${crop?.name}`}
      subtitle={`Adjust planting date & estimates - schedule adjusts automatically`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Inputs for schedule tuning */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Planting / Sowing Date *
            </label>
            <input
              type="date"
              required
              value={sowingDate}
              onChange={(e) => setSowingDate(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40"
            />
            <p className="text-[10px] text-stone-400 mt-1">Base starting anchor</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Est. Days to 1st Harvest *
            </label>
            <input
              type="number"
              min="15"
              max="150"
              required
              value={estDaysToHarvest}
              onChange={(e) => setEstDaysToHarvest(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm font-bold text-blue-900 focus:ring-2 focus:ring-blue-500/40"
            />
            <p className="text-[10px] text-stone-400 mt-1">e.g. 35 for kheera, 70 for tamatar</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Actual 1st Harvest Date
            </label>
            <input
              type="date"
              value={actualFirstHarvest}
              onChange={(e) => setActualFirstHarvest(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40"
            />
            <p className="text-[10px] text-stone-400 mt-1">If 1st picking already happened</p>
          </div>
        </div>

        {/* Live Auto-Recalibration Preview */}
        <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Live Recalibrated Timeline (Auto-Adjusted)
            </span>
            <span className="text-xs font-bold text-blue-700">
              Expected Harvest:{' '}
              {expectedFirstHarvestDate ? format(expectedFirstHarvestDate, 'dd MMM yyyy') : '-'}
            </span>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {calculatedStages.map((st) => (
              <div
                key={st.stageNumber}
                className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-white/80 border border-blue-100"
              >
                <span className="font-semibold text-stone-800">
                  #{st.stageNumber} {st.stageName}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-stone-500 font-mono">
                    Day {st.estDaysOffset >= 0 ? `+${st.estDaysOffset}` : st.estDaysOffset}
                  </span>
                  <span className="text-[11px] font-bold text-blue-800">
                    {st.expectedDate ? format(new Date(st.expectedDate), 'dd MMM yyyy') : '-'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
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
            {loading ? 'Recalibrating...' : 'Save & Adjust Schedule'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
