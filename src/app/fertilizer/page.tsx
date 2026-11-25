'use client';

import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { useFarm } from '@/context/FarmContext';
import { FlaskConical, Plus, Sprout, ShoppingBag, Pencil, Trash2, Save, X } from 'lucide-react';
import { Modal } from '@/components/common/Modal';

type FertilizerItem = { id: string; farmId: string; name: string; quantity: number; unit: string; unitPrice: number; minStockAlert: number; notes?: string | null };
type CropOption = { id: string; farmId: string; name: string; variety?: string | null; field?: { name: string }; fieldSection?: { name: string } | null };
type Purchase = { id: string; purchaseDate: string; quantity: number; unit: string; ratePerUnit: number; totalCost: number; supplier?: string | null; notes?: string | null; inventoryItem: FertilizerItem };
type Application = { id: string; applicationDate: string; quantity: number; unit: string; unitPrice: number; totalCost: number; method?: string | null; notes?: string | null; crop: CropOption; inventoryItem: FertilizerItem };
type ApplicationHistoryRow = {
  id: string;
  applicationDate: string;
  dateKey: string;
  crop: CropOption;
  title: string;
  quantityText: string;
  totalCost: number;
  applications: { id: string; name: string; quantity: number; unit: string }[];
};
type MixIngredient = { inventoryItemId: string; quantity: number; unit: string; inventoryItem?: FertilizerItem | null };
type CropMix = { id: string; name: string; items: MixIngredient[]; crop: CropOption };

const today = () => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
};
const inputClass = 'mt-1 w-full rounded-xl border border-stone-300 bg-white p-2.5 text-sm';
const labelClass = 'text-sm font-semibold text-stone-700';

export default function FertilizerPage() {
  const { selectedFarmId, farms } = useFarm();
  const farmId = selectedFarmId !== 'ALL' ? selectedFarmId : farms[0]?.id || '';
  const [items, setItems] = useState<FertilizerItem[]>([]);
  const [crops, setCrops] = useState<CropOption[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [mixes, setMixes] = useState<CropMix[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'stock' | 'applications'>('stock');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);
  const [editPurchaseForm, setEditPurchaseForm] = useState({ name: '', quantity: '', totalPrice: '', purchaseDate: '', supplier: '', notes: '' });
  const [editingApplication, setEditingApplication] = useState<ApplicationHistoryRow | null>(null);
  const [applicationEditDate, setApplicationEditDate] = useState('');
  const [applicationEditQuantities, setApplicationEditQuantities] = useState<Record<string, string>>({});
  const [purchaseForm, setPurchaseForm] = useState({ inventoryItemId: '', name: '', quantity: '', unit: 'kg', totalPrice: '', purchaseDate: today(), supplier: '', notes: '' });
  const [applicationForm, setApplicationForm] = useState({ cropId: '', inventoryItemId: '', quantity: '', applicationDate: today(), method: 'Fertigation', notes: '' });
  const [mixForm, setMixForm] = useState({ cropId: '', name: '', items: [{ inventoryItemId: '', quantity: '', unit: '' }] });
  const [applyDates, setApplyDates] = useState<Record<string, string>>({});
  const isNewFertilizer = purchaseForm.inventoryItemId === '__new__' || !purchaseForm.inventoryItemId;
  const selectedStock = items.find((item) => item.id === applicationForm.inventoryItemId);
  const totalStockValue = useMemo(() => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0), [items]);

  const loadData = async () => {
    if (!farmId) { setLoading(false); return; }
    setLoading(true);
    setError('');
    try {
      const [stockResponse, cropResponse, purchaseResponse, applicationResponse, mixResponse] = await Promise.all([
        fetch(`/api/harvest?farmId=${farmId}`), fetch(`/api/crops?farmId=${farmId}`),
        fetch(`/api/fertilizer/purchases?farmId=${farmId}`), fetch(`/api/fertilizer/applications?farmId=${farmId}`), fetch(`/api/fertilizer/combinations?farmId=${farmId}`),
      ]);
      const [stockData, cropData, purchaseData, applicationData, mixData] = await Promise.all([stockResponse.json(), cropResponse.json(), purchaseResponse.json(), applicationResponse.json(), mixResponse.json()]);
      for (const [response, data] of [[stockResponse, stockData], [cropResponse, cropData], [purchaseResponse, purchaseData], [applicationResponse, applicationData], [mixResponse, mixData]] as const) {
        if (!response.ok) throw new Error(data.error || 'Unable to load fertilizer records.');
      }
      setItems((stockData.inventoryItems || []).filter((item: FertilizerItem & { category: string }) => item.category === 'FERTILIZER'));
      setCrops(cropData || []);
      setPurchases(purchaseData || []);
      setApplications(applicationData || []);
      setMixes(mixData || []);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load fertilizer records.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [farmId]);
  useEffect(() => {
    if (!purchaseForm.inventoryItemId || purchaseForm.inventoryItemId === '__new__') return;
    const item = items.find((candidate) => candidate.id === purchaseForm.inventoryItemId);
    if (item) setPurchaseForm((current) => ({ ...current, name: item.name, unit: item.unit }));
  }, [purchaseForm.inventoryItemId, items]);

  const submit = async (event: FormEvent, kind: 'purchase' | 'application') => {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    const isPurchase = kind === 'purchase';
    try {
      const response = await fetch(`/api/fertilizer/${isPurchase ? 'purchases' : 'applications'}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isPurchase
          ? { farmId, ...purchaseForm, inventoryItemId: isNewFertilizer ? '' : purchaseForm.inventoryItemId }
          : applicationForm),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to save fertilizer record.');
      setMessage(isPurchase ? 'Purchase saved and added to stock.' : 'Application saved, stock reduced, and crop expense recorded.');
      if (isPurchase) setPurchaseForm({ inventoryItemId: '', name: '', quantity: '', unit: 'kg', totalPrice: '', purchaseDate: today(), supplier: '', notes: '' });
      else setApplicationForm((current) => ({ ...current, inventoryItemId: '', quantity: '', applicationDate: today(), notes: '' }));
      await loadData();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save fertilizer record.'); }
    finally { setSaving(false); }
  };

  const beginEditPurchase = (purchase: Purchase) => {
    setError(''); setMessage(''); setEditingPurchaseId(purchase.id);
    setEditPurchaseForm({ name: purchase.inventoryItem.name, quantity: String(purchase.quantity), totalPrice: String(purchase.totalCost), purchaseDate: purchase.purchaseDate.slice(0, 10), supplier: purchase.supplier || '', notes: purchase.notes || '' });
  };

  const savePurchaseEdit = async (event: FormEvent, purchase: Purchase) => {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    try {
      const response = await fetch(`/api/fertilizer/purchases/${purchase.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editPurchaseForm, unit: purchase.unit, totalPrice: Number(editPurchaseForm.totalPrice) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to update purchase.');
      setEditingPurchaseId(null); setMessage('Purchase entry updated and stock adjusted.'); await loadData();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to update purchase.'); }
    finally { setSaving(false); }
  };

  const deletePurchase = async (purchase: Purchase) => {
    if (!window.confirm(`Delete the ${purchase.quantity} ${purchase.unit} ${purchase.inventoryItem.name} purchase from ${date(purchase.purchaseDate)}? Stock will be adjusted.`)) return;
    setSaving(true); setError(''); setMessage('');
    try {
      const response = await fetch(`/api/fertilizer/purchases/${purchase.id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to delete purchase.');
      setMessage('Purchase entry deleted and stock adjusted.'); await loadData();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to delete purchase.'); }
    finally { setSaving(false); }
  };

  const updateMixIngredient = (index: number, changes: Partial<(typeof mixForm.items)[number]>) => setMixForm((current) => ({
    ...current,
    items: current.items.map((row, rowIndex) => rowIndex === index ? { ...row, ...changes } : row),
  }));

  const saveMix = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/fertilizer/combinations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cropId: mixForm.cropId, name: mixForm.name, items: mixForm.items.map((row) => ({ ...row, quantity: Number(row.quantity) })) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to save fertilizer combination.');
      setMessage(`Combination saved for ${cropLabel(data.crop)}.`);
      setMixForm({ cropId: '', name: '', items: [{ inventoryItemId: '', quantity: '', unit: '' }] });
      await loadData();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save fertilizer combination.'); }
    finally { setSaving(false); }
  };

  const applyMix = async (mix: CropMix) => {
    setSaving(true); setError(''); setMessage('');
    try {
      const response = await fetch(`/api/fertilizer/combinations/${mix.id}/apply`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationDate: applyDates[mix.id] || today() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to apply fertilizer combination.');
      setMessage(`${mix.name} applied to ${cropLabel(mix.crop)}. Stock and crop expenses updated.`);
      await loadData();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to apply fertilizer combination.'); }
    finally { setSaving(false); }
  };

  const currency = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value || 0);
  const date = (value: string) => new Date(value).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
  const cropLabel = (crop: CropOption) => `${crop.name}${crop.variety ? ` (${crop.variety})` : ''} · ${crop.field?.name || 'Field'}${crop.fieldSection?.name ? ` / ${crop.fieldSection.name}` : ''}`;
  const applicationHistory = useMemo(() => {
    const rows = new Map<string, ApplicationHistoryRow>();
    for (const application of applications) {
      const dateParts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' })
        .formatToParts(new Date(application.applicationDate));
      const dateKey = `${dateParts.find((part) => part.type === 'year')?.value}-${dateParts.find((part) => part.type === 'month')?.value}-${dateParts.find((part) => part.type === 'day')?.value}`;
      const mixName = application.method?.startsWith('Combination: ')
        ? application.method.slice('Combination: '.length)
        : null;
      const key = mixName ? `${application.crop.id}:${dateKey}:${mixName}` : application.id;
      const existing = rows.get(key);
      if (existing) {
        existing.totalCost += application.totalCost;
      } else {
        rows.set(key, {
          id: key,
          applicationDate: application.applicationDate,
          dateKey,
          crop: application.crop,
          title: mixName ? mixName : application.inventoryItem.name,
          quantityText: mixName ? '' : `${application.quantity} ${application.unit}${application.method ? ` · ${application.method}` : ''}`,
          totalCost: application.totalCost,
          applications: [{ id: application.id, name: application.inventoryItem.name, quantity: application.quantity, unit: application.unit }],
        });
      }
      if (existing) existing.applications.push({ id: application.id, name: application.inventoryItem.name, quantity: application.quantity, unit: application.unit });
    }
    return Array.from(rows.values()).sort((a, b) => new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime());
  }, [applications]);

  const beginEditApplication = (row: ApplicationHistoryRow) => {
    setEditingApplication(row);
    setApplicationEditDate(row.dateKey);
    setApplicationEditQuantities(Object.fromEntries(row.applications.map((application) => [application.id, String(application.quantity)])));
    setError('');
  };

  const saveApplicationEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingApplication) return;
    setSaving(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/fertilizer/applications/manage', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationDate: applicationEditDate,
          applications: editingApplication.applications.map((application) => ({ id: application.id, quantity: applicationEditQuantities[application.id] })),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to update fertilizer application.');
      setEditingApplication(null);
      setMessage(`${editingApplication.title} application updated. Stock and expense records were adjusted.`);
      await loadData();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to update fertilizer application.'); }
    finally { setSaving(false); }
  };

  const deleteApplication = async (row: ApplicationHistoryRow) => {
    if (!window.confirm(`Delete ${row.title} application for ${cropLabel(row.crop)} on ${date(row.applicationDate)}? Stock will be returned.`)) return;
    setSaving(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/fertilizer/applications/manage', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationIds: row.applications.map((application) => application.id) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to delete fertilizer application.');
      setMessage(`${row.title} application deleted. Stock was returned and the expense was removed.`);
      await loadData();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to delete fertilizer application.'); }
    finally { setSaving(false); }
  };

  return <main className="mx-auto max-w-6xl space-y-5 pb-12">
    <header className="flex flex-col justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
      <div><h1 className="flex items-center gap-2 text-2xl font-bold text-stone-900"><FlaskConical className="h-6 w-6 text-blue-600" /> Fertilizer (Khad)</h1><p className="mt-1 text-sm text-stone-500">Track purchases, available stock, and crop-wise fertilizer use.</p></div>
      <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm"><span className="text-stone-600">Current stock value</span><p className="font-bold text-blue-800">{currency(totalStockValue)}</p></div>
    </header>
    {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
    {message && <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">{message}</div>}
    <div className="flex gap-2 rounded-xl bg-stone-100 p-1">
      <button onClick={() => setTab('stock')} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${tab === 'stock' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600'}`}><ShoppingBag className="h-4 w-4" /> Stock & Purchases</button>
      <button onClick={() => setTab('applications')} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${tab === 'applications' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600'}`}><Sprout className="h-4 w-4" /> Crop Applications</button>
    </div>

    {tab === 'stock' ? <>
      <form onSubmit={(event) => submit(event, 'purchase')} className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-3">
        <h2 className="text-lg font-bold text-stone-900 sm:col-span-2 lg:col-span-3">Record Fertilizer Purchase</h2>
        <label className={labelClass}>Fertilizer<select value={purchaseForm.inventoryItemId || '__new__'} onChange={(event) => setPurchaseForm((current) => ({ ...current, inventoryItemId: event.target.value, name: event.target.value === '__new__' ? '' : current.name }))} className={inputClass}><option value="__new__">Add new fertilizer</option>{items.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.quantity} {item.unit} in stock)</option>)}</select></label>
        <label className={labelClass}>Fertilizer Name<input required value={purchaseForm.name} onChange={(event) => setPurchaseForm({ ...purchaseForm, name: event.target.value })} disabled={!isNewFertilizer} placeholder="e.g. Urea, DAP, NPK" className={inputClass} /></label>
        <label className={labelClass}>Purchase Date<input required type="date" value={purchaseForm.purchaseDate} onChange={(event) => setPurchaseForm({ ...purchaseForm, purchaseDate: event.target.value })} className={inputClass} /></label>
        <label className={labelClass}>Quantity<input required type="number" min="0.01" step="0.01" value={purchaseForm.quantity} onChange={(event) => setPurchaseForm({ ...purchaseForm, quantity: event.target.value })} className={inputClass} /></label>
        <label className={labelClass}>Unit<select value={purchaseForm.unit} disabled={!isNewFertilizer} onChange={(event) => setPurchaseForm({ ...purchaseForm, unit: event.target.value })} className={inputClass}><option value="kg">Kilograms (kg)</option><option value="Bag (50kg)">Bag (50 kg)</option><option value="Bag (45kg)">Bag (45 kg)</option><option value="Litre">Litre</option><option value="Packet">Packet</option></select></label>
        <label className={labelClass}>Total Price for This Quantity (₹)<input required type="number" min="0" step="0.01" value={purchaseForm.totalPrice} onChange={(event) => setPurchaseForm({ ...purchaseForm, totalPrice: event.target.value })} placeholder="Total bill amount" className={inputClass} />{Number(purchaseForm.quantity) > 0 && Number(purchaseForm.totalPrice) >= 0 && purchaseForm.totalPrice !== '' && <span className="mt-1 block text-xs font-medium text-stone-500">Effective rate: {currency(Number(purchaseForm.totalPrice) / Number(purchaseForm.quantity))} per {purchaseForm.unit}</span>}</label>
        <label className={labelClass}>Purchased From<input value={purchaseForm.supplier} onChange={(event) => setPurchaseForm({ ...purchaseForm, supplier: event.target.value })} placeholder="Shop or supplier" className={inputClass} /></label>
        <label className={labelClass}>Notes (optional)<input value={purchaseForm.notes} onChange={(event) => setPurchaseForm({ ...purchaseForm, notes: event.target.value })} className={inputClass} /></label>
        <button type="submit" disabled={saving || !farmId} className="flex items-center justify-center gap-2 self-end rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"><Plus className="h-4 w-4" />{saving ? 'Saving…' : 'Save Purchase'}</button>
      </form>
      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-stone-200 bg-stone-50 px-5 py-4"><h2 className="font-bold text-stone-800">Available Fertilizer Stock</h2><span className="text-sm text-stone-500">{items.length} items</span></div>
        {loading ? <p className="p-8 text-center text-stone-500">Loading stock…</p> : items.length === 0 ? <p className="p-8 text-center text-sm text-stone-500">No fertilizer in stock yet. Record your first purchase above.</p> : <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">{items.map((item) => <article key={item.id} className="rounded-xl border border-stone-200 p-4"><h3 className="font-bold text-stone-900">{item.name}</h3><p className="mt-2 text-sm text-stone-500">Available stock</p><p className={`text-xl font-bold ${item.quantity <= item.minStockAlert ? 'text-amber-700' : 'text-stone-900'}`}>{item.quantity} {item.unit}</p><p className="mt-1 text-sm text-stone-600">Average cost: {currency(item.unitPrice)} / unit</p>{item.quantity <= item.minStockAlert && <p className="mt-2 text-xs font-semibold text-amber-700">Low stock</p>}</article>)}</div>}
      </section>
      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-200 bg-stone-50 px-5 py-4"><h2 className="font-bold text-stone-800">Purchase History</h2></div>
        {loading ? <p className="p-6 text-center text-stone-500">Loading…</p> : purchases.length === 0 ? <p className="p-6 text-center text-sm text-stone-500">Purchases will appear here.</p> : <div className="divide-y divide-stone-100">
          {purchases.map((purchase) => editingPurchaseId === purchase.id ? (
            <form key={purchase.id} onSubmit={(event) => savePurchaseEdit(event, purchase)} className="grid gap-3 bg-blue-50/50 p-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className={labelClass}>Fertilizer Name<input required value={editPurchaseForm.name} onChange={(event) => setEditPurchaseForm({ ...editPurchaseForm, name: event.target.value })} className={inputClass} /></label>
              <label className={labelClass}>Purchase Date<input required type="date" value={editPurchaseForm.purchaseDate} onChange={(event) => setEditPurchaseForm({ ...editPurchaseForm, purchaseDate: event.target.value })} className={inputClass} /></label>
              <label className={labelClass}>Quantity ({purchase.unit})<input required type="number" min="0.01" step="0.01" value={editPurchaseForm.quantity} onChange={(event) => setEditPurchaseForm({ ...editPurchaseForm, quantity: event.target.value })} className={inputClass} /></label>
              <label className={labelClass}>Total Price for This Quantity (₹)<input required type="number" min="0" step="0.01" value={editPurchaseForm.totalPrice} onChange={(event) => setEditPurchaseForm({ ...editPurchaseForm, totalPrice: event.target.value })} className={inputClass} />{Number(editPurchaseForm.quantity) > 0 && Number(editPurchaseForm.totalPrice) >= 0 && editPurchaseForm.totalPrice !== '' && <span className="mt-1 block text-xs text-stone-500">Effective rate: {currency(Number(editPurchaseForm.totalPrice) / Number(editPurchaseForm.quantity))} per {purchase.unit}</span>}</label>
              <label className={labelClass}>Purchased From<input value={editPurchaseForm.supplier} onChange={(event) => setEditPurchaseForm({ ...editPurchaseForm, supplier: event.target.value })} className={inputClass} /></label>
              <label className={labelClass}>Notes<input value={editPurchaseForm.notes} onChange={(event) => setEditPurchaseForm({ ...editPurchaseForm, notes: event.target.value })} className={inputClass} /></label>
              <div className="flex justify-end gap-2 sm:col-span-2 lg:col-span-3"><button type="button" onClick={() => setEditingPurchaseId(null)} className="flex items-center gap-1 rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700"><X className="h-4 w-4" />Cancel</button><button type="submit" disabled={saving} className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"><Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save Changes'}</button></div>
            </form>
          ) : (
            <div key={purchase.id} className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
              <div className="grid flex-1 gap-2 text-sm sm:grid-cols-4 sm:items-center"><span className="font-semibold">{date(purchase.purchaseDate)}</span><span className="font-medium">{purchase.inventoryItem.name}</span><span>{purchase.quantity} {purchase.unit}</span><span>{purchase.supplier || 'Supplier not entered'}</span></div>
              <div className="flex items-center justify-between gap-3 sm:justify-end"><strong>{currency(purchase.totalCost)}</strong><div className="flex gap-2"><button type="button" aria-label="Edit fertilizer purchase" onClick={() => beginEditPurchase(purchase)} className="rounded-lg border border-stone-300 p-2 text-stone-700 hover:bg-stone-100"><Pencil className="h-4 w-4" /></button><button type="button" aria-label="Delete fertilizer purchase" disabled={saving} onClick={() => deletePurchase(purchase)} className="rounded-lg border border-rose-200 p-2 text-rose-700 hover:bg-rose-50 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button></div></div>
            </div>
          ))}
        </div>}
      </section>
    </> : <>
      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="mb-4"><h2 className="text-lg font-bold text-stone-900">Fertilizers Available for Combinations</h2><p className="mt-1 text-sm text-stone-500">Choose any items below to build a saved dose for a specific crop and plot.</p></div>
        {items.length === 0 ? <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Add fertilizer purchases to stock before creating a combination.</p> : <div className="flex flex-wrap gap-2">{items.map((item) => <span key={item.id} className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-sm"><strong>{item.name}</strong><span className="ml-2 text-stone-500">{item.quantity} {item.unit}</span></span>)}</div>}
      </section>

      <form onSubmit={saveMix} className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div><h2 className="text-lg font-bold text-stone-900">Create Crop Fertilizer Combination</h2><p className="mt-1 text-sm text-stone-500">Example: Summit 150 g + Boron 150 g + 12:61 1 kg. Save it for a particular crop/plot, then apply it on the required date.</p></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>Crop / Plot<select required value={mixForm.cropId} onChange={(event) => setMixForm({ ...mixForm, cropId: event.target.value })} className={inputClass}><option value="">Select crop and plot</option>{crops.map((crop) => <option key={crop.id} value={crop.id}>{cropLabel(crop)}</option>)}</select></label>
          <label className={labelClass}>Combination Name<input required value={mixForm.name} onChange={(event) => setMixForm({ ...mixForm, name: event.target.value })} placeholder="e.g. Weekly fertigation mix" className={inputClass} /></label>
        </div>
        <div className="space-y-3">
          {mixForm.items.map((row, index) => {
            const item = items.find((candidate) => candidate.id === row.inventoryItemId);
            const doseUnits = item ? (item.unit.toLowerCase() === 'kg' ? [item.unit, 'g'] : item.unit.toLowerCase() === 'litre' ? [item.unit, 'ml'] : [item.unit]) : [];
            return <div key={index} className="grid items-end gap-3 rounded-xl border border-stone-200 bg-stone-50/60 p-3 sm:grid-cols-[1.5fr_1fr_1fr_auto]">
              <label className={labelClass}>Fertilizer<select required value={row.inventoryItemId} onChange={(event) => { const selected = items.find((candidate) => candidate.id === event.target.value); updateMixIngredient(index, { inventoryItemId: event.target.value, unit: selected?.unit || '' }); }} className={inputClass}><option value="">Choose fertilizer</option>{items.map((stock) => <option key={stock.id} value={stock.id}>{stock.name} · {stock.quantity} {stock.unit} in stock</option>)}</select></label>
              <label className={labelClass}>Dose Quantity<input required type="number" min="0.001" step="0.001" value={row.quantity} onChange={(event) => updateMixIngredient(index, { quantity: event.target.value })} placeholder="e.g. 150" className={inputClass} /></label>
              <label className={labelClass}>Dose Unit<select required disabled={!item} value={row.unit} onChange={(event) => updateMixIngredient(index, { unit: event.target.value })} className={inputClass}>{!item && <option value="">Select fertilizer first</option>}{doseUnits.map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select></label>
              <button type="button" disabled={mixForm.items.length <= 1} onClick={() => setMixForm((current) => ({ ...current, items: current.items.filter((_, rowIndex) => rowIndex !== index) }))} className="rounded-xl border border-rose-200 p-2.5 text-rose-700 disabled:opacity-30" aria-label="Remove fertilizer from combination"><Trash2 className="h-4 w-4" /></button>
            </div>;
          })}
        </div>
        <div className="flex flex-wrap justify-between gap-3">
          <button type="button" onClick={() => setMixForm((current) => ({ ...current, items: [...current.items, { inventoryItemId: '', quantity: '', unit: '' }] }))} className="flex items-center gap-1 rounded-xl border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700"><Plus className="h-4 w-4" />Add Fertilizer</button>
          <button type="submit" disabled={saving || !farmId || mixForm.items.length < 2 || mixForm.items.some((row) => !row.inventoryItemId || !row.quantity || !row.unit)} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save Combination'}</button>
        </div>
      </form>

      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-200 bg-stone-50 px-5 py-4"><h2 className="font-bold text-stone-800">Saved Crop Combinations</h2></div>
        {loading ? <p className="p-6 text-center text-stone-500">Loading combinations…</p> : mixes.length === 0 ? <p className="p-8 text-center text-sm text-stone-500">Saved combinations will appear here.</p> : <div className="grid gap-3 p-4 md:grid-cols-2">{mixes.map((mix) => <article key={mix.id} className="rounded-xl border border-stone-200 p-4">
          <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase text-blue-700">{cropLabel(mix.crop)}</p><h3 className="mt-1 font-bold text-stone-900">{mix.name}</h3></div><span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-600">Saved dose</span></div>
          <ul className="mt-3 space-y-1 text-sm text-stone-700">{mix.items.map((ingredient) => <li key={ingredient.inventoryItemId} className="flex justify-between gap-2"><span>{ingredient.inventoryItem?.name || 'Fertilizer unavailable'}</span><span className="font-semibold">{ingredient.quantity} {ingredient.unit}</span></li>)}</ul>
          <div className="mt-4 flex items-end gap-2 border-t border-stone-100 pt-3"><label className={`${labelClass} flex-1`}>Apply Date<input type="date" value={applyDates[mix.id] || today()} onChange={(event) => setApplyDates((current) => ({ ...current, [mix.id]: event.target.value }))} className={inputClass} /></label><button type="button" disabled={saving || mix.items.some((ingredient) => !ingredient.inventoryItem)} onClick={() => applyMix(mix)} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{saving ? 'Saving…' : 'Apply Mix'}</button></div>
        </article>)}</div>}
      </section>

      <form onSubmit={(event) => submit(event, 'application')} className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-3">
        <h2 className="text-lg font-bold text-stone-900 sm:col-span-2 lg:col-span-3">Apply Fertilizer to a Crop</h2>
        <label className={labelClass}>Crop / Plot<select required value={applicationForm.cropId} onChange={(event) => setApplicationForm({ ...applicationForm, cropId: event.target.value })} className={inputClass}><option value="">Select crop</option>{crops.map((crop) => <option key={crop.id} value={crop.id}>{cropLabel(crop)}</option>)}</select></label>
        <label className={labelClass}>Fertilizer<select required value={applicationForm.inventoryItemId} onChange={(event) => setApplicationForm({ ...applicationForm, inventoryItemId: event.target.value, quantity: '' })} className={inputClass}><option value="">Select fertilizer stock</option>{items.map((item) => <option key={item.id} value={item.id}>{item.name} — {item.quantity} {item.unit} available</option>)}</select></label>
        <label className={labelClass}>Application Date<input required type="date" value={applicationForm.applicationDate} onChange={(event) => setApplicationForm({ ...applicationForm, applicationDate: event.target.value })} className={inputClass} /></label>
        <label className={labelClass}>Quantity Used {selectedStock ? `(${selectedStock.unit})` : ''}<input required type="number" min="0.01" step="0.01" max={selectedStock?.quantity} value={applicationForm.quantity} onChange={(event) => setApplicationForm({ ...applicationForm, quantity: event.target.value })} placeholder={selectedStock ? `Up to ${selectedStock.quantity} ${selectedStock.unit}` : 'Select fertilizer first'} className={inputClass} /></label>
        <label className={labelClass}>Application Method<select value={applicationForm.method} onChange={(event) => setApplicationForm({ ...applicationForm, method: event.target.value })} className={inputClass}><option>Fertigation</option><option>Basal application</option><option>Soil application</option><option>Foliar spray</option><option>Other</option></select></label>
        <label className={labelClass}>Notes (optional)<input value={applicationForm.notes} onChange={(event) => setApplicationForm({ ...applicationForm, notes: event.target.value })} className={inputClass} /></label>
        <div className="flex items-end justify-between gap-3"><p className="pb-2 text-sm text-stone-600">Estimated cost: <strong>{currency(Number(applicationForm.quantity || 0) * (selectedStock?.unitPrice || 0))}</strong></p><button type="submit" disabled={saving || !farmId || !crops.length || !items.length} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save Application'}</button></div>
      </form>
      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-200 bg-stone-50 px-5 py-4"><h2 className="font-bold text-stone-800">Crop Application History</h2></div>
        {loading ? <p className="p-6 text-center text-stone-500">Loading…</p> : applicationHistory.length === 0 ? <p className="p-6 text-center text-sm text-stone-500">No fertilizer applications recorded yet.</p> : <div className="divide-y divide-stone-100">
          {applicationHistory.map((application) => <article key={application.id} className="grid gap-2 p-4 text-sm sm:grid-cols-[1fr_1.5fr_1.5fr_auto_auto] sm:items-center">
            <span className="font-semibold">{date(application.applicationDate)}</span>
            <span>{cropLabel(application.crop)}</span>
            <span className="font-medium">{application.title}{application.quantityText ? ` · ${application.quantityText}` : ''}</span>
            <strong>{currency(application.totalCost)}</strong>
            <div className="flex gap-2"><button type="button" aria-label={`Edit ${application.title} application`} disabled={saving} onClick={() => beginEditApplication(application)} className="rounded-lg border border-stone-300 p-2 text-stone-700 hover:bg-stone-100 disabled:opacity-50"><Pencil className="h-4 w-4" /></button><button type="button" aria-label={`Delete ${application.title} application`} disabled={saving} onClick={() => deleteApplication(application)} className="rounded-lg border border-rose-200 p-2 text-rose-700 hover:bg-rose-50 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button></div>
          </article>)}
        </div>}
      </section>
      <Modal isOpen={!!editingApplication} onClose={() => setEditingApplication(null)} title={`Edit ${editingApplication?.title || 'fertilizer application'}`} subtitle="Stock quantity and expense records will be adjusted with this change.">
        {editingApplication && <form onSubmit={saveApplicationEdit} className="space-y-4">
          <label className={labelClass}>Application Date<input required type="date" value={applicationEditDate} onChange={(event) => setApplicationEditDate(event.target.value)} className={inputClass} /></label>
          <div className="space-y-3">
            {editingApplication.applications.map((application) => <label key={application.id} className={`${labelClass} block`}>{application.name} quantity ({application.unit})
              <input required type="number" min="0.001" step="0.001" value={applicationEditQuantities[application.id] || ''} onChange={(event) => setApplicationEditQuantities((current) => ({ ...current, [application.id]: event.target.value }))} className={inputClass} />
            </label>)}
          </div>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setEditingApplication(null)} className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700">Cancel</button><button type="submit" disabled={saving} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save Changes'}</button></div>
        </form>}
      </Modal>
    </>}
  </main>;
}
