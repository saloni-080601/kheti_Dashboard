'use client';

import React, { useState, useEffect } from 'react';
import { useFarm } from '@/context/FarmContext';
import { StatusBadge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import {
  CircleDollarSign,
  Plus,
  Coins,
  Receipt,
  Printer,
  AlertTriangle,
  CheckCircle,
  FileText,
  Phone,
  Building,
} from 'lucide-react';

export default function SalesPage() {
  const { selectedFarmId } = useFarm();
  const [sales, setSales] = useState<any[]>([]);
  const [crops, setCrops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAddSaleModalOpen, setIsAddSaleModalOpen] = useState(false);
  const [isPaymentUpdateModalOpen, setIsPaymentUpdateModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [selectedSaleForInvoice, setSelectedSaleForInvoice] = useState<any>(null);
  const [selectedSaleForPayment, setSelectedSaleForPayment] = useState<any>(null);

  // Forms
  const [saleForm, setSaleForm] = useState({
    cropId: '',
    buyerName: '',
    buyerPhone: '',
    mandiName: 'Krishi Upaj Mandi',
    saleDate: new Date().toISOString().split('T')[0],
    quantity: '',
    pricePerUnit: '',
    deductions: '0',
    amountReceived: '',
    paymentMode: 'BANK_TRANSFER',
    notes: '',
  });

  const [paymentUpdateAmount, setPaymentUpdateAmount] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [salesRes, cropsRes] = await Promise.all([
        fetch(`/api/sales?farmId=${selectedFarmId}`),
        fetch(`/api/crops?farmId=${selectedFarmId}`),
      ]);

      if (salesRes.ok && cropsRes.ok) {
        setSales(await salesRes.json());
        const cropsData = await cropsRes.json();
        setCrops(cropsData);

        if (cropsData.length > 0 && !saleForm.cropId) {
          setSaleForm((prev) => ({ ...prev, cropId: cropsData[0].id }));
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

  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saleForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record sale');

      setSuccessMsg('Crop sale and Mandi invoice recorded successfully!');
      setIsAddSaleModalOpen(false);
      setSaleForm({
        cropId: crops[0]?.id || '',
        buyerName: '',
        buyerPhone: '',
        mandiName: 'Krishi Upaj Mandi',
        saleDate: new Date().toISOString().split('T')[0],
        quantity: '',
        pricePerUnit: '',
        deductions: '0',
        amountReceived: '',
        paymentMode: 'BANK_TRANSFER',
        notes: '',
      });
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleUpdatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await fetch('/api/sales', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedSaleForPayment.id,
          amountReceived: paymentUpdateAmount,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update payment');

      setSuccessMsg('Payment status updated successfully!');
      setIsPaymentUpdateModalOpen(false);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const totalSalesRevenue = sales.reduce((s, item) => s + item.netAmount, 0);
  const totalReceivedRevenue = sales.reduce((s, item) => s + item.amountReceived, 0);
  const totalPendingReceivables = Math.max(0, totalSalesRevenue - totalReceivedRevenue);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <span>Crop Sales & Mandi Billing</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
              मंडी बिक्री व रसीदें
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Track produce sold to Mandi traders, price per quintal, commission deductions, and invoices.
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg('');
            setIsAddSaleModalOpen(true);
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors shadow-sm shadow-blue-700/20"
        >
          <Plus className="w-4 h-4" /> Record New Sale (फसल बिक्री दर्ज करें)
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
          <span className="text-xs font-bold text-stone-500 uppercase">Gross Sales Value</span>
          <p className="text-2xl font-black text-stone-900 mt-1">{formatCurrency(totalSalesRevenue)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
          <span className="text-xs font-bold text-stone-500 uppercase">Amount Received</span>
          <p className="text-2xl font-black text-blue-700 mt-1">{formatCurrency(totalReceivedRevenue)}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 shadow-sm">
          <span className="text-xs font-bold text-blue-900 uppercase">Pending Receivables</span>
          <p className="text-2xl font-black text-blue-950 mt-1">{formatCurrency(totalPendingReceivables)}</p>
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

      {/* Sales Transactions Table */}
      <div className="bg-white rounded-2xl border border-stone-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-600 font-semibold uppercase tracking-wider border-b border-stone-200">
              <tr>
                <th className="p-3.5">Invoice #</th>
                <th className="p-3.5">Sale Date</th>
                <th className="p-3.5">Crop</th>
                <th className="p-3.5">Buyer / Mandi Trader</th>
                <th className="p-3.5">Qty (Quintals)</th>
                <th className="p-3.5">Rate / Q</th>
                <th className="p-3.5">Net Amount</th>
                <th className="p-3.5">Payment</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {sales.map((sale) => {
                const balanceDue = Math.max(0, sale.netAmount - sale.amountReceived);

                return (
                  <tr key={sale.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-stone-700">
                      {sale.invoiceNumber}
                    </td>
                    <td className="p-3.5 font-medium text-stone-900">
                      {new Date(sale.saleDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="p-3.5 font-bold text-blue-900">
                      {sale.crop?.name || 'General Crop'}
                    </td>
                    <td className="p-3.5">
                      <span className="font-bold text-stone-900 block">{sale.buyerName}</span>
                      <span className="text-[11px] text-stone-400 block">{sale.mandiName}</span>
                    </td>
                    <td className="p-3.5 font-extrabold text-stone-900">
                      {sale.quantity} Q
                    </td>
                    <td className="p-3.5 font-semibold text-stone-700">
                      ₹{sale.pricePerUnit.toLocaleString()}
                    </td>
                    <td className="p-3.5 font-extrabold text-blue-800 text-sm">
                      {formatCurrency(sale.netAmount)}
                    </td>
                    <td className="p-3.5">
                      <StatusBadge status={sale.paymentStatus} />
                      {balanceDue > 0 && (
                        <span className="block text-[11px] text-amber-800 font-bold mt-0.5">
                          ₹{balanceDue.toLocaleString()} Due
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-right space-x-1">
                      <button
                        onClick={() => {
                          setSelectedSaleForInvoice(sale);
                          setIsInvoiceModalOpen(true);
                        }}
                        className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                        title="View & Print Invoice"
                      >
                        <FileText className="w-3.5 h-3.5" /> Invoice
                      </button>
                      {sale.paymentStatus !== 'PAID' && (
                        <button
                          onClick={() => {
                            setSelectedSaleForPayment(sale);
                            setPaymentUpdateAmount(sale.netAmount.toString());
                            setIsPaymentUpdateModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                        >
                          Collect
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Record New Sale */}
      <Modal
        isOpen={isAddSaleModalOpen}
        onClose={() => setIsAddSaleModalOpen(false)}
        title="Record Crop Mandi Sale"
        subtitle="Generates formal invoice and calculates Mandi deductions"
      >
        <form onSubmit={handleCreateSale} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Select Crop *
              </label>
              <select
                value={saleForm.cropId}
                onChange={(e) => setSaleForm({ ...saleForm, cropId: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none bg-white font-medium"
              >
                {crops.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.field?.name})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Sale Date *
              </label>
              <input
                type="date"
                required
                value={saleForm.saleDate}
                onChange={(e) => setSaleForm({ ...saleForm, saleDate: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Buyer Name / Commission Agent (व्यापारी/आढ़ती) *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Radhey Shyam Trader"
                value={saleForm.buyerName}
                onChange={(e) => setSaleForm({ ...saleForm, buyerName: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Buyer Phone
              </label>
              <input
                type="text"
                placeholder="+91 94251 00000"
                value={saleForm.buyerPhone}
                onChange={(e) => setSaleForm({ ...saleForm, buyerPhone: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Quantity (Quintals - क्विंटल) *
              </label>
              <input
                type="number"
                step="0.1"
                required
                placeholder="e.g. 50"
                value={saleForm.quantity}
                onChange={(e) => setSaleForm({ ...saleForm, quantity: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Rate (₹ / Quintal) *
              </label>
              <input
                type="number"
                step="1"
                required
                placeholder="e.g. 4850"
                value={saleForm.pricePerUnit}
                onChange={(e) => setSaleForm({ ...saleForm, pricePerUnit: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Mandi Deductions (₹ Cess/Hamali)
              </label>
              <input
                type="number"
                placeholder="0"
                value={saleForm.deductions}
                onChange={(e) => setSaleForm({ ...saleForm, deductions: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Amount Received Upfront (₹)
              </label>
              <input
                type="number"
                placeholder="Leave blank if fully paid"
                value={saleForm.amountReceived}
                onChange={(e) => setSaleForm({ ...saleForm, amountReceived: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none font-extrabold text-blue-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Payment Mode
              </label>
              <select
                value={saleForm.paymentMode}
                onChange={(e) => setSaleForm({ ...saleForm, paymentMode: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none bg-white font-medium"
              >
                <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                <option value="CASH">Cash (नकद)</option>
                <option value="UPI">UPI / PhonePe</option>
                <option value="CHEQUE">Cheque (चेक)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Mandi / Market Name
            </label>
            <input
              type="text"
              placeholder="e.g. Kareli Krishi Upaj Mandi"
              value={saleForm.mandiName}
              onChange={(e) => setSaleForm({ ...saleForm, mandiName: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddSaleModalOpen(false)}
              className="px-4 py-2 border border-stone-300 rounded-xl text-sm font-semibold text-stone-700 hover:bg-stone-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm"
            >
              Confirm Sale & Generate Bill
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Update Payment Collection */}
      <Modal
        isOpen={isPaymentUpdateModalOpen}
        onClose={() => setIsPaymentUpdateModalOpen(false)}
        title="Update Payment Collection"
        subtitle={`Invoice: ${selectedSaleForPayment?.invoiceNumber} - Net Amount: ₹${selectedSaleForPayment?.netAmount.toLocaleString()}`}
      >
        <form onSubmit={handleUpdatePayment} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Total Amount Received to Date (₹) *
            </label>
            <input
              type="number"
              required
              value={paymentUpdateAmount}
              onChange={(e) => setPaymentUpdateAmount(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-base font-extrabold text-blue-800 focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsPaymentUpdateModalOpen(false)}
              className="px-4 py-2 border border-stone-300 rounded-xl text-sm font-semibold text-stone-700 hover:bg-stone-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm"
            >
              Update Payment
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: View & Print Invoice Slip */}
      <Modal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        title="Mandi Sale Bill / Tax Invoice"
        subtitle={`Invoice Number: ${selectedSaleForInvoice?.invoiceNumber}`}
        maxWidth="xl"
      >
        {selectedSaleForInvoice && (
          <div className="space-y-6 text-sm" id="printable-invoice">
            {/* Invoice Header */}
            <div className="flex items-start justify-between border-b border-stone-200 pb-4">
              <div>
                <h2 className="text-xl font-bold text-stone-900">Kheti Manager Agri Invoicing</h2>
                <p className="text-xs text-stone-500">Mandi Produce Sale Memo & Weight Slip</p>
                <p className="text-xs font-semibold text-stone-700 mt-1">
                  Mandi: {selectedSaleForInvoice.mandiName}
                </p>
              </div>
              <div className="text-right">
                <span className="font-mono text-base font-bold text-blue-800">
                  {selectedSaleForInvoice.invoiceNumber}
                </span>
                <p className="text-xs text-stone-500 mt-0.5">
                  Date: {new Date(selectedSaleForInvoice.saleDate).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>

            {/* Buyer and Farm info */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-stone-50 rounded-xl border border-stone-200 text-xs">
              <div>
                <span className="font-bold text-stone-500 uppercase block">Buyer / Trader Details:</span>
                <p className="font-extrabold text-stone-900 text-sm mt-0.5">{selectedSaleForInvoice.buyerName}</p>
                {selectedSaleForInvoice.buyerPhone && (
                  <p className="text-stone-600 mt-0.5">Phone: {selectedSaleForInvoice.buyerPhone}</p>
                )}
              </div>
              <div>
                <span className="font-bold text-stone-500 uppercase block">Produce Sourced From:</span>
                <p className="font-extrabold text-stone-900 text-sm mt-0.5">
                  {selectedSaleForInvoice.crop?.farm?.name || 'Kalyanpur Agri Estate'}
                </p>
                <p className="text-stone-600 mt-0.5">
                  Field: {selectedSaleForInvoice.crop?.field?.name || 'Khet 1'}
                </p>
              </div>
            </div>

            {/* Line items table */}
            <div className="border border-stone-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-stone-100 text-stone-700 font-bold uppercase">
                  <tr>
                    <th className="p-3">Item Description</th>
                    <th className="p-3 text-right">Quantity</th>
                    <th className="p-3 text-right">Price / Q</th>
                    <th className="p-3 text-right">Gross Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-stone-100">
                    <td className="p-3 font-bold text-stone-900">
                      {selectedSaleForInvoice.crop?.name || 'Crop Produce'}
                    </td>
                    <td className="p-3 text-right font-medium">
                      {selectedSaleForInvoice.quantity} Quintals
                    </td>
                    <td className="p-3 text-right font-medium">
                      ₹{selectedSaleForInvoice.pricePerUnit.toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-extrabold text-stone-900">
                      ₹{selectedSaleForInvoice.totalAmount.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Totals & Deductions */}
            <div className="space-y-1.5 text-xs text-stone-700 border-t border-stone-200 pt-3 max-w-xs ml-auto">
              <div className="flex justify-between">
                <span>Gross Produce Amount:</span>
                <span className="font-semibold">₹{selectedSaleForInvoice.totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>Mandi Cess & Hamali Deductions:</span>
                <span className="font-semibold">- ₹{selectedSaleForInvoice.deductions.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-stone-900 pt-1 border-t border-stone-200">
                <span>Net Payable:</span>
                <span className="text-blue-700">₹{selectedSaleForInvoice.netAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Amount Paid:</span>
                <span className="font-bold">₹{selectedSaleForInvoice.amountReceived.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-amber-900 bg-amber-50 p-1.5 rounded">
                <span>Balance Due:</span>
                <span>₹{(selectedSaleForInvoice.netAmount - selectedSaleForInvoice.amountReceived).toLocaleString()}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-4 border-t border-stone-200">
              <span className="text-xs text-stone-400">Payment Mode: {selectedSaleForInvoice.paymentMode}</span>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" /> Print Bill / Save PDF
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
