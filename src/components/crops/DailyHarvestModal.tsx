'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import { Scale, Package, Users, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';

interface DailyHarvestModalProps {
  isOpen: boolean;
  onClose: () => void;
  crop: any;
  onSuccess: () => void;
}

export function DailyHarvestModal({
  isOpen,
  onClose,
  crop,
  onSuccess,
}: DailyHarvestModalProps) {
  const [harvestDate, setHarvestDate] = useState(new Date().toISOString().split('T')[0]);
  const [quantity, setQuantity] = useState('');
  const [cratesCount, setCratesCount] = useState('');
  const [grade, setGrade] = useState('Grade A');
  const [labourCount, setLabourCount] = useState('');
  const [storageLocation, setStorageLocation] = useState('Farm Packing Yard');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setHarvestDate(new Date().toISOString().split('T')[0]);
      setQuantity('');
      setCratesCount('');
      setGrade('Grade A');
      setLabourCount('');
      setNotes('');
      setErrorMsg('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/harvest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RECORD_HARVEST',
          cropId: crop?.id,
          fieldId: crop?.fieldId,
          harvestDate,
          quantity: parseFloat(quantity),
          unit: 'Kg',
          grade,
          cratesCount: parseInt(cratesCount, 10) || 0,
          labourCount: parseInt(labourCount, 10) || 0,
          storageLocation,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record harvest picking');

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
      title={`Daily Harvest (तुड़ाई) Entry: ${crop?.name}`}
      subtitle={`Field: ${crop?.field?.name} - Record picking in Kg & Crates`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Harvest Date (तुड़ाई तारीख) *
            </label>
            <input
              type="date"
              required
              value={harvestDate}
              onChange={(e) => setHarvestDate(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Grade / Quality (ग्रेड)
            </label>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 bg-white font-medium"
            >
              <option value="Grade A">Grade A (सुपर क्वालिटी - No blemish)</option>
              <option value="Grade B">Grade B (मीडियम)</option>
              <option value="Mixed">Mixed / All Grades</option>
            </select>
          </div>
        </div>

        {/* Quantity & Crates */}
        <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-emerald-600" />
              Quantity Harvested (वज़न व क्रेट्स)
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                Weight in Kg (किलो) *
              </label>
              <input
                type="number"
                step="0.5"
                min="1"
                required
                placeholder="e.g. 450"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-base font-black text-emerald-900 bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                Number of Crates (क्रेट्स की संख्या)
              </label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 18"
                value={cratesCount}
                onChange={(e) => setCratesCount(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-base font-bold text-stone-900 bg-white"
              />
            </div>
          </div>
        </div>

        {/* Labour & Storage */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Picking Labour Count (तुड़ाई मजदूर)
            </label>
            <input
              type="number"
              min="0"
              placeholder="e.g. 6"
              value={labourCount}
              onChange={(e) => setLabourCount(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Packing / Storage Location
            </label>
            <input
              type="text"
              placeholder="e.g. Farm Shed, Ready for Mandi"
              value={storageLocation}
              onChange={(e) => setStorageLocation(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            Notes / Fruit Condition
          </label>
          <input
            type="text"
            placeholder="e.g. Good luster, 2nd picking of the season"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs"
          />
        </div>

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
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            {loading ? 'Recording...' : 'Record Daily Harvest'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
