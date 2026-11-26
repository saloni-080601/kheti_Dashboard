'use client';

import React, { useState, useEffect } from 'react';
import { useFarm } from '@/context/FarmContext';
import { Modal } from '@/components/common/Modal';
import {
  Receipt,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Sprout,
  CalendarDays,
  ChevronDown,
  Pencil,
} from 'lucide-react';

function farmDateKey(value: string | Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function formatFarmDate(value: string | Date) {
  return new Date(value).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric',
  });
}

function cropLifecycleEvents(crop: any) {
  const events: any[] = [{
    id: `planting-${crop.id}`,
    date: crop.sowingDate,
    title: 'Planting / Sowing',
    detail: crop.field?.name || 'Crop planting recorded',
    status: 'COMPLETED',
    kind: 'planting',
  }];

  for (const stage of crop.stages || []) {
    if (stage.stageNumber === 6 || stage.stageNumber > 8) continue;
    const date = stage.actualDate || stage.completedDate || stage.expectedDate;
    if (!date) continue;
    events.push({
      id: `stage-${stage.id}`,
      date,
      title: stage.stageName || stage.hindiName,
      detail: stage.stageName || stage.hindiName,
      status: stage.status || 'PENDING',
      kind: 'stage',
    });
  }

  for (const activity of crop.activities || []) {
    events.push({
      id: `activity-${activity.id}`,
      date: activity.date,
      title: activity.title,
      detail: `${activity.activityType?.replaceAll('_', ' ') || 'Farm activity'}${activity.cost > 0 ? ` · Expense ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(activity.cost)}` : ''}`,
      status: activity.status || 'COMPLETED',
      kind: 'activity',
    });
  }

  const fertilizerGroups = new Map<string, any>();
  for (const application of crop.fertilizerApplications || []) {
    const date = farmDateKey(application.applicationDate);
    const mixName = application.method?.startsWith('Combination: ')
      ? application.method.slice('Combination: '.length)
      : null;
    const key = mixName ? `${date}:${mixName}` : application.id;
    const group = fertilizerGroups.get(key);
    if (group) {
      group.totalCost += application.totalCost || 0;
      group.items.push(application);
    } else {
      fertilizerGroups.set(key, { date: application.applicationDate, mixName, totalCost: application.totalCost || 0, items: [application] });
    }
  }
  fertilizerGroups.forEach((group, key) => {
    const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
    events.push({
      id: `fertilizer-${key}`,
      date: group.date,
      title: group.mixName ? `Mix applied: ${group.mixName}` : `${group.items[0].inventoryItem?.name || 'Fertilizer'} applied`,
      detail: group.mixName
        ? `${group.items.length} ingredients · Total expense ${currency.format(group.totalCost)}`
        : `${group.items[0].quantity} ${group.items[0].unit} · Expense ${currency.format(group.totalCost)}`,
      status: 'COMPLETED',
      kind: 'fertilizer',
    });
  });

  for (const harvest of crop.harvestLogs || []) {
    events.push({
      id: `harvest-${harvest.id}`,
      date: harvest.harvestDate,
      title: 'Harvest / तुड़ाई',
      detail: `${Number(harvest.quantity).toLocaleString('en-IN')} ${harvest.unit || 'Kg'}${harvest.grade ? ` · ${harvest.grade}` : ''}`,
      status: 'COMPLETED',
      kind: 'harvest',
    });
  }

  return events.sort((a, b) => farmDateKey(a.date).localeCompare(farmDateKey(b.date)) || a.title.localeCompare(b.title));
}

function cropFinancials(crop: any) {
  const entries = [
    ...(crop.productionEntries || []).filter((entry: any) => !entry.batchId),
    ...(crop.productionBatches || []).flatMap((batch: any) => batch.entries || []),
  ];
  const grossIncome = entries.length
    ? entries.reduce((sum: number, entry: any) => sum + entry.productionKg * entry.ratePerKg, 0)
    : Number(crop.totalGrossAmount || 0);
  const deductions = entries.length
    ? (crop.productionBatches || []).reduce((sum: number, batch: any) => sum + (batch.hamaliCost || 0) + (batch.transportCost || 0) + (batch.commissionCost || 0), 0) +
      (crop.productionEntries || []).filter((entry: any) => !entry.batchId).reduce((sum: number, entry: any) => sum + (entry.hamaliCost || 0) + (entry.transportCost || 0) + (entry.commissionCost || 0), 0)
    : Number(crop.totalDeductions || 0);
  const netIncome = entries.length ? grossIncome - deductions : Number(crop.totalIncome || 0);
  const expenses = crop.expenses || [];
  const cropExpense = expenses.reduce((sum: number, expense: any) => sum + expense.amount, 0);
  const labourExpense = expenses.filter((expense: any) => expense.category === 'LABOUR').reduce((sum: number, expense: any) => sum + expense.amount, 0);
  return { cropExpense, grossIncome, netIncome, profit: netIncome - cropExpense, labourExpense };
}

function groupFertilizerCombinationExpenses(expenses: any[]) {
  const rows: any[] = [];
  const combinationGroups = new Map<string, any>();
  for (const expense of expenses) {
    const mixMatch = expense.category === 'FERTILIZERS'
      ? String(expense.notes || '').match(/^Fertilizer combination:\s*([^;]+)/i)
      : null;
    if (!mixMatch) {
      rows.push(expense);
      continue;
    }

    const mixName = mixMatch[1].trim();
    const dateKey = farmDateKey(expense.date);
    const key = `${expense.cropId || expense.cropName || ''}:${dateKey}:${mixName}`;
    let group = combinationGroups.get(key);
    if (!group) {
      group = {
        ...expense,
        id: `fertilizer-combination:${key}`,
        title: `Fertilizer Mix: ${mixName}`,
        amount: 0,
        sourceIds: [],
        ingredients: [],
        combinationName: mixName,
      };
      combinationGroups.set(key, group);
      rows.push(group);
    }
    group.amount += expense.amount;
    group.sourceIds.push(expense.id);
    const ingredientName = String(expense.title || '').split(' applied to ')[0];
    const dose = String(expense.notes || '').split(';').slice(1).join(';').trim();
    group.ingredients.push(dose ? `${ingredientName} (${dose})` : ingredientName);
    if (expense.paymentStatus !== 'PAID') group.paymentStatus = expense.paymentStatus;
  }
  return rows.sort((a, b) => farmDateKey(b.date).localeCompare(farmDateKey(a.date)));
}

export default function ExpensesPage() {
  const { selectedFarmId } = useFarm();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [farms, setFarms] = useState<any[]>([]);
  const [fields, setFields] = useState<any[]>([]);
  const [crops, setCrops] = useState<any[]>([]);
  const [selectedCropId, setSelectedCropId] = useState('TOTAL');
  const [selectedCropExpenseTab, setSelectedCropExpenseTab] = useState<'CROP' | 'TOTAL' | 'LABOUR'>('CROP');
  const [isLifecycleOpen, setIsLifecycleOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lockedCropExpenseId, setLockedCropExpenseId] = useState('');
  const [editingExpenseIds, setEditingExpenseIds] = useState<string[]>([]);

  const [form, setForm] = useState({
    farmId: '',
    fieldId: '',
    cropId: '',
    category: 'FERTILIZERS',
    title: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    paymentStatus: 'PAID',
    paymentMode: 'CASH',
    receiptNumber: '',
    notes: '',
  });

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [expRes, farmsRes, fieldsRes, cropsRes] = await Promise.all([
        fetch(`/api/expenses?farmId=${selectedFarmId}&category=${categoryFilter}`),
        fetch('/api/farms'),
        fetch(`/api/fields?farmId=${selectedFarmId}`),
        fetch(`/api/crops?farmId=${selectedFarmId}`),
      ]);

      if (expRes.ok && farmsRes.ok && fieldsRes.ok && cropsRes.ok) {
        setExpenses(await expRes.json());
        const farmsData = await farmsRes.json();
        const fieldsData = await fieldsRes.json();
        const cropsData = await cropsRes.json();

        setFarms(farmsData);
        setFields(fieldsData);
        setCrops(cropsData);
        setSelectedCropId((current) => current === 'TOTAL' || cropsData.some((crop: any) => crop.id === current) ? current : 'TOTAL');

        if (farmsData.length > 0 && !form.farmId) {
          setForm((prev) => ({ ...prev, farmId: farmsData[0].id }));
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
  }, [selectedFarmId, categoryFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const editing = editingExpenseIds.length > 0;
      const res = await fetch(editing ? `/api/expenses?id=${editingExpenseIds[0]}` : '/api/expenses', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, ...(editing ? { ids: editingExpenseIds } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (editing ? 'Failed to update expense' : 'Failed to record expense'));

      setSuccessMsg(editing ? 'Expense updated successfully.' : 'Farming expense recorded!');
      setIsModalOpen(false);
      setLockedCropExpenseId('');
      setEditingExpenseIds([]);
      setForm({
        farmId: farms[0]?.id || '',
        fieldId: '',
        cropId: '',
        category: 'FERTILIZERS',
        title: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        paymentStatus: 'PAID',
        paymentMode: 'CASH',
        receiptNumber: '',
        notes: '',
      });
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const openExpenseForEdit = (expense: any) => {
    setEditingExpenseIds(expense.sourceIds || [expense.id]);
    setLockedCropExpenseId(expense.cropId || '');
    setForm({
      farmId: expense.farmId,
      fieldId: expense.fieldId || '',
      cropId: expense.cropId || '',
      category: expense.category,
      title: expense.combinationName ? `Fertilizer Mix: ${expense.combinationName}` : expense.title,
      amount: String(expense.amount),
      date: farmDateKey(expense.date),
      paymentStatus: expense.paymentStatus || 'PAID',
      paymentMode: expense.paymentMode || 'CASH',
      receiptNumber: expense.receiptNumber || '',
      notes: expense.notes || '',
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const closeExpenseModal = () => {
    setIsModalOpen(false);
    setEditingExpenseIds([]);
    setLockedCropExpenseId('');
  };

  const handleDelete = async (expenseIds: string | string[]) => {
    const ids = Array.isArray(expenseIds) ? expenseIds : [expenseIds];
    const prompt = ids.length > 1
      ? `Delete this fertilizer mix and all ${ids.length} ingredient expense records?`
      : 'Are you sure you want to delete this expense record?';
    if (!confirm(prompt)) return;
    try {
      for (const id of ids) {
        const res = await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Unable to delete the expense record.');
      }
      setSuccessMsg(ids.length > 1 ? 'Fertilizer mix expense records deleted.' : 'Expense entry deleted.');
      await loadData();
    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : 'Unable to delete the expense record.');
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const totalExpenseSum = expenses.reduce((s, e) => s + e.amount, 0);
  const isAllCropsSelected = selectedCropId === 'TOTAL';
  const selectedCrop = isAllCropsSelected ? null : crops.find((crop) => crop.id === selectedCropId) || null;
  const cropExpenseRecords = crops.flatMap((crop) => (crop.expenses || []).map((expense: any) => ({
    ...expense,
    crop: expense.crop || crop,
    field: expense.field || crop.field,
    farm: expense.farm || crop.farm,
    cropName: crop.name,
  })));
  const selectedCropExpenses = (isAllCropsSelected ? cropExpenseRecords : cropExpenseRecords.filter((expense: any) => expense.cropId === selectedCropId))
    .sort((a: any, b: any) => farmDateKey(b.date).localeCompare(farmDateKey(a.date)));
  const selectedCropExpenseDisplayRows = groupFertilizerCombinationExpenses(selectedCropExpenses);
  const selectedCropExpenseTotal = selectedCropExpenses.reduce((sum: number, expense: any) => sum + expense.amount, 0);
  const selectedCropNonLabourExpenses = selectedCropExpenseDisplayRows.filter((expense: any) => expense.category !== 'LABOUR');
  const selectedCropLabourExpenses = selectedCropExpenses.filter((expense: any) => expense.category === 'LABOUR');
  const selectedCropLabourTotal = selectedCropLabourExpenses.reduce((sum: number, expense: any) => sum + expense.amount, 0);
  const selectedCropExpenseRows = selectedCropExpenseTab === 'LABOUR' ? selectedCropLabourExpenses : selectedCropNonLabourExpenses;
  const selectedCropExpensesByCategory = selectedCropExpenses.reduce((totals: Record<string, number>, expense: any) => {
    totals[expense.category] = (totals[expense.category] || 0) + expense.amount;
    return totals;
  }, {});
  const currentCropFinancials = selectedCrop ? cropFinancials(selectedCrop) : null;
  const allCropFinancials = crops.map(cropFinancials).reduce((totals, crop) => ({
    cropExpense: totals.cropExpense + crop.cropExpense,
    grossIncome: totals.grossIncome + crop.grossIncome,
    netIncome: totals.netIncome + crop.netIncome,
    profit: totals.profit + crop.profit,
    labourExpense: totals.labourExpense + crop.labourExpense,
  }), { cropExpense: 0, grossIncome: 0, netIncome: 0, profit: 0, labourExpense: 0 });
  const displayedFinancials = currentCropFinancials || allCropFinancials;
  const selectedCropTimeline = isAllCropsSelected
    ? crops.flatMap((crop) => cropLifecycleEvents(crop).map((event: any) => ({ ...event, cropName: crop.name, cropField: crop.field?.name })))
      .sort((a: any, b: any) => farmDateKey(a.date).localeCompare(farmDateKey(b.date)))
    : selectedCrop ? cropLifecycleEvents(selectedCrop) : [];

  // Group by category
  const categoryCounts: Record<string, number> = {};
  expenses.forEach((e) => {
    categoryCounts[e.category] = (categoryCounts[e.category] || 0) + e.amount;
  });

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <span>Farming Expenses Tracker</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800">
              खर्च का हिसाब
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Categorized expenditures for seeds, fertilizers, diesel, labour, lease rent, and repairs.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-stone-100 border border-stone-200 rounded-xl text-xs font-semibold text-stone-800"
          >
            <option value="ALL">All Categories (सभी खर्च)</option>
            <option value="SEEDS">Seeds (बीज)</option>
            <option value="FERTILIZERS">Fertilizers (खाद)</option>
            <option value="PESTICIDES">Pesticides (दवाई)</option>
            <option value="LABOUR">Labour (मजदूरी)</option>
            <option value="MACHINERY_FUEL">Machinery & Fuel (डीजल व यंत्र)</option>
            <option value="IRRIGATION">Irrigation (सिंचाई)</option>
            <option value="LEASE">Lease Rent (बटाई/पट्टा किराया)</option>
            <option value="TRANSPORT">Transport / Mandi (भाड़ा)</option>
            <option value="EQUIPMENT_REPAIR">Equipment Repairs (मरम्मत)</option>
            <option value="OTHER">Other Expenses</option>
          </select>


        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
          <span className="text-xs font-bold text-stone-500 uppercase">Total Expenses</span>
          <p className="text-2xl font-black text-rose-700 mt-1">{formatCurrency(totalExpenseSum)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
          <span className="text-xs font-bold text-stone-500 uppercase">Expense Items</span>
          <p className="text-2xl font-black text-stone-900 mt-1">{expenses.length} Records</p>
        </div>
        <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 shadow-sm">
          <span className="text-xs font-bold text-stone-600 uppercase">Top Expense</span>
          <p className="text-xl font-black text-stone-900 mt-1">
            {Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]
              ? `${Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0][0].replace('_', ' ')}: ${formatCurrency(
                  Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0][1]
                )}`
              : '—'}
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-200 bg-stone-50 px-5 py-4">
          <div className="flex items-center gap-2">
            <Sprout className="h-5 w-5 text-emerald-700" />
            <h2 className="font-bold text-stone-900">Crop Lifecycle & Expense</h2>
          </div>
          <p className="mt-1 text-xs text-stone-500">Select a crop to view its dated timeline from planting through harvest, along with its expenses.</p>
        </div>

        {crops.length === 0 ? <p className="p-5 text-sm text-stone-500">No crop records found for this farm.</p> : <div className="p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <label className="block w-full max-w-md text-xs font-semibold text-stone-600">Crop View
              <select value={selectedCropId} onChange={(event) => { setSelectedCropId(event.target.value); setSelectedCropExpenseTab(event.target.value === 'TOTAL' ? 'TOTAL' : 'CROP'); setIsLifecycleOpen(false); }} className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm font-semibold text-stone-800">
                <option value="TOTAL">Total · All Crops</option>
                {crops.map((crop) => <option key={crop.id} value={crop.id}>{crop.name}{crop.field?.name ? ` · ${crop.field.name}` : ''}</option>)}
              </select>
            </label>
            <button type="button" onClick={() => {
              setEditingExpenseIds([]);
              if (selectedCrop) {
                setLockedCropExpenseId(selectedCrop.id);
                setForm((current) => ({ ...current, farmId: selectedCrop.farmId, fieldId: selectedCrop.fieldId || '', cropId: selectedCrop.id }));
              } else {
                setLockedCropExpenseId('');
                setForm((current) => ({ ...current, farmId: selectedFarmId !== 'ALL' ? selectedFarmId : farms[0]?.id || current.farmId, fieldId: '', cropId: '' }));
              }
              setErrorMsg('');
              setIsModalOpen(true);
            }} className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-700">
              <Plus className="h-4 w-4" /> {selectedCrop ? `Add ${selectedCrop.name} Expense` : 'Add Expense'}
            </button>
          </div>

          {!selectedCrop && !isAllCropsSelected ? <p className="mt-4 rounded-xl border border-dashed border-stone-300 bg-stone-50 p-5 text-center text-sm text-stone-500">Choose a crop to view its timeline and expenses.</p> : <div className="mt-5 space-y-6">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-xl border border-rose-100 bg-rose-50 p-3"><span className="text-xs font-semibold text-rose-800">{selectedCrop ? 'Crop Expense' : 'Total Crop Expenses'}</span><p className="mt-1 font-bold text-rose-950">{formatCurrency(displayedFinancials.cropExpense)}</p></div>
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-3"><span className="text-xs font-semibold text-blue-800">Gross Income</span><p className="mt-1 font-bold text-blue-950">{formatCurrency(displayedFinancials.grossIncome)}</p></div>
              <div className="rounded-xl border border-violet-100 bg-violet-50 p-3"><span className="text-xs font-semibold text-violet-800">Net Income</span><p className="mt-1 font-bold text-violet-950">{formatCurrency(displayedFinancials.netIncome)}</p></div>
              <div className={`rounded-xl border p-3 ${displayedFinancials.profit >= 0 ? 'border-emerald-100 bg-emerald-50' : 'border-amber-100 bg-amber-50'}`}><span className={`text-xs font-semibold ${displayedFinancials.profit >= 0 ? 'text-emerald-800' : 'text-amber-800'}`}>Profit</span><p className={`mt-1 font-bold ${displayedFinancials.profit >= 0 ? 'text-emerald-950' : 'text-amber-950'}`}>{formatCurrency(displayedFinancials.profit)}</p></div>
              <div className="rounded-xl border border-orange-100 bg-orange-50 p-3"><span className="text-xs font-semibold text-orange-800">Labour Expense{selectedCrop ? ` · ${selectedCrop.name}` : ' · All Crops'}</span><p className="mt-1 font-bold text-orange-950">{formatCurrency(displayedFinancials.labourExpense)}</p></div>
            </div>

            {(selectedCrop || isAllCropsSelected) && <div>
              <button type="button" aria-expanded={isLifecycleOpen} onClick={() => setIsLifecycleOpen((open) => !open)} className="flex w-full items-center justify-between rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-left font-bold text-stone-900 hover:bg-stone-100">
                <span className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-emerald-700" /> Plantation to Harvest Flow</span>
                <ChevronDown className={`h-4 w-4 text-stone-500 transition-transform ${isLifecycleOpen ? 'rotate-180' : ''}`} />
              </button>
              {isLifecycleOpen && (selectedCropTimeline.length === 0 ? <p className="mt-3 rounded-xl bg-stone-50 p-4 text-sm text-stone-500">No timeline records are available for {selectedCrop?.name || 'these crops'} yet.</p> : <div className="mt-3 space-y-0">
                {selectedCropTimeline.map((event: any, index: number) => {
                  const completed = ['COMPLETED', 'DONE'].includes(event.status) || ['planting', 'fertilizer', 'harvest'].includes(event.kind);
                  const inProgress = event.status === 'IN_PROGRESS';
                  const skipped = event.status === 'SKIPPED' || event.status === 'CANCELLED';
                  const dotColor = skipped ? 'bg-stone-300' : completed ? 'bg-emerald-600' : inProgress ? 'bg-blue-600' : 'bg-amber-400';
                  const badgeColor = skipped ? 'bg-stone-100 text-stone-600' : completed ? 'bg-emerald-100 text-emerald-800' : inProgress ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800';
                  const statusText = skipped ? 'Skipped' : completed ? 'Done' : inProgress ? 'In progress' : 'Planned';
                  return <div key={event.id} className="grid grid-cols-[90px_18px_1fr] gap-2 sm:grid-cols-[110px_20px_1fr] sm:gap-3">
                    <div className="pt-3 text-right text-xs font-semibold text-stone-500">{formatFarmDate(event.date)}</div>
                    <div className="relative flex justify-center">
                      {index < selectedCropTimeline.length - 1 && <span className="absolute bottom-0 top-0 w-px bg-stone-200" />}
                      <span className={`relative mt-3 h-3 w-3 rounded-full ring-4 ring-white ${dotColor}`} />
                    </div>
                    <div className="mb-2 flex items-start justify-between gap-3 rounded-xl border border-stone-200 bg-white p-3">
                      <div><p className="text-sm font-semibold text-stone-900">{event.cropName ? `${event.cropName} · ` : ''}{event.title}</p><p className="mt-0.5 text-xs text-stone-500">{event.cropField ? `${event.cropField} · ` : ''}{event.detail}</p></div>
                      <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${badgeColor}`}>{statusText}</span>
                    </div>
                  </div>;
                })}
              </div>)}
            </div>}

            <div className="overflow-hidden rounded-xl border border-stone-200">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-stone-50 px-4 py-3">
                <div><h3 className="font-bold text-stone-900">{selectedCrop ? `${selectedCrop.name} · ` : 'All Crops · '}Expense Details</h3><p className="text-xs text-stone-500">{selectedCropExpenseTab === 'LABOUR' ? `Labour costs for ${selectedCrop?.name || 'all crops'}` : selectedCropExpenseTab === 'TOTAL' ? `Expense total and category breakdown for ${selectedCrop?.name || 'all crops'}` : `Crop expenses for ${selectedCrop?.name || 'all crops'}`}</p></div>
                <div className="text-right"><span className="block text-[10px] font-bold uppercase text-stone-500">{selectedCropExpenseTab === 'LABOUR' ? 'Labour Total' : 'Crop Total Expenses'}</span><span className="font-black text-rose-700">{formatCurrency(selectedCropExpenseTab === 'LABOUR' ? selectedCropLabourTotal : selectedCropExpenseTotal)}</span></div>
              </div>
              <div className="flex gap-2 border-b border-stone-200 bg-white px-4 py-3" role="tablist" aria-label="Selected crop expense views">
                <button type="button" role="tab" aria-selected={selectedCropExpenseTab === 'CROP'} onClick={() => setSelectedCropExpenseTab('CROP')} className={`rounded-lg px-3 py-2 text-xs font-semibold ${selectedCropExpenseTab === 'CROP' ? 'bg-rose-600 text-white' : 'border border-stone-300 text-stone-700 hover:bg-stone-50'}`}>Crop Expenses ({selectedCropNonLabourExpenses.length})</button>
                <button type="button" role="tab" aria-selected={selectedCropExpenseTab === 'TOTAL'} onClick={() => setSelectedCropExpenseTab('TOTAL')} className={`rounded-lg px-3 py-2 text-xs font-semibold ${selectedCropExpenseTab === 'TOTAL' ? 'bg-rose-600 text-white' : 'border border-stone-300 text-stone-700 hover:bg-stone-50'}`}>Total Expenses</button>
                <button type="button" role="tab" aria-selected={selectedCropExpenseTab === 'LABOUR'} onClick={() => setSelectedCropExpenseTab('LABOUR')} className={`rounded-lg px-3 py-2 text-xs font-semibold ${selectedCropExpenseTab === 'LABOUR' ? 'bg-rose-600 text-white' : 'border border-stone-300 text-stone-700 hover:bg-stone-50'}`}>Labour Expenses ({selectedCropLabourExpenses.length})</button>
              </div>
              {selectedCropExpenseTab === 'TOTAL' ? <div className="divide-y divide-stone-100">
                {Object.entries(selectedCropExpensesByCategory).length === 0 ? <p className="p-5 text-center text-sm text-stone-500">No expenses recorded for {selectedCrop?.name || 'these crops'}.</p> : (Object.entries(selectedCropExpensesByCategory) as [string, number][]).sort((a, b) => b[1] - a[1]).map(([category, amount]) => <div key={category} className="flex items-center justify-between gap-3 px-4 py-3"><span className="text-sm font-semibold text-stone-700">{category.replaceAll('_', ' ')}</span><span className="text-sm font-bold text-rose-700">{formatCurrency(amount)}</span></div>)}
                <div className="flex items-center justify-between gap-3 bg-rose-50 px-4 py-3"><span className="text-sm font-bold text-stone-900">Total Crop Expenses</span><span className="text-sm font-black text-rose-800">{formatCurrency(selectedCropExpenseTotal)}</span></div>
              </div> : selectedCropExpenseRows.length === 0 ? <p className="p-5 text-center text-sm text-stone-500">{selectedCropExpenseTab === 'LABOUR' ? `No labour expenses recorded for ${selectedCrop?.name || 'these crops'}.` : `No non-labour expenses recorded for ${selectedCrop?.name || 'these crops'}.`}</p> : <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-xs">
                  <thead className="border-b border-stone-200 bg-stone-50 font-semibold uppercase tracking-wide text-stone-600"><tr><th className="p-3">Date</th><th className="p-3">Category</th><th className="p-3">Title / Description</th><th className="p-3">Field / Crop</th><th className="p-3">Payment</th><th className="p-3 text-right">Amount</th><th className="p-3 text-right">Actions</th></tr></thead>
                  <tbody className="divide-y divide-stone-100">
                    {selectedCropExpenseRows.map((expense: any) => <tr key={expense.id} className="hover:bg-stone-50/60">
                      <td className="whitespace-nowrap p-3 font-medium text-stone-700">{formatFarmDate(expense.date)}</td>
                      <td className="p-3"><span className="rounded bg-stone-100 px-2 py-1 text-[10px] font-bold uppercase text-stone-700">{expense.category.replaceAll('_', ' ')}</span></td>
                      <td className="p-3 font-semibold text-stone-900">{expense.title}{expense.combinationName && <span className="block text-[10px] font-medium text-stone-500">{expense.ingredients.join(' · ')}</span>}{expense.receiptNumber && <span className="block text-[10px] font-mono text-stone-400">Slip: {expense.receiptNumber}</span>}</td>
                      <td className="p-3 text-stone-600">{expense.field?.name || expense.farm?.name || '—'}<span className="block text-[10px] font-semibold text-blue-800">{expense.cropName || selectedCrop?.name || '—'}</span></td>
                      <td className="whitespace-nowrap p-3 text-stone-700">{expense.paymentMode} ({expense.paymentStatus})</td>
                      <td className="whitespace-nowrap p-3 text-right font-extrabold text-rose-700">{formatCurrency(expense.amount)}</td>
                      <td className="p-3 text-right"><div className="flex justify-end gap-1"><button type="button" onClick={() => openExpenseForEdit(expense)} className="rounded p-1 text-stone-400 hover:text-blue-700" title="Edit expense"><Pencil className="h-4 w-4" /></button><button type="button" onClick={() => handleDelete(expense.sourceIds || expense.id)} className="rounded p-1 text-stone-400 hover:text-rose-600" title={expense.combinationName ? 'Delete fertilizer mix expenses' : 'Delete expense'}><Trash2 className="h-4 w-4" /></button></div></td>
                    </tr>)}
                  </tbody>
                </table>
              </div>}
            </div>
          </div>}
        </div>}
      </section>

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

      {/* Expenses Table */}
      {/* <div className="bg-white rounded-2xl border border-stone-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-600 font-semibold uppercase tracking-wider border-b border-stone-200">
              <tr>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Title / Description</th>
                <th className="p-3.5">Field / Crop</th>
                <th className="p-3.5">Payment</th>
                <th className="p-3.5">Amount (₹)</th>
                <th className="p-3.5 text-right">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-stone-50/60 transition-colors">
                  <td className="p-3.5 font-medium text-stone-900 whitespace-nowrap">
                    {new Date(exp.date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="p-3.5">
                    <span className="text-[11px] font-bold text-stone-700 bg-stone-100 px-2 py-0.5 rounded uppercase">
                      {exp.category.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-3.5 font-bold text-stone-900">
                    {exp.title}
                    {exp.receiptNumber && (
                      <span className="block text-[11px] font-mono text-stone-400">
                        Slip: {exp.receiptNumber}
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 text-stone-600">
                    {exp.field?.name || exp.farm?.name}
                    {exp.crop && (
                      <span className="block text-[11px] font-semibold text-blue-800">
                        {exp.crop.name}
                      </span>
                    )}
                  </td>
                  <td className="p-3.5">
                    <span className="text-xs font-medium text-stone-700">
                      {exp.paymentMode} ({exp.paymentStatus})
                    </span>
                  </td>
                  <td className="p-3.5 font-extrabold text-rose-700 text-sm whitespace-nowrap">
                    {formatCurrency(exp.amount)}
                  </td>
                  <td className="p-3.5 text-right">
                    <button
                      onClick={() => handleDelete(exp.id)}
                      className="text-stone-400 hover:text-rose-600 p-1 rounded transition-colors"
                      title="Delete expense"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div> */}

      {/* Modal: Add Expense */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeExpenseModal}
        title={editingExpenseIds.length ? 'Edit Farm Expense' : 'Add Farm Expense'}
        subtitle={editingExpenseIds.length > 1 ? 'Edit the combined fertilizer mix expense' : editingExpenseIds.length ? 'Update the recorded expense details' : 'Log money spent on inputs, operations, or machinery'}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Farm *
              </label>
              {lockedCropExpenseId ? <p className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-semibold text-stone-800">{farms.find((farm) => farm.id === form.farmId)?.name || 'Selected farm'}</p> : <select
                value={form.farmId}
                onChange={(e) => setForm({ ...form, farmId: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-rose-500/40 focus:outline-none bg-white font-medium"
              >
                {farms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Category *
              </label>
              <select
                disabled={editingExpenseIds.length > 1}
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-rose-500/40 focus:outline-none bg-white font-medium"
              >
                <option value="FERTILIZERS">Fertilizers (खाद)</option>
                <option value="SEEDS">Seeds (बीज)</option>
                <option value="PESTICIDES">Pesticides (कीटनाशक)</option>
                <option value="LABOUR">Labour (मजदूरी)</option>
                <option value="MACHINERY_FUEL">Machinery & Fuel (डीजल व यंत्र)</option>
                <option value="IRRIGATION">Irrigation (सिंचाई)</option>
                <option value="LEASE">Lease Rent (पट्टा किराया)</option>
                <option value="TRANSPORT">Transport / Mandi (भाड़ा)</option>
                <option value="EQUIPMENT_REPAIR">Equipment Repairs (मरम्मत)</option>
                <option value="OTHER">Other Expenses</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Expense Title / Description *
            </label>
            <input
              type="text"
              required
              readOnly={editingExpenseIds.length > 1}
              placeholder="e.g. 6 Bags DAP Fertilizer purchase"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-rose-500/40 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Amount (₹) *
              </label>
              <input
                type="number"
                step="1"
                required
                placeholder="e.g. 8100"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-base font-extrabold text-rose-800 focus:ring-2 focus:ring-rose-500/40 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-rose-500/40 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Field (Khet)
              </label>
              {lockedCropExpenseId ? <p className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-semibold text-stone-800">{selectedCrop?.id === lockedCropExpenseId ? selectedCrop.field?.name || 'Selected field' : fields.find((field) => field.id === form.fieldId)?.name || 'Selected field'}</p> : <select
                value={form.fieldId}
                onChange={(e) => setForm({ ...form, fieldId: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-rose-500/40 focus:outline-none bg-white font-medium"
              >
                <option value="">General Farm Expense (None)</option>
                {fields.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Specific Crop
              </label>
              {lockedCropExpenseId ? <p className="w-full rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-900">{crops.find((crop) => crop.id === lockedCropExpenseId)?.name || 'Selected crop'}</p> : <select
                value={form.cropId}
                onChange={(e) => setForm({ ...form, cropId: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-rose-500/40 focus:outline-none bg-white font-medium"
              >
                <option value="">General Crop Expense (None)</option>
                {crops.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Payment Mode
              </label>
              <select
                value={form.paymentMode}
                onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-rose-500/40 focus:outline-none bg-white font-medium"
              >
                <option value="CASH">Cash (नकद)</option>
                <option value="UPI">UPI / PhonePe</option>
                <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Bill / Receipt / Slip Number
              </label>
              <input
                type="text"
                placeholder="e.g. RCP-खाद-3341"
                value={form.receiptNumber}
                onChange={(e) => setForm({ ...form, receiptNumber: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-rose-500/40 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeExpenseModal}
              className="px-4 py-2 border border-stone-300 rounded-xl text-sm font-semibold text-stone-700 hover:bg-stone-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold shadow-sm"
            >
              {editingExpenseIds.length ? 'Save Changes' : 'Record Expense'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
