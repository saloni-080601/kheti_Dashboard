'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useFarm } from '@/context/FarmContext';
import { Bug, Plus, Sprout } from 'lucide-react';

type CropOption = { id: string; name: string; farmId: string; fieldId?: string; field?: { name: string } };
type SprayRecord = {
  id: string;
  cropId: string | null;
  title: string;
  date: string;
  notes?: string | null;
  crop?: CropOption | null;
  field?: { name: string } | null;
};

const englishCropName = (name: string) => {
  if (/cucumber|kheera|खीरा/i.test(name)) return 'Cucumber';
  if (/tomato|टमाटर/i.test(name)) return 'Tomato';
  if (/chilli|chili|मिर्च/i.test(name)) return 'Chilli';
  return name;
};

const todayInIndia = () => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
};

export default function SpraysPage() {
  const { selectedFarmId } = useFarm();
  const [crops, setCrops] = useState<CropOption[]>([]);
  const [records, setRecords] = useState<SprayRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [cropFilter, setCropFilter] = useState('ALL');
  const [form, setForm] = useState({ cropId: '', sprayName: '', date: todayInIndia(), cost: '', notes: '' });

  const loadData = async () => {
    setLoading(true);
    try {
      const [activitiesRes, cropsRes] = await Promise.all([
        fetch(`/api/activities?farmId=${selectedFarmId}`),
        fetch(`/api/crops?farmId=${selectedFarmId}`),
      ]);
      if (!activitiesRes.ok || !cropsRes.ok) throw new Error('Unable to load spray records.');
      const activities = await activitiesRes.json();
      const cropList = await cropsRes.json();
      setRecords(activities.filter((activity: any) => activity.activityType === 'PESTICIDE'));
      setCrops(cropList);
      setForm((current) => ({ ...current, cropId: current.cropId || cropList[0]?.id || '' }));
    } catch (err: any) {
      setError(err.message || 'Unable to load spray records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [selectedFarmId]);

  const visibleRecords = useMemo(() => records.filter((record) =>
    (selectedFarmId === 'ALL' || record.crop?.farmId === selectedFarmId) &&
    (cropFilter === 'ALL' || record.cropId === cropFilter)
  ), [records, selectedFarmId, cropFilter]);

  const addSpray = async (event: React.FormEvent) => {
    event.preventDefault();
    const crop = crops.find((item) => item.id === form.cropId);
    if (!crop || !form.sprayName.trim()) {
      setError('Choose a crop and enter a spray name.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmId: crop.farmId,
          fieldId: crop.fieldId || null,
          cropId: crop.id,
          title: form.sprayName.trim(),
          activityType: 'PESTICIDE',
          date: form.date,
          cost: Number(form.cost) || 0,
          status: 'COMPLETED',
          notes: form.notes.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to save spray record.');
      setForm((current) => ({ ...current, sprayName: '', cost: '', notes: '' }));
      setShowForm(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Unable to save spray record.');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (date: string) => new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
  }).format(new Date(date));

  return (
    <main className="mx-auto max-w-5xl space-y-5 pb-12">
      <header className="flex flex-col justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-stone-900"><Bug className="h-6 w-6 text-blue-600" /> Spray Log</h1>
          <p className="mt-1 text-sm text-stone-500">View and record spray dates by crop.</p>
        </div>
        <button onClick={() => { setError(''); setShowForm((value) => !value); }} className="flex items-center justify-center gap-1 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Add Spray Record
        </button>
      </header>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}

      {showForm && (
        <form onSubmit={addSpray} className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-5 sm:grid-cols-2">
          <label className="text-sm font-semibold text-stone-700">Crop
            <select required value={form.cropId} onChange={(event) => setForm({ ...form, cropId: event.target.value })} className="mt-1 w-full rounded-xl border border-stone-300 bg-white p-2.5">
              <option value="">Select crop</option>
              {crops.map((crop) => <option key={crop.id} value={crop.id}>{englishCropName(crop.name)}{crop.field?.name ? ` — ${crop.field.name}` : ''}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold text-stone-700">Spray / Product Name
            <input required value={form.sprayName} onChange={(event) => setForm({ ...form, sprayName: event.target.value })} placeholder="e.g. insecticide or fungicide" className="mt-1 w-full rounded-xl border border-stone-300 p-2.5" />
          </label>
          <label className="text-sm font-semibold text-stone-700">Spray Date
            <input required type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="mt-1 w-full rounded-xl border border-stone-300 p-2.5" />
          </label>
          <label className="text-sm font-semibold text-stone-700">Spray Cost (₹, optional)
            <input type="number" min="0" step="0.01" value={form.cost} onChange={(event) => setForm({ ...form, cost: event.target.value })} placeholder="Total spray cost" className="mt-1 w-full rounded-xl border border-stone-300 p-2.5" />
          </label>
          <label className="text-sm font-semibold text-stone-700">Notes (optional)
            <input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Dose, reason, or other details" className="mt-1 w-full rounded-xl border border-stone-300 p-2.5" />
          </label>
          <div className="flex gap-2 sm:col-span-2 sm:justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700">Cancel</button>
            <button type="submit" disabled={saving || crops.length === 0} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save Spray Record'}</button>
          </div>
        </form>
      )}

      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 bg-stone-50 px-5 py-4">
          <h2 className="font-bold text-stone-800">Spray History</h2>
          <div className="flex items-center gap-3">
            <select aria-label="Filter spray history by crop" value={cropFilter} onChange={(event) => setCropFilter(event.target.value)} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm">
              <option value="ALL">All Crops</option>
              {crops.map((crop) => <option key={crop.id} value={crop.id}>{englishCropName(crop.name)}</option>)}
            </select>
            <span className="text-sm text-stone-500">{visibleRecords.length} records</span>
          </div>
        </div>
        {loading ? <p className="p-8 text-center text-stone-500">Loading spray history…</p> : visibleRecords.length === 0 ? (
          <div className="p-10 text-center">
            <Sprout className="mx-auto mb-3 h-8 w-8 text-blue-500" />
            <p className="font-semibold text-stone-800">No spray records yet</p>
            <p className="mt-1 text-sm text-stone-500">Add a spray record to see its date and crop here.</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {visibleRecords.map((record) => (
              <article key={record.id} className="grid gap-2 p-5 sm:grid-cols-[150px_1fr_1fr] sm:items-center">
                <time className="text-sm font-semibold text-stone-600">{formatDate(record.date)}</time>
                <div>
                  <p className="font-bold text-stone-900">{record.title}</p>
                  {record.notes && <p className="mt-1 text-sm text-stone-500">{record.notes}</p>}
                </div>
                <div className="text-sm font-medium text-blue-800">{record.crop ? englishCropName(record.crop.name) : 'Unassigned crop'}</div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
