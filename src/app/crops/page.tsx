'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useFarm } from '@/context/FarmContext';
import { Modal } from '@/components/common/Modal';
import { Minus, Pencil, Plus, Sprout, Trash2 } from 'lucide-react';

type ProductionEntry = {
  id: string;
  entryDate: string;
  productionKg: number;
  ratePerKg: number;
  transportCost: number;
  hamaliCost: number;
  commissionCost: number;
  batchId?: string | null;
};

type ProductionBatch = {
  id: string;
  entryDate: string;
  transportCost: number;
  hamaliCost: number;
  commissionCost: number;
  entries: ProductionEntry[];
};

type Crop = {
  id: string;
  name: string;
  field?: { name: string };
  fieldId: string;
  sowingDate: string;
  area: number;
  farmId: string;
  targetYield: number | null;
  totalProductionKg: number;
  ratePerKg: number;
  hamaliRatePerPack: number | null;
  hamaliPackSize: number | null;
  hamaliPackUnit: string | null;
  updatedAt: string;
  productionEntries: ProductionEntry[];
  productionBatches: ProductionBatch[];
  fertilizerApplications?: { id: string; applicationDate: string; quantity: number; unit: string; totalCost: number; method?: string | null; inventoryItem: { name: string } }[];
};

type SaleLineDraft = { productionKg: string; ratePerKg: string };
type MultiCropSaleLine = SaleLineDraft & { cropId: string };
type ProductionDraft = {
  entryDate: string;
  lines: SaleLineDraft[];
  transportCost: string;
};
type HistoryEditTarget = { id: string; kind: 'batch' | 'entry' };
type HistoryEditData = { entryDate: string; lines: SaleLineDraft[]; transportCost: string };
type HamaliConfig = { ratePerPack: string; packSize: string; packUnit: string };

function indiaDateKey(value: string | Date = new Date()) {
  const raw = typeof value === 'string' ? value : value.toISOString();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(raw));
  const get = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

const newProductionDraft = (): ProductionDraft => ({
  entryDate: indiaDateKey(),
  lines: [{ productionKg: '', ratePerKg: '' }],
  transportCost: '',
});

function displayCropName(name: string) {
  if (/cucumber|kheera|खीरा/i.test(name)) return 'Cucumber';
  if (/tomato|टमाटर/i.test(name)) return 'Tomato';
  if (/chilli|chili|मिर्च/i.test(name)) return 'Chilli';
  return name;
}

function defaultHamaliConfig(name: string): HamaliConfig {
  if (/tomato|टमाटर/i.test(name)) return { ratePerPack: '5', packSize: '1', packUnit: 'crate' };
  if (/cucumber|kheera|खीरा/i.test(name)) return { ratePerPack: '3', packSize: '20', packUnit: 'kg' };
  if (/chilli|chili|मिर्च/i.test(name)) return { ratePerPack: '3', packSize: '15', packUnit: 'kg' };
  return { ratePerPack: '0', packSize: '1', packUnit: 'kg' };
}

function effectiveHamaliConfig(crop: Crop): HamaliConfig {
  const defaults = defaultHamaliConfig(crop.name);
  return {
    ratePerPack: String(crop.hamaliRatePerPack ?? defaults.ratePerPack),
    packSize: String(crop.hamaliPackSize ?? defaults.packSize),
    packUnit: crop.hamaliPackUnit || defaults.packUnit,
  };
}

export default function CropsPage() {
  const { selectedFarmId, farms } = useFarm();
  const [crops, setCrops] = useState<Crop[]>([]);
  const [summaryDate, setSummaryDate] = useState(indiaDateKey());
  const [fields, setFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState<Record<string, ProductionDraft>>({});
  const [isCropManagerOpen, setIsCropManagerOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCropId, setEditingCropId] = useState('');
  const [newCrop, setNewCrop] = useState({
    farmId: '',
    fieldId: '',
    name: '',
    area: '',
    targetYield: '',
    sowingDate: indiaDateKey(),
  });

  const loadCrops = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [cropsRes, fieldsRes] = await Promise.all([
        fetch(`/api/crops?farmId=${selectedFarmId}`),
        fetch(`/api/fields?farmId=${selectedFarmId}`),
      ]);
      if (!cropsRes.ok || !fieldsRes.ok) throw new Error('Unable to load data.');
      const cropData: Crop[] = await cropsRes.json();
      setCrops(cropData);
      setFields(await fieldsRes.json());
    } catch (e: any) {
      setError(e.message || 'Unable to load data.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    loadCrops();
  }, [selectedFarmId]);

  useEffect(() => {
    if (farms.length && !newCrop.farmId) {
      setNewCrop((v) => ({ ...v, farmId: farms[0].id }));
    }
  }, [farms, newCrop.farmId]);

  useEffect(() => {
    const firstField = fields.find((f) => f.farmId === newCrop.farmId);
    if (firstField && !fields.some((f) => f.id === newCrop.fieldId && f.farmId === newCrop.farmId)) {
      setNewCrop((v) => ({ ...v, fieldId: firstField.id }));
    }
  }, [fields, newCrop.farmId, newCrop.fieldId]);

  const updateDraft = (cropId: string, changes: Partial<ProductionDraft>) => {
    setDrafts((items) => ({
      ...items,
      [cropId]: {
        ...(items[cropId] || newProductionDraft()),
        ...changes,
      },
    }));
  };

  const recordProduction = async (e: React.FormEvent, crop: Crop, editTarget?: HistoryEditTarget): Promise<boolean> => {
    e.preventDefault();
    const draft = drafts[crop.id];
    if (!draft?.lines.length || draft.lines.some((line) => !line.productionKg || line.ratePerKg === '')) {
      setError('Enter a quantity and rate for each line.');
      return false;
    }
    if (/tomato|टमाटर/i.test(crop.name) && draft.lines.some((line) => !Number.isInteger(Number(line.productionKg)))) {
      setError('Tomato quantities must be whole crates.');
      return false;
    }
    setSaving(crop.id);
    setError('');
    try {
      const res = await fetch('/api/crops/production', {
        method: editTarget ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(editTarget ? editTarget.kind === 'batch' ? { id: editTarget.id } : { entryId: editTarget.id } : {}),
          cropId: crop.id,
          entryDate: draft.entryDate,
          lines: draft.lines,
          transportCost: draft.transportCost || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to save the record.');
      setDrafts((items) => ({
        ...items,
        [crop.id]: newProductionDraft(),
      }));
      await loadCrops(false);
      return true;
    } catch (e: any) {
      setError(e.message || 'Unable to save the record.');
      return false;
    } finally {
      setSaving(null);
    }
  };

  const deleteProduction = async (id: string, kind: 'batch' | 'entry') => {
    if (!window.confirm('Delete this entire sale entry for this date?')) return;
    setError('');
    try {
      const res = await fetch(`/api/crops/production?id=${encodeURIComponent(id)}&type=${kind}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to delete the entry.');
      await loadCrops(false);
    } catch (e: any) {
      setError(e.message || 'Unable to delete the entry.');
    }
  };

  const saveHamaliConfig = async (cropId: string, config: HamaliConfig): Promise<boolean> => {
    setError('');
    try {
      const res = await fetch('/api/crops', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_HAMALI_CONFIG',
          id: cropId,
          hamaliRatePerPack: config.ratePerPack,
          hamaliPackSize: config.packSize,
          hamaliPackUnit: config.packUnit,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to save hamali settings.');
      await loadCrops(false);
      return true;
    } catch (e: any) {
      setError(e.message || 'Unable to save hamali settings.');
      return false;
    }
  };

  const addCrop = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const editing = Boolean(editingCropId);
      const res = await fetch('/api/crops', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newCrop,
          ...(editing ? { id: editingCropId } : {
            season: 'ZAID',
            variety: '',
            estDaysToHarvest: '35',
            targetYield: newCrop.targetYield,
            notes: '',
          }),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to add the crop.');
      setIsAddOpen(false);
      setEditingCropId('');
      setNewCrop((v) => ({ ...v, name: '', area: '', targetYield: '' }));
      await loadCrops(false);
    } catch (e: any) {
      setError(e.message || 'Unable to add the crop.');
    }
  };

  const openCropEditor = (crop: Crop) => {
    setEditingCropId(crop.id);
    setNewCrop({
      farmId: crop.farmId,
      fieldId: crop.fieldId || '',
      name: crop.name,
      area: String(crop.area),
      targetYield: crop.targetYield == null ? '' : String(crop.targetYield),
      sowingDate: indiaDateKey(crop.sowingDate),
    });
    setError('');
    setIsCropManagerOpen(false);
    setIsAddOpen(true);
  };

  const deleteCrop = async (crop: Crop) => {
    if (!window.confirm(`Delete ${displayCropName(crop.name)}? Its crop records will also be deleted.`)) return;
    setError('');
    try {
      const res = await fetch(`/api/crops?id=${encodeURIComponent(crop.id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to delete the crop.');
      await loadCrops(false);
    } catch (e: any) {
      setError(e.message || 'Unable to delete the crop.');
    }
  };

  const recordMultipleProduction = async (
    e: React.FormEvent,
    entryDate: string,
    rows: Array<{ cropId: string; productionKg: string; ratePerKg: string }>,
    totalTransport: string,
  ): Promise<boolean> => {
    e.preventDefault();
    setError('');
    if (!rows.length || rows.some((row) => !row.cropId || !row.productionKg || row.ratePerKg === '')) {
      setError('Select a crop and enter quantity and rate for each row.');
      return false;
    }
    const invalidTomato = rows.some((row) => {
      const crop = visibleCrops.find((item) => item.id === row.cropId);
      return crop && /tomato|टमाटर/i.test(crop.name) && !Number.isInteger(Number(row.productionKg));
    });
    if (invalidTomato) {
      setError('Tomato quantities must be whole crates.');
      return false;
    }
    setSaving('multi');
    try {
      const groupedRows = new Map<string, { cropId: string; lines: Array<{ productionKg: string; ratePerKg: string }>; gross: number }>();
      for (const row of rows) {
        const group = groupedRows.get(row.cropId) || { cropId: row.cropId, lines: [], gross: 0 };
        group.lines.push({ productionKg: row.productionKg, ratePerKg: row.ratePerKg });
        group.gross += Number(row.productionKg) * Number(row.ratePerKg);
        groupedRows.set(row.cropId, group);
      }
      const cropRows = Array.from(groupedRows.values());
      const totalGross = cropRows.reduce((sum, row) => sum + row.gross, 0);
      const transportTotal = Math.max(0, Number(totalTransport) || 0);
      let transportAllocated = 0;
      const entries = cropRows.map((row, index) => {
        const share = index === cropRows.length - 1
          ? Number((transportTotal - transportAllocated).toFixed(2))
          : Number((totalGross > 0 ? transportTotal * row.gross / totalGross : transportTotal / cropRows.length).toFixed(2));
        transportAllocated += share;
        return { cropId: row.cropId, lines: row.lines, transportCost: share };
      });
      const res = await fetch('/api/crops/production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryDate, entries }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to save the multi-crop sale.');
      await loadCrops(false);
      return true;
    } catch (e: any) {
      setError(e.message || 'Unable to save the multi-crop sale.');
      return false;
    } finally {
      setSaving(null);
    }
  };

  const money = (value: number) => new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 2,
  }).format(value || 0);
  const visibleCrops = useMemo(
    () => crops.filter((crop) => selectedFarmId === 'ALL' || crop.farmId === selectedFarmId),
    [crops, selectedFarmId]
  );
  const cropTotals = (crop: Crop) => {
    const entries = (crop.productionEntries || []).filter((entry) => !entry.batchId);
    const batches = crop.productionBatches || [];
    const batchEntries = batches.flatMap((batch) => batch.entries);
    const allEntries = [...entries, ...batchEntries];
    const production = allEntries.reduce((sum, entry) => sum + entry.productionKg, 0);
    const grossIncome = allEntries.reduce((sum, entry) => sum + entry.productionKg * entry.ratePerKg, 0);
    const hamaliCost = batches.reduce((sum, batch) => sum + batch.hamaliCost, 0) + entries.reduce((sum, entry) => sum + entry.hamaliCost, 0);
    const transportCost = batches.reduce((sum, batch) => sum + batch.transportCost, 0) + entries.reduce((sum, entry) => sum + entry.transportCost, 0);
    const commissionCost = batches.reduce((sum, batch) => sum + batch.commissionCost, 0) + entries.reduce((sum, entry) => sum + entry.commissionCost, 0);
    const costs = hamaliCost + transportCost + commissionCost;
    return { production, grossIncome, costs, hamaliCost, transportCost, commissionCost, income: grossIncome - costs, averageRate: production ? grossIncome / production : 0 };
  };
  const allCropsSelected = true;
  const activeCrop = visibleCrops[0] || null;
  const dailySummary = useMemo(() => {
    const result = { production: 0, grossIncome: 0, hamaliCost: 0, transportCost: 0, commissionCost: 0, cropRows: [] as { cropName: string; quantity: number; gross: number; hamali: number; transport: number; commission: number; net: number }[] };
    for (const crop of visibleCrops) {
      const legacy = (crop.productionEntries || []).filter((entry) => !entry.batchId && indiaDateKey(entry.entryDate) === summaryDate);
      const batches = (crop.productionBatches || []).filter((batch) => indiaDateKey(batch.entryDate) === summaryDate);
      const entries = [...legacy, ...batches.flatMap((batch) => batch.entries)];
      const quantity = entries.reduce((sum, entry) => sum + entry.productionKg, 0);
      const gross = entries.reduce((sum, entry) => sum + entry.productionKg * entry.ratePerKg, 0);
      const hamali = legacy.reduce((sum, entry) => sum + entry.hamaliCost, 0) + batches.reduce((sum, batch) => sum + batch.hamaliCost, 0);
      const transport = legacy.reduce((sum, entry) => sum + entry.transportCost, 0) + batches.reduce((sum, batch) => sum + batch.transportCost, 0);
      const commission = legacy.reduce((sum, entry) => sum + entry.commissionCost, 0) + batches.reduce((sum, batch) => sum + batch.commissionCost, 0);
      if (quantity || gross || hamali || transport || commission) {
        const cropLabel = `${displayCropName(crop.name)}${crop.field?.name ? ` · ${crop.field.name}` : ''}`;
        result.cropRows.push({ cropName: cropLabel, quantity, gross, hamali, transport, commission, net: gross - hamali - transport - commission });
      }
      result.production += quantity;
      result.grossIncome += gross;
      result.hamaliCost += hamali;
      result.transportCost += transport;
      result.commissionCost += commission;
    }
    return result;
  }, [visibleCrops, summaryDate]);
  const dailyNet = dailySummary.grossIncome - dailySummary.hamaliCost - dailySummary.transportCost - dailySummary.commissionCost;
  const shiftSummaryDate = (days: number) => {
    const next = new Date(`${summaryDate}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + days);
    setSummaryDate(next.toISOString().slice(0, 10));
  };
  const formatDate = (date: string) => new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
  }).format(new Date(`${indiaDateKey(date)}T12:00:00+05:30`));

  return (
    <main className="mx-auto max-w-6xl space-y-5 pb-12">
      <header className="flex items-center justify-between rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-stone-900"><Sprout className="h-6 w-6 text-blue-600" /> Crop Production</h1>
        <p className="mt-1 text-sm text-stone-500">Enter multiple quantity and rate lines for the same day.</p>
        </div>
        <button onClick={() => setIsCropManagerOpen(true)} className="flex items-center gap-1 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          <Sprout className="h-4 w-4" /> Crop
        </button>
      </header>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}

      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-emerald-900">सभी फसलों की तारीखवार बिक्री</h2>
            <p className="mt-0.5 text-xs text-emerald-800">{formatDate(summaryDate)} · {dailySummary.production.toLocaleString('en-IN')} कुल यूनिट</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" aria-label="पिछला दिन" onClick={() => shiftSummaryDate(-1)} className="rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm font-semibold text-emerald-900">‹</button>
            <input aria-label="बिक्री की तारीख" type="date" value={summaryDate} onChange={(e) => setSummaryDate(e.target.value)} className="rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm" />
            <button type="button" aria-label="अगला दिन" onClick={() => shiftSummaryDate(1)} className="rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm font-semibold text-emerald-900">›</button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <SummaryMetric title="Gross Amount" value={money(dailySummary.grossIncome)} />
          <SummaryMetric title="Hamali" value={money(dailySummary.hamaliCost)} />
          <SummaryMetric title="भाड़ा / Transport" value={money(dailySummary.transportCost)} />
          <SummaryMetric title="Commission" value={money(dailySummary.commissionCost)} />
          <SummaryMetric title="Net Amount" value={money(dailyNet)} emphasize />
        </div>
        {dailySummary.cropRows.length > 0 ? (
          <div className="mt-4 overflow-x-auto rounded-xl border border-emerald-200 bg-white">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-50 text-xs text-stone-600">
                <tr><th className="px-3 py-2">फसल</th><th className="px-3 py-2 text-right">मात्रा</th><th className="px-3 py-2 text-right">ग्रॉस</th><th className="px-3 py-2 text-right">हमाली</th><th className="px-3 py-2 text-right">भाड़ा</th><th className="px-3 py-2 text-right">कमीशन</th><th className="px-3 py-2 text-right">नेट</th></tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {dailySummary.cropRows.map((row, index) => <tr key={`${row.cropName}-${index}`}>
                  <td className="px-3 py-2 font-semibold text-stone-800">{row.cropName}</td><td className="px-3 py-2 text-right">{row.quantity.toLocaleString('en-IN')}</td><td className="px-3 py-2 text-right">{money(row.gross)}</td><td className="px-3 py-2 text-right">{money(row.hamali)}</td><td className="px-3 py-2 text-right">{money(row.transport)}</td><td className="px-3 py-2 text-right">{money(row.commission)}</td><td className="px-3 py-2 text-right font-bold">{money(row.net)}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
        ) : <p className="mt-4 rounded-xl border border-dashed border-emerald-300 bg-white/70 p-3 text-center text-sm text-emerald-900">इस तारीख पर किसी फसल की बिक्री दर्ज नहीं है। दूसरी तारीख चुनें या बिक्री दर्ज करें।</p>}
      </section>

      {loading ? <p className="py-10 text-center text-stone-500">Loading…</p> : visibleCrops.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center">
          <p className="font-semibold text-stone-800">No crops have been added yet</p>
          <p className="mt-1 text-sm text-stone-500">Select “Crop” to add your first crop.</p>
        </section>
      ) : activeCrop ? (
        <div className="space-y-3">
          <CropProductionCard
            key={allCropsSelected ? 'all-crops' : activeCrop.id}
            crop={activeCrop}
            availableCrops={visibleCrops}
            totals={cropTotals(activeCrop)}
            draft={drafts[activeCrop.id] || newProductionDraft()}
            saving={saving === activeCrop.id || saving === 'multi'}
            allCropsMode={allCropsSelected}
            onDraftChange={(changes) => updateDraft(activeCrop.id, changes)}
            onRecord={(e, editTarget) => recordProduction(e, activeCrop, editTarget)}
            onRecordMultiple={recordMultipleProduction}
            onDelete={deleteProduction}
            onEditRecord={(data) => updateDraft(activeCrop.id, data)}
            onSaveHamali={(config) => saveHamaliConfig(activeCrop.id, config)}
            formatCurrency={money}
            formatDate={formatDate}
          />
        </div>
      ) : null}

      <Modal isOpen={isCropManagerOpen} onClose={() => setIsCropManagerOpen(false)} title="Crops" subtitle="Manage crops in this farm">
        <div className="space-y-3">
          {visibleCrops.length ? <div className="divide-y divide-stone-100 rounded-xl border border-stone-200">
            {visibleCrops.map((crop) => <div key={crop.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0"><p className="truncate font-semibold text-stone-800">{displayCropName(crop.name)}</p><p className="text-xs text-stone-500">{crop.field?.name || 'Field'} · {crop.area} acres</p></div>
              <div className="flex shrink-0 gap-2">
                <button type="button" onClick={() => openCropEditor(crop)} className="inline-flex items-center gap-1 rounded-lg border border-stone-300 px-2.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"><Pencil className="h-3.5 w-3.5" /> Edit</button>
                <button type="button" onClick={() => deleteCrop(crop)} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
              </div>
            </div>)}
          </div> : <p className="rounded-xl border border-dashed border-stone-300 p-4 text-center text-sm text-stone-500">No crops added yet.</p>}
          <button type="button" onClick={() => { setIsCropManagerOpen(false); setEditingCropId(''); setNewCrop((v) => ({ ...v, name: '', area: '', targetYield: '', sowingDate: indiaDateKey() })); setIsAddOpen(true); }} className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"><Plus className="h-4 w-4" /> Add Crop</button>
        </div>
      </Modal>

      <Modal isOpen={isAddOpen} onClose={() => { setIsAddOpen(false); setEditingCropId(''); }} title={editingCropId ? 'Edit Crop' : 'Add Crop'} subtitle={editingCropId ? 'Update crop name, field, area, or planting date' : 'Select a crop and field'}>
        <form onSubmit={addCrop} className="space-y-4">
          {farms.length > 1 && <label className="block text-sm font-medium text-stone-700">Farm
            <select required value={newCrop.farmId} onChange={(e) => setNewCrop((v) => ({ ...v, farmId: e.target.value, fieldId: '' }))} className="mt-1 w-full rounded-xl border border-stone-300 bg-white p-2.5">
              {farms.map((farm) => <option key={farm.id} value={farm.id}>{farm.name}</option>)}
            </select>
          </label>}
          <label className="block text-sm font-medium text-stone-700">Crop Name
            <input required value={newCrop.name} onChange={(e) => setNewCrop((v) => ({ ...v, name: e.target.value }))} placeholder="e.g. Cucumber, Tomato, Chilli" className="mt-1 w-full rounded-xl border border-stone-300 p-2.5" />
          </label>
          <label className="block text-sm font-medium text-stone-700">Field
            <select required value={newCrop.fieldId} onChange={(e) => setNewCrop((v) => ({ ...v, fieldId: e.target.value }))} className="mt-1 w-full rounded-xl border border-stone-300 bg-white p-2.5">
              {fields.filter((field) => field.farmId === newCrop.farmId).map((field) => <option key={field.id} value={field.id}>{field.name}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium text-stone-700">Area (acres)
            <input required type="number" min="0.1" step="0.1" value={newCrop.area} onChange={(e) => setNewCrop((v) => ({ ...v, area: e.target.value }))} placeholder="Acres" className="mt-1 w-full rounded-xl border border-stone-300 p-2.5" />
          </label>
          <label className="block text-sm font-medium text-stone-700">Expected Production ({/tomato|टमाटर/i.test(newCrop.name) ? 'crates' : 'kg'})
            <input type="number" min="0.01" step="0.01" value={newCrop.targetYield} onChange={(e) => setNewCrop((v) => ({ ...v, targetYield: e.target.value }))} placeholder="Expected total" className="mt-1 w-full rounded-xl border border-stone-300 p-2.5" />
          </label>
          <label className="block text-sm font-medium text-stone-700">Planting Date
            <input required type="date" value={newCrop.sowingDate} onChange={(e) => setNewCrop((v) => ({ ...v, sowingDate: e.target.value }))} className="mt-1 w-full rounded-xl border border-stone-300 p-2.5" />
          </label>
          <button type="submit" disabled={!fields.some((field) => field.id === newCrop.fieldId)} className="w-full rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{editingCropId ? 'Save Crop Changes' : 'Add Crop'}</button>
        </form>
      </Modal>
    </main>
  );
}

function CropProductionCard({
  crop,
  availableCrops,
  totals,
  draft,
  saving,
  allCropsMode,
  onDraftChange,
  onRecord,
  onRecordMultiple,
  onDelete,
  onEditRecord,
  onSaveHamali,
  formatCurrency,
  formatDate,
}: {
  crop: Crop;
  availableCrops: Crop[];
  totals: { production: number; grossIncome: number; costs: number; income: number; averageRate: number };
  draft: ProductionDraft;
  saving: boolean;
  allCropsMode: boolean;
  onDraftChange: (changes: Partial<ProductionDraft>) => void;
  onRecord: (event: React.FormEvent, editTarget?: HistoryEditTarget) => Promise<boolean>;
  onRecordMultiple: (event: React.FormEvent, entryDate: string, rows: MultiCropSaleLine[], totalTransport: string) => Promise<boolean>;
  onDelete: (id: string, kind: 'batch' | 'entry') => void;
  onEditRecord: (data: HistoryEditData) => void;
  onSaveHamali: (config: HamaliConfig) => Promise<boolean>;
  formatCurrency: (value: number) => string;
  formatDate: (date: string) => string;
}) {
  const [editingTarget, setEditingTarget] = useState<HistoryEditTarget | null>(null);
  const [saleRows, setSaleRows] = useState<MultiCropSaleLine[]>([{ cropId: crop.id, productionKg: '', ratePerKg: '' }]);
  const [hamaliConfig, setHamaliConfig] = useState(() => effectiveHamaliConfig(crop));
  const [savingHamali, setSavingHamali] = useState(false);
  const [hamaliMessage, setHamaliMessage] = useState('');
  useEffect(() => { setSaleRows([{ cropId: crop.id, productionKg: '', ratePerKg: '' }]); }, [crop.id, allCropsMode]);
  useEffect(() => { setHamaliConfig(effectiveHamaliConfig(crop)); }, [crop.id, crop.hamaliRatePerPack, crop.hamaliPackSize, crop.hamaliPackUnit]);
  const batches = crop.productionBatches || [];
  const legacyEntries = (crop.productionEntries || []).filter((entry) => !entry.batchId);
  const isTomato = /tomato|टमाटर/i.test(crop.name);
  const quantityUnit = isTomato ? 'crates' : 'kg';
  const rateUnit = isTomato ? 'crate' : 'kg';
  const activeSaleRows = editingTarget
    ? draft.lines.map((line) => ({ ...line, cropId: crop.id }))
    : saleRows;
  const draftQuantity = activeSaleRows.reduce((sum, line) => sum + (Number(line.productionKg) || 0), 0);
  const draftGross = activeSaleRows.reduce((sum, line) => sum + (Number(line.productionKg) || 0) * (Number(line.ratePerKg) || 0), 0);
  const draftCommission = Number((draftGross * 0.08).toFixed(2));
  const hamaliPackSize = Math.max(0.01, Number(hamaliConfig.packSize) || 1);
  const draftPackCount = Math.ceil(draftQuantity / hamaliPackSize);
  const draftHamali = editingTarget
    ? draftPackCount * (Number(hamaliConfig.ratePerPack) || 0)
    : (() => {
      const quantitiesByCrop = new Map<string, number>();
      for (const line of saleRows) {
        quantitiesByCrop.set(line.cropId, (quantitiesByCrop.get(line.cropId) || 0) + (Number(line.productionKg) || 0));
      }
      return Array.from(quantitiesByCrop.entries()).reduce((sum, [cropId, quantity]) => {
      const rowCrop = availableCrops.find((item) => item.id === cropId);
      if (!rowCrop) return sum;
      const config = rowCrop.id === crop.id ? hamaliConfig : effectiveHamaliConfig(rowCrop);
      const packSize = Math.max(0.01, Number(config.packSize) || 1);
      const packs = Math.ceil(quantity / packSize);
      return sum + packs * (Number(config.ratePerPack) || 0);
      }, 0);
    })();
  const draftTransport = Number(draft.transportCost) || 0;
  const draftTotalCuts = draftTransport + draftCommission + draftHamali;
  const draftNetAmount = draftGross - draftTotalCuts;
  const savedConfig = effectiveHamaliConfig(crop);
  const hamaliConfigDirty = hamaliConfig.ratePerPack !== savedConfig.ratePerPack ||
    hamaliConfig.packSize !== savedConfig.packSize || hamaliConfig.packUnit !== savedConfig.packUnit;
  const historyRows = [
    ...batches.map((batch) => ({
      id: batch.id,
      entryDate: batch.entryDate,
      entries: batch.entries,
      transportCost: batch.transportCost,
      hamaliCost: batch.hamaliCost,
      commissionCost: batch.commissionCost,
      editable: true,
      kind: 'batch' as const,
      editData: {
        entryDate: indiaDateKey(batch.entryDate),
        lines: batch.entries.map((entry) => ({ productionKg: String(entry.productionKg), ratePerKg: String(entry.ratePerKg) })),
        transportCost: String(batch.transportCost),
      },
    })),
    ...legacyEntries.map((entry) => ({
      id: entry.id,
      entryDate: entry.entryDate,
      entries: [entry],
      transportCost: entry.transportCost,
      hamaliCost: entry.hamaliCost,
      commissionCost: entry.commissionCost,
      editable: true,
      kind: 'entry' as const,
      editData: {
        entryDate: indiaDateKey(entry.entryDate),
        lines: [{ productionKg: String(entry.productionKg), ratePerKg: String(entry.ratePerKg) }],
        transportCost: String(entry.transportCost),
      },
    })),
  ].sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());
  const fertilizerHistory = useMemo(() => {
    const groups = new Map<string, { id: string; applicationDate: string; title: string; detail: string; totalCost: number }>();
    for (const application of crop.fertilizerApplications || []) {
      const day = indiaDateKey(application.applicationDate);
      const combinationName = application.method?.startsWith('Combination: ')
        ? application.method.slice('Combination: '.length)
        : null;
      const key = combinationName ? `${day}:${combinationName}` : application.id;
      const existing = groups.get(key);
      if (existing) {
        existing.totalCost += application.totalCost;
      } else {
        groups.set(key, {
          id: key,
          applicationDate: application.applicationDate,
          title: combinationName ? `मिक्स: ${combinationName}` : application.inventoryItem.name,
          detail: combinationName ? '' : `${application.quantity} ${application.unit}${application.method ? ` · ${application.method}` : ''}`,
          totalCost: application.totalCost,
        });
      }
    }
    return Array.from(groups.values()).sort((a, b) => indiaDateKey(b.applicationDate).localeCompare(indiaDateKey(a.applicationDate)));
  }, [crop.fertilizerApplications]);

  const updateLine = (index: number, changes: Partial<SaleLineDraft>) => {
    onDraftChange({ lines: draft.lines.map((line, i) => i === index ? { ...line, ...changes } : line) });
  };

  const submitForm = async (event: React.FormEvent) => {
    if (editingTarget) {
      if (await onRecord(event, editingTarget)) setEditingTarget(null);
      return;
    }
    if (await onRecordMultiple(event, draft.entryDate, saleRows, draft.transportCost)) {
      setSaleRows([{ cropId: crop.id, productionKg: '', ratePerKg: '' }]);
      onDraftChange({ entryDate: indiaDateKey(), lines: [{ productionKg: '', ratePerKg: '' }], transportCost: '' });
    }
  };

  const editHistory = (row: (typeof historyRows)[number]) => {
    onEditRecord(row.editData);
    setEditingTarget({ id: row.id, kind: row.kind });
  };

  const cancelEdit = () => {
    setEditingTarget(null);
    onDraftChange(newProductionDraft());
  };

  const saveHamaliSettings = async () => {
    setSavingHamali(true);
    setHamaliMessage('');
    const saved = await onSaveHamali(hamaliConfig);
    setHamaliMessage(saved ? 'Hamali settings saved.' : 'Unable to save hamali settings.');
    setSavingHamali(false);
  };

  const moneyField = (label: string, value: string, onChange: (value: string) => void) => (
    <label className="text-sm font-semibold text-stone-700">{label} (₹)
      <input type="number" min="0" step="0.01" value={value} onChange={(e) => onChange(e.target.value)} placeholder="0" className="mt-1 w-full rounded-xl border border-stone-300 bg-white p-2.5" />
    </label>
  );
  const saleGroups = activeSaleRows.reduce<Array<{ cropId: string; startIndex: number; rows: Array<{ line: MultiCropSaleLine; index: number }> }>>((groups, line, index) => {
    const cropId = editingTarget ? crop.id : line.cropId;
    let group = groups[groups.length - 1];
    if (!group || group.cropId !== cropId) {
      group = { cropId, startIndex: index, rows: [] };
      groups.push(group);
    }
    group.rows.push({ line, index });
    return groups;
  }, []);

  return (
    <article className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
      {!allCropsMode && <div className="flex items-center justify-between gap-3 border-b border-stone-100 p-5">
        <div>
          <h2 className="text-lg font-bold text-stone-900">{displayCropName(crop.name)}</h2>
          <p className="text-xs text-stone-500">
            {crop.field?.name || 'Field'} · Planted {formatDate(crop.sowingDate)} · {crop.area} acres
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-stone-500">Total Quantity Sold</p>
          <p className="font-bold text-stone-900">{totals.production.toLocaleString('en-IN')} {quantityUnit}</p>
        </div>
      </div>}

      {!allCropsMode && <section className="mx-5 mt-4 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
        <div className="mb-3">
          <h3 className="font-bold text-stone-800">Hamali Settings</h3>
          <p className="mt-1 text-xs text-stone-500">Set a fixed hamali rate and the quantity covered by one pack for this crop.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="text-sm font-semibold text-stone-700">Hamali per pack (₹)
            <input required type="number" min="0" step="0.01" value={hamaliConfig.ratePerPack} onChange={(e) => setHamaliConfig((current) => ({ ...current, ratePerPack: e.target.value }))} className="mt-1 w-full rounded-xl border border-stone-300 bg-white p-2.5" />
          </label>
          <label className="text-sm font-semibold text-stone-700">Pack size ({quantityUnit})
            <input required type="number" min="0.01" step={isTomato ? 1 : 0.01} value={hamaliConfig.packSize} onChange={(e) => setHamaliConfig((current) => ({ ...current, packSize: e.target.value }))} className="mt-1 w-full rounded-xl border border-stone-300 bg-white p-2.5" />
          </label>
          <button type="button" onClick={saveHamaliSettings} disabled={savingHamali || !hamaliConfigDirty} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            {savingHamali ? 'Saving…' : 'Save Hamali Settings'}
          </button>
        </div>
        {hamaliMessage && <p className="mt-2 text-xs font-medium text-stone-600">{hamaliMessage}</p>}
        <p className="mt-2 text-xs text-stone-500">Current rule: {formatCurrency(Number(hamaliConfig.ratePerPack) || 0)} per {hamaliConfig.packSize || 1} {quantityUnit} pack.</p>
      </section>}

      <form onSubmit={submitForm} className="space-y-3 bg-stone-50 p-4 sm:p-5">
        {editingTarget && <p className="text-sm font-semibold text-blue-700">Edit sale entry</p>}
        {!allCropsMode && <p className="text-xs text-stone-500">Select a date, then add one row per crop rate. Repeat the same crop for separate rates.</p>}
        <label className="block max-w-xs text-sm font-semibold text-stone-700">Date
          <input required type="date" value={draft.entryDate} onChange={(e) => onDraftChange({ entryDate: e.target.value })} className="mt-1 w-full rounded-xl border border-stone-300 bg-white p-2.5" />
        </label>
        <div className="space-y-3">
          {saleGroups.map((group) => {
            const groupCrop = availableCrops.find((item) => item.id === group.cropId);
            const updateGroupCrop = (cropId: string) => setSaleRows((rows) => rows.map((row, i) => i >= group.startIndex && i < group.startIndex + group.rows.length ? { ...row, cropId } : row));
            return <section key={`${group.startIndex}-${group.cropId}`} className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
              <div className="space-y-2">
              {group.rows.map(({ line, index }, lineIndex) => {
                const rowCrop = editingTarget ? crop : groupCrop;
                const rowIsTomato = Boolean(rowCrop && /tomato|टमाटर/i.test(rowCrop.name));
                const rowQuantityUnit = rowIsTomato ? 'crates' : 'kg';
                const rowRateUnit = rowIsTomato ? 'crate' : 'kg';
                const updateRow = (changes: Partial<SaleLineDraft>) => editingTarget
                  ? updateLine(index, changes)
                  : setSaleRows((rows) => rows.map((row, i) => i === index ? { ...row, ...changes } : row));
                const removeRow = () => editingTarget
                  ? onDraftChange({ lines: draft.lines.filter((_, i) => i !== index) })
                  : setSaleRows((rows) => rows.filter((_, i) => i !== index));
                return <div key={index} className="grid items-end gap-2 border-b border-stone-100 pb-2 last:border-0 last:pb-0 sm:grid-cols-[1.1fr_1fr_1fr_auto]">
                  {lineIndex === 0 ? <label className="text-xs font-semibold text-stone-700">Crop
                    <select required disabled={Boolean(editingTarget)} value={group.cropId} onChange={(e) => updateGroupCrop(e.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm disabled:bg-stone-100">
                      {!editingTarget && <option value="">Select crop</option>}
                      {(editingTarget ? [crop] : availableCrops).map((item) => <option key={item.id} value={item.id}>{displayCropName(item.name)} · {item.field?.name || 'Field'}</option>)}
                    </select>
                  </label> : <div aria-hidden="true" />}
                  <label className="text-xs font-semibold text-stone-700">Quantity ({rowQuantityUnit})
                    <div className="mt-1 flex gap-1.5">
                      <button type="button" disabled={rowIsTomato && Number(line.productionKg) <= 1} aria-label={`Decrease quantity by 1 ${rowQuantityUnit}`} onClick={() => updateRow({ productionKg: String(Math.max(rowIsTomato ? 1 : 0, (Number(line.productionKg) || 0) - 1)) })} className="rounded-lg border border-stone-300 px-1.5 text-stone-700 hover:bg-stone-100 disabled:opacity-40"><Minus className="h-3.5 w-3.5" /></button>
                      <input required type="number" min={rowIsTomato ? 1 : 0.01} step={rowIsTomato ? 1 : 0.01} value={line.productionKg} onChange={(e) => updateRow({ productionKg: e.target.value })} placeholder={rowIsTomato ? 'e.g. 1' : 'e.g. 500'} className="min-w-0 flex-1 rounded-lg border border-stone-300 px-2.5 py-2 text-sm" />
                      <button type="button" aria-label={`Increase quantity by 1 ${rowQuantityUnit}`} onClick={() => updateRow({ productionKg: String((Number(line.productionKg) || 0) + 1) })} className="rounded-lg bg-blue-600 px-1.5 text-white hover:bg-blue-700"><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                  </label>
                  <label className="text-xs font-semibold text-stone-700">Rate (₹ / {rowRateUnit})
                    <input required type="number" min="0" step="0.01" value={line.ratePerKg} onChange={(e) => updateRow({ ratePerKg: e.target.value })} placeholder="e.g. 40" className="mt-1 w-full rounded-lg border border-stone-300 px-2.5 py-2 text-sm" />
                    <span className="mt-1 block text-[11px] font-semibold text-blue-700">Line total: {formatCurrency((Number(line.productionKg) || 0) * (Number(line.ratePerKg) || 0))}</span>
                  </label>
                  <div className="flex items-center gap-2">
                    {!editingTarget && <button type="button" onClick={() => setSaleRows((rows) => [...rows.slice(0, index + 1), { cropId: line.cropId, productionKg: '', ratePerKg: '' }, ...rows.slice(index + 1)])} className="whitespace-nowrap rounded-lg border border-blue-200 px-2.5 py-2 text-[11px] font-semibold text-blue-700 hover:bg-blue-50">+ Add line</button>}
                    <button type="button" disabled={activeSaleRows.length === 1} onClick={removeRow} className="rounded-lg border border-stone-300 px-2.5 py-2 text-[11px] font-semibold text-stone-600 hover:bg-stone-100 disabled:opacity-40">Remove</button>
                  </div>
                </div>;
              })}
              </div>
            </section>;
          })}
          <div className="flex flex-wrap gap-2 pt-1">
          {!editingTarget && <button type="button" onClick={() => setSaleRows((rows) => [...rows, { cropId: '', productionKg: '', ratePerKg: '' }])} className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50">+ Add another crop</button>}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <div>
            <p className="text-xs font-semibold text-blue-800">Total Amount · Quantity × Rate</p>
            <p className="text-[11px] text-blue-700">सभी quantity और rate lines का जोड़</p>
          </div>
          <p className="text-lg font-black text-blue-900">{formatCurrency(draftGross)}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {moneyField('Transport Cost', draft.transportCost, (value) => onDraftChange({ transportCost: value }))}
          <div className="rounded-xl border border-stone-200 bg-white p-3 text-sm">
            <span className="block font-semibold text-stone-700">Commission (8%)</span>
            <span className="mt-1 block text-stone-900">{formatCurrency(draftCommission)}</span>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-3 text-sm">
            <span className="block font-semibold text-stone-700">Total Hamali</span>
            <span className="mt-1 block text-stone-900">{formatCurrency(draftHamali)} · {editingTarget ? `${draftPackCount} packs` : `${new Set(saleRows.map((row) => row.cropId).filter(Boolean)).size} crops`}</span>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm">
            <span className="block font-semibold text-emerald-900">Net Amount</span>
            <span className="mt-1 block text-lg font-black text-emerald-800">{formatCurrency(draftNetAmount)}</span>
            <span className="mt-1 block text-[11px] text-emerald-800">Total cut: {formatCurrency(draftTotalCuts)} · Hamali + Transport + Commission</span>
          </div>
        </div>
        {hamaliConfigDirty && <p className="text-sm font-medium text-amber-700">Save Hamali Settings to apply this rate before recording the sale.</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={saving || hamaliConfigDirty} className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving…' : editingTarget ? 'Save Changes' : saleRows.length > 1 ? 'Add Sale Entries' : 'Add Sale Entry'}
          </button>
          {editingTarget && <button type="button" onClick={cancelEdit} className="rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-700">Cancel</button>}
        </div>
      </form>

      {!allCropsMode && <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 px-5 py-3">
        <span className="text-sm text-stone-500">Average Rate: {formatCurrency(totals.averageRate)} / {rateUnit}</span>
        <span className="text-sm text-stone-500">Costs: {formatCurrency(totals.costs)}</span>
        <span className="font-bold text-blue-700">Net Income: {formatCurrency(totals.income)}</span>
      </div>}

      {!allCropsMode && <div className="p-5">
        <h3 className="mb-3 font-bold text-stone-800">Production and Sales History</h3>
        {historyRows.length === 0 ? (
          <p className="rounded-xl bg-stone-50 p-4 text-center text-sm text-stone-500">No history yet. Add the first entry above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-stone-200 text-xs text-stone-500">
                <tr>
                  <th className="px-2 py-2">Date</th>
                  <th className="px-2 py-2 text-right">Quantity Sold ({quantityUnit})</th>
                  <th className="px-2 py-2 text-right">Daily Average Rate / {rateUnit}</th>
                  <th className="px-2 py-2 text-right">Gross Sales</th>
                  <th className="px-2 py-2 text-right">Transport</th>
                  <th className="px-2 py-2 text-right">Hamali</th>
                  <th className="px-2 py-2 text-right">Commission</th>
                  <th className="px-2 py-2 text-right">Net Income</th>
                  <th className="px-2 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {historyRows.map((row) => {
                  const quantity = row.entries.reduce((sum, entry) => sum + entry.productionKg, 0);
                  const gross = row.entries.reduce((sum, entry) => sum + entry.productionKg * entry.ratePerKg, 0);
                  const averageRate = quantity > 0 ? gross / quantity : 0;
                  const costs = row.transportCost + row.hamaliCost + row.commissionCost;
                  return (
                  <tr key={row.id}>
                    <td className="px-2 py-3 text-stone-700">{formatDate(row.entryDate)}</td>
                    <td className="px-2 py-3 text-right font-medium">{quantity.toLocaleString('en-IN')} {quantityUnit}</td>
                    <td className="px-2 py-3 text-right">{formatCurrency(averageRate)}</td>
                    <td className="px-2 py-3 text-right">{formatCurrency(gross)}</td>
                    <td className="px-2 py-3 text-right">{formatCurrency(row.transportCost)}</td>
                    <td className="px-2 py-3 text-right">{formatCurrency(row.hamaliCost)}</td>
                    <td className="px-2 py-3 text-right">{formatCurrency(row.commissionCost)}</td>
                    <td className="px-2 py-3 text-right font-bold text-stone-900">{formatCurrency(gross - costs)}</td>
                    <td className="px-2 py-3 text-right">
                      {row.editable ? (
                        <div className="flex justify-end gap-2">
                          <button type="button" aria-label="Edit sale entry" onClick={() => editHistory(row)} className="rounded-lg border border-stone-300 p-2 text-stone-700 hover:bg-stone-100"><Pencil className="h-4 w-4" /></button>
                          <button type="button" aria-label="Delete sale entry" onClick={() => onDelete(row.id, row.kind)} className="rounded-lg border border-rose-200 p-2 text-rose-700 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      ) : <span className="text-xs text-stone-400">—</span>}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>}
      {!allCropsMode && <div className="border-t border-stone-100 p-5">
        <h3 className="mb-3 font-bold text-stone-800">Fertilizer Applications</h3>
        {!fertilizerHistory.length ? (
          <p className="rounded-xl bg-stone-50 p-4 text-center text-sm text-stone-500">No fertilizer has been applied to this crop yet.</p>
        ) : (
          <div className="divide-y divide-stone-100 rounded-xl border border-stone-200">
            {fertilizerHistory.map((application) => (
              <div key={application.id} className="flex flex-wrap items-start justify-between gap-2 p-3 text-sm">
                <span className="min-w-28 font-medium text-stone-700">{formatDate(application.applicationDate)}</span>
                <div className="min-w-0 flex-1 text-stone-700">
                  <p className="font-semibold">{application.title}{application.detail ? ` · ${application.detail}` : ''}</p>
                </div>
                <strong className="text-stone-900">{formatCurrency(application.totalCost)}</strong>
              </div>
            ))}
          </div>
        )}
      </div>}
    </article>
  );
}

function SummaryMetric({ title, value, emphasize = false }: { title: string; value: string; emphasize?: boolean }) {
  return (
    <div className="rounded-xl border border-blue-100 bg-white/80 p-3">
      <p className="text-xs font-medium text-stone-500">{title}</p>
      <p className={`mt-1 text-lg font-black ${emphasize ? 'text-blue-700' : 'text-stone-900'}`}>{value}</p>
    </div>
  );
}
