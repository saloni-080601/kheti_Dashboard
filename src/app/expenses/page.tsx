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
  Filter,
  CreditCard,
  Layers,
  Sprout,
} from 'lucide-react';

export default function ExpensesPage() {
  const { selectedFarmId } = useFarm();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [farms, setFarms] = useState<any[]>([]);
  const [fields, setFields] = useState<any[]>([]);
  const [crops, setCrops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);

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
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record expense');

      setSuccessMsg('Farming expense recorded!');
      setIsModalOpen(false);
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

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense record?')) return;
    try {
      const res = await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccessMsg('Expense entry deleted.');
        await loadData();
      }
    } catch (err) {
      console.error(err);
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

          <button
            onClick={() => {
              setErrorMsg('');
              setIsModalOpen(true);
            }}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors shadow-sm shadow-rose-700/20"
          >
            <Plus className="w-4 h-4" /> Add Expense (खर्च जोड़ें)
          </button>
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
      <div className="bg-white rounded-2xl border border-stone-200/90 shadow-sm overflow-hidden">
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
      </div>

      {/* Modal: Add Expense */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Farm Expense"
        subtitle="Log money spent on inputs, operations, or machinery"
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
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-rose-500/40 focus:outline-none bg-white font-medium"
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
                Category *
              </label>
              <select
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
              <select
                value={form.fieldId}
                onChange={(e) => setForm({ ...form, fieldId: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-rose-500/40 focus:outline-none bg-white font-medium"
              >
                <option value="">General Farm Expense (None)</option>
                {fields.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Specific Crop
              </label>
              <select
                value={form.cropId}
                onChange={(e) => setForm({ ...form, cropId: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-rose-500/40 focus:outline-none bg-white font-medium"
              >
                <option value="">General Crop Expense (None)</option>
                {crops.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
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
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-stone-300 rounded-xl text-sm font-semibold text-stone-700 hover:bg-stone-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold shadow-sm"
            >
              Record Expense
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
