'use client';

import React, { useState, useEffect } from 'react';
import { useFarm } from '@/context/FarmContext';
import { Modal } from '@/components/common/Modal';
import {
  Droplets,
  Plus,
  Clock,
  Zap,
  Fuel,
  Coins,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

export default function IrrigationPage() {
  const { selectedFarmId } = useFarm();
  const [logs, setLogs] = useState<any[]>([]);
  const [farms, setFarms] = useState<any[]>([]);
  const [fields, setFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    farmId: '',
    fieldId: '',
    date: new Date().toISOString().split('T')[0],
    source: 'Canal',
    durationHours: '8',
    electricityUnits: '0',
    fuelLitres: '0',
    cost: '0',
    notes: '',
  });

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [irrRes, farmsRes, fieldsRes] = await Promise.all([
        fetch(`/api/irrigation?farmId=${selectedFarmId}`),
        fetch('/api/farms'),
        fetch(`/api/fields?farmId=${selectedFarmId}`),
      ]);

      if (irrRes.ok && farmsRes.ok && fieldsRes.ok) {
        const irrData = await irrRes.json();
        const farmsData = await farmsRes.json();
        const fieldsData = await fieldsRes.json();

        setLogs(irrData);
        setFarms(farmsData);
        setFields(fieldsData);

        if (farmsData.length > 0 && !form.farmId) {
          setForm((prev) => ({
            ...prev,
            farmId: farmsData[0].id,
            fieldId: fieldsData[0]?.id || '',
          }));
        }
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await fetch('/api/irrigation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record irrigation log');

      setSuccessMsg('Irrigation event recorded!');
      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const totalHoursAll = logs.reduce((s, l) => s + l.durationHours, 0);
  const totalCostAll = logs.reduce((s, l) => s + l.cost, 0);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <span>Irrigation & Water Management</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
              सिंचाई व जल प्रबंधन
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Track canal rotation schedules, tubewell hours, electricity units, and irrigation costs.
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg('');
            setIsModalOpen(true);
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors shadow-sm shadow-blue-700/20"
        >
          <Plus className="w-4 h-4" /> Log Irrigation (सिंचाई दर्ज करें)
        </button>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
          <span className="text-xs font-bold text-stone-500 uppercase">Irrigation Events</span>
          <p className="text-2xl font-black text-stone-900 mt-1">{logs.length} Cycles</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
          <span className="text-xs font-bold text-stone-500 uppercase">Total Watering Hours</span>
          <p className="text-2xl font-black text-blue-700 mt-1">{totalHoursAll.toFixed(1)} hrs</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 shadow-sm">
          <span className="text-xs font-bold text-blue-800 uppercase">Total Irrigation Cost</span>
          <p className="text-2xl font-black text-blue-950 mt-1">₹{totalCostAll.toLocaleString()}</p>
        </div>
      </div>

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

      {/* Irrigation Log Table */}
      <div className="bg-white rounded-2xl border border-stone-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-600 font-semibold uppercase tracking-wider border-b border-stone-200">
              <tr>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Field (Khet)</th>
                <th className="p-3.5">Source</th>
                <th className="p-3.5">Duration</th>
                <th className="p-3.5">Power / Fuel</th>
                <th className="p-3.5">Cost (₹)</th>
                <th className="p-3.5">Observations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-stone-50/60 transition-colors">
                  <td className="p-3.5 font-medium text-stone-900">
                    {new Date(log.date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="p-3.5 font-bold text-stone-800">
                    {log.field?.name}
                    <span className="block text-[11px] font-normal text-stone-400">
                      {log.farm?.name}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span className="inline-flex items-center gap-1 font-semibold text-blue-900 bg-blue-50 px-2 py-0.5 rounded">
                      <Droplets className="w-3 h-3 text-blue-600" />
                      {log.source}
                    </span>
                  </td>
                  <td className="p-3.5 font-extrabold text-stone-900">
                    {log.durationHours} hrs
                  </td>
                  <td className="p-3.5 text-stone-600">
                    {log.electricityUnits > 0 && `${log.electricityUnits} kWh`}
                    {log.fuelLitres > 0 && `${log.fuelLitres} L diesel`}
                    {!log.electricityUnits && !log.fuelLitres && 'Gravity / Canal'}
                  </td>
                  <td className="p-3.5 font-bold text-stone-900">
                    {log.cost > 0 ? `₹${log.cost.toLocaleString()}` : 'Free / Gravity'}
                  </td>
                  <td className="p-3.5 text-stone-500 italic">
                    {log.notes || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Log Irrigation */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Log Irrigation Event"
        subtitle="Watering hours and associated electricity/canal cess"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Farm *
              </label>
              <select
                value={form.farmId}
                onChange={(e) => setForm({ ...form, farmId: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none bg-white font-medium"
              >
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Field (Khet) *
              </label>
              <select
                value={form.fieldId}
                onChange={(e) => setForm({ ...form, fieldId: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none bg-white font-medium"
              >
                {fields.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Water Source *
              </label>
              <select
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none bg-white font-medium"
              >
                <option value="Canal">Canal (नहर)</option>
                <option value="Tubewell">Tubewell (नलकूप)</option>
                <option value="Borewell">Borewell (बोरवेल)</option>
                <option value="Drip System">Drip System (ड्रिप)</option>
                <option value="Sprinkler">Sprinkler (फव्वारा)</option>
                <option value="River Lift">River Lift (नदी लिफ्ट)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Duration (Hours) *
              </label>
              <input
                type="number"
                step="0.5"
                required
                value={form.durationHours}
                onChange={(e) => setForm({ ...form, durationHours: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Electricity / Fuel Cost (₹)
              </label>
              <input
                type="number"
                placeholder="e.g. 450"
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Electricity Units / Fuel Litres
              </label>
              <input
                type="number"
                step="0.5"
                placeholder="Units / Litres"
                value={form.electricityUnits}
                onChange={(e) => setForm({ ...form, electricityUnits: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Watering Remarks
            </label>
            <input
              type="text"
              placeholder="e.g. First Kor watering at CR1 tillering stage"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-stone-300 rounded-xl text-sm font-semibold text-stone-700 hover:bg-stone-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm"
            >
              Save Irrigation Log
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
