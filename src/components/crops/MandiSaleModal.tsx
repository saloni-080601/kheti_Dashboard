'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import { CircleDollarSign, Truck, Percent, Receipt, AlertCircle, CheckCircle2 } from 'lucide-react';

interface MandiSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  crop: any;
  onSuccess: () => void;
}

export function MandiSaleModal({
  isOpen,
  onClose,
  crop,
  onSuccess,
}: MandiSaleModalProps) {
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [buyerName, setBuyerName] = useState('Ramesh Aadhatia');
  const [mandiName, setMandiName] = useState('Local Subzi Mandi');
  const [quantity, setQuantity] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [commission, setCommission] = useState('');
  const [transportCost, setTransportCost] = useState('');
  const [hamaliCost, setHamaliCost] = useState('');
  const [amountReceived, setAmountReceived] = useState('');
  const [paymentMode, setPaymentMode] = useState('BANK_TRANSFER');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSaleDate(new Date().toISOString().split('T')[0]);
      setQuantity('');
      setPricePerUnit('');
      setCommission('');
      setTransportCost('');
      setHamaliCost('');
      setAmountReceived('');
      setErrorMsg('');
    }
  }, [isOpen]);

  const q = parseFloat(quantity) || 0;
  const rate = parseFloat(pricePerUnit) || 0;
  const grossAmount = q * rate;

  const comm = parseFloat(commission) || 0;
  const trans = parseFloat(transportCost) || 0;
  const ham = parseFloat(hamaliCost) || 0;
  const totalDeductions = comm + trans + ham;

  const netEarning = Math.max(0, grossAmount - totalDeductions);
  const received = amountReceived !== '' ? parseFloat(amountReceived) || 0 : netEarning;
  const pendingPayment = Math.max(0, netEarning - received);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cropId: crop?.id,
          buyerName,
          mandiName,
          saleDate,
          quantity: q,
          unit: 'Kg',
          pricePerUnit: rate,
          commission: comm,
          transportCost: trans,
          hamaliCost: ham,
          deductions: totalDeductions,
          amountReceived: received,
          paymentMode,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record Mandi sale');

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
      title={`Mandi Sale (बिक्री पर्ची) Entry: ${crop?.name}`}
      subtitle={`Record Mandi dispatch, rate/kg, deductions & payment recovery`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Sale Date *
            </label>
            <input
              type="date"
              required
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
              className="w-full px-3 py-1.5 border border-stone-300 rounded-xl text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Mandi Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Local Mandi, Azadpur"
              value={mandiName}
              onChange={(e) => setMandiName(e.target.value)}
              className="w-full px-3 py-1.5 border border-stone-300 rounded-xl text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Aadhatia / Buyer Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Aggarwal Traders"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              className="w-full px-3 py-1.5 border border-stone-300 rounded-xl text-sm"
            />
          </div>
        </div>

        {/* Quantity and Rate */}
        <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900">
              1. Auction Sale Details (वज़न व भाव)
            </span>
            <span className="text-xs font-bold text-blue-700">
              Gross: {formatCurrency(grossAmount)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                Quantity Sold in Kg (किलो) *
              </label>
              <input
                type="number"
                step="0.5"
                min="1"
                required
                placeholder="e.g. 420"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-base font-black text-blue-900 bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                Rate per Kg (₹ / किलो) *
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                required
                placeholder="e.g. 24"
                value={pricePerUnit}
                onChange={(e) => setPricePerUnit(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-base font-black text-blue-900 bg-white"
              />
            </div>
          </div>
        </div>

        {/* Mandi Deductions */}
        <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <Percent className="w-3.5 h-3.5 text-amber-600" />
              2. Mandi Deductions (कमीशन, भाड़ा, हमाली)
            </span>
            <span className="text-xs font-bold text-amber-800">
              Total Cut: -{formatCurrency(totalDeductions)}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                Aadhat Commission (₹)
              </label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 500"
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-stone-300 rounded-lg text-sm bg-white font-bold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                Transport / Freight (₹)
              </label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 400"
                value={transportCost}
                onChange={(e) => setTransportCost(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-stone-300 rounded-lg text-sm bg-white font-bold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                Hamali / Labour (₹)
              </label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 150"
                value={hamaliCost}
                onChange={(e) => setHamaliCost(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-stone-300 rounded-lg text-sm bg-white font-bold"
              />
            </div>
          </div>
        </div>

        {/* Net Earning & Payment Realization */}
        <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs text-emerald-800 font-semibold uppercase">Net Earning (शुद्ध आमदनी)</span>
            <p className="text-2xl font-black text-emerald-950">{formatCurrency(netEarning)}</p>
          </div>

          <div className="flex items-center gap-2">
            <div>
              <label className="block text-[10px] font-semibold text-stone-600 mb-0.5">
                Amount Received (₹)
              </label>
              <input
                type="number"
                min="0"
                placeholder={String(netEarning)}
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                className="w-32 px-2.5 py-1.5 border border-stone-300 rounded-lg text-sm font-bold bg-white"
              />
            </div>

            <div className="text-right">
              <span className="text-[10px] text-stone-500 font-semibold block">Pending Balance</span>
              <span
                className={`text-sm font-black ${
                  pendingPayment > 0 ? 'text-rose-600' : 'text-emerald-700'
                }`}
              >
                {formatCurrency(pendingPayment)}
              </span>
            </div>
          </div>
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
            {loading ? 'Recording...' : 'Save Mandi Sale Slip'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
