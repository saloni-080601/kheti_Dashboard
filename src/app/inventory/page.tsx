'use client';

import React, { useState, useEffect } from 'react';
import { useFarm } from '@/context/FarmContext';
import { StatusBadge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import {
  Package,
  Plus,
  PackageCheck,
  AlertTriangle,
  CheckCircle,
  Warehouse,
  Sprout,
  Layers,
} from 'lucide-react';

export default function InventoryPage() {
  const { selectedFarmId } = useFarm();
  const [harvestLogs, setHarvestLogs] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [farms, setFarms] = useState<any[]>([]);
  const [fields, setFields] = useState<any[]>([]);
  const [crops, setCrops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isHarvestModalOpen, setIsHarvestModalOpen] = useState(false);
  const [isSupplyModalOpen, setIsSupplyModalOpen] = useState(false);

  // Forms
  const [harvestForm, setHarvestForm] = useState({
    cropId: '',
    fieldId: '',
    harvestDate: new Date().toISOString().split('T')[0],
    quantity: '',
    unit: 'Quintals',
    storageLocation: 'Farm Barn / Godown 1',
    notes: '',
  });

  const [supplyForm, setSupplyForm] = useState({
    farmId: '',
    name: '',
    category: 'FERTILIZER',
    quantity: '',
    unit: 'Bag (50kg)',
    minStockAlert: '5',
    unitPrice: '',
    notes: '',
  });

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [invRes, farmsRes, fieldsRes, cropsRes] = await Promise.all([
        fetch(`/api/harvest?farmId=${selectedFarmId}`),
        fetch('/api/farms'),
        fetch(`/api/fields?farmId=${selectedFarmId}`),
        fetch(`/api/crops?farmId=${selectedFarmId}`),
      ]);

      if (invRes.ok && farmsRes.ok && fieldsRes.ok && cropsRes.ok) {
        const invData = await invRes.json();
        setHarvestLogs(invData.harvestLogs || []);
        setInventoryItems(invData.inventoryItems || []);

        const farmsData = await farmsRes.json();
        const fieldsData = await fieldsRes.json();
        const cropsData = await cropsRes.json();

        setFarms(farmsData);
        setFields(fieldsData);
        setCrops(cropsData);

        if (cropsData.length > 0 && !harvestForm.cropId) {
          setHarvestForm((prev) => ({
            ...prev,
            cropId: cropsData[0].id,
            fieldId: cropsData[0].fieldId,
          }));
        }
        if (farmsData.length > 0 && !supplyForm.farmId) {
          setSupplyForm((prev) => ({ ...prev, farmId: farmsData[0].id }));
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

  const handleRecordHarvest = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await fetch('/api/harvest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RECORD_HARVEST',
          ...harvestForm,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record harvest');

      setSuccessMsg('Harvest yield logged and added to warehouse inventory!');
      setIsHarvestModalOpen(false);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleAddSupply = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await fetch('/api/harvest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ADD_INVENTORY',
          ...supplyForm,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add supply');

      setSuccessMsg('Inventory item added to farm store!');
      setIsSupplyModalOpen(false);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const totalHarvestedQuintals = harvestLogs.reduce((s, h) => s + h.quantity, 0);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <span>Harvest & Inventory Stock</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
              उपज भंडार व खाद-बीज स्टॉक
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Track harvested crops in barn/storage and input materials (Seeds, Fertilizers, Sprays).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setErrorMsg('');
              setIsSupplyModalOpen(true);
            }}
            className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors border border-stone-200"
          >
            <Plus className="w-4 h-4" /> Add Seed / Fertilizer Supply
          </button>
          <button
            onClick={() => {
              setErrorMsg('');
              setIsHarvestModalOpen(true);
            }}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors shadow-sm shadow-purple-700/20"
          >
            <PackageCheck className="w-4 h-4" /> Record Harvest Yield (फसल कटाई दर्ज करें)
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
          <span className="text-xs font-bold text-stone-500 uppercase">Total Harvested</span>
          <p className="text-2xl font-black text-purple-900 mt-1">{totalHarvestedQuintals} Quintals</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
          <span className="text-xs font-bold text-stone-500 uppercase">Warehouse Items</span>
          <p className="text-2xl font-black text-stone-900 mt-1">{inventoryItems.length} SKUs in Store</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
          <span className="text-xs font-bold text-stone-500 uppercase">Harvest Lots</span>
          <p className="text-2xl font-black text-stone-900 mt-1">{harvestLogs.length} Completed Batches</p>
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

      {/* Section 1: Current Store Inventory (Fertilizers, Seeds, Harvested Grain) */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
          <Warehouse className="w-4 h-4 text-blue-600" /> Current Warehouse & Farm Godown Stock
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {inventoryItems.map((item) => {
            const isLow = item.quantity <= item.minStockAlert;

            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isLow ? 'bg-rose-50/40 border-rose-200' : 'bg-white border-stone-200/90 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-stone-900 text-sm">{item.name}</h3>
                    <span className="text-[10px] font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded uppercase mt-0.5 inline-block">
                      {item.category.replace('_', ' ')}
                    </span>
                  </div>
                  {isLow && (
                    <span className="text-[10px] font-extrabold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Low Stock
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-baseline justify-between">
                  <div>
                    <span className="text-2xl font-black text-stone-900">{item.quantity}</span>
                    <span className="text-xs font-semibold text-stone-500 ml-1">{item.unit}</span>
                  </div>
                  {item.unitPrice > 0 && (
                    <span className="text-xs font-medium text-stone-600">
                      ₹{item.unitPrice} / {item.unit}
                    </span>
                  )}
                </div>

                {item.notes && (
                  <p className="text-[11px] text-stone-500 mt-2 border-t border-stone-100 pt-2 truncate">
                    {item.notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: Harvest History Table */}
      <div className="space-y-3 pt-4">
        <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
          <PackageCheck className="w-4 h-4 text-purple-600" /> Harvested Crop History
        </h2>

        <div className="bg-white rounded-2xl border border-stone-200/90 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-600 font-semibold uppercase tracking-wider border-b border-stone-200">
                <tr>
                  <th className="p-3.5">Harvest Date</th>
                  <th className="p-3.5">Crop</th>
                  <th className="p-3.5">Field (Khet)</th>
                  <th className="p-3.5">Quantity Produced</th>
                  <th className="p-3.5">Storage Location</th>
                  <th className="p-3.5">Quality / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {harvestLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="p-3.5 font-medium text-stone-900">
                      {new Date(log.harvestDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="p-3.5 font-bold text-blue-900 flex items-center gap-1.5">
                      <Sprout className="w-4 h-4 text-blue-600" />
                      {log.crop?.name}
                    </td>
                    <td className="p-3.5 text-stone-800 font-medium">
                      {log.field?.name}
                    </td>
                    <td className="p-3.5 font-extrabold text-stone-900 text-sm">
                      {log.quantity} {log.unit}
                    </td>
                    <td className="p-3.5 text-stone-600">
                      {log.storageLocation || 'Barn'}
                    </td>
                    <td className="p-3.5 text-stone-500 italic">
                      {log.notes || 'Grade A grain'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal: Record Harvest */}
      <Modal
        isOpen={isHarvestModalOpen}
        onClose={() => setIsHarvestModalOpen(false)}
        title="Record Crop Harvest Yield"
        subtitle="Saves harvested quintals and adds stock lot to warehouse"
      >
        <form onSubmit={handleRecordHarvest} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Select Crop to Harvest *
            </label>
            <select
              value={harvestForm.cropId}
              onChange={(e) => {
                const found = crops.find((c) => c.id === e.target.value);
                setHarvestForm({
                  ...harvestForm,
                  cropId: e.target.value,
                  fieldId: found ? found.fieldId : harvestForm.fieldId,
                });
              }}
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/40 focus:outline-none bg-white font-medium"
            >
              {crops.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.field?.name} - {c.area} Acres)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Harvest Date *
              </label>
              <input
                type="date"
                required
                value={harvestForm.harvestDate}
                onChange={(e) => setHarvestForm({ ...harvestForm, harvestDate: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/40 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Quantity Harvested (Quintals) *
              </label>
              <input
                type="number"
                step="0.1"
                required
                placeholder="e.g. 84.5"
                value={harvestForm.quantity}
                onChange={(e) => setHarvestForm({ ...harvestForm, quantity: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/40 focus:outline-none font-extrabold text-base text-purple-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Storage Location
            </label>
            <input
              type="text"
              placeholder="e.g. Farm Godown 1, Gunny Bags in Barn"
              value={harvestForm.storageLocation}
              onChange={(e) => setHarvestForm({ ...harvestForm, storageLocation: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/40 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Harvest Notes / Grain Moisture
            </label>
            <input
              type="text"
              placeholder="e.g. Moisture 10%, cleaned, sun-dried"
              value={harvestForm.notes}
              onChange={(e) => setHarvestForm({ ...harvestForm, notes: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/40 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsHarvestModalOpen(false)}
              className="px-4 py-2 border border-stone-300 rounded-xl text-sm font-semibold text-stone-700 hover:bg-stone-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold shadow-sm"
            >
              Save Harvest
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Supply Item */}
      <Modal
        isOpen={isSupplyModalOpen}
        onClose={() => setIsSupplyModalOpen(false)}
        title="Add Farm Input Supply"
        subtitle="Register seeds, fertilizer bags, or pesticides stored on farm"
      >
        <form onSubmit={handleAddSupply} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Farm *
              </label>
              <select
                value={supplyForm.farmId}
                onChange={(e) => setSupplyForm({ ...supplyForm, farmId: e.target.value })}
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
                Category *
              </label>
              <select
                value={supplyForm.category}
                onChange={(e) => setSupplyForm({ ...supplyForm, category: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none bg-white font-medium"
              >
                <option value="FERTILIZER">Fertilizer (खाद - Urea/DAP)</option>
                <option value="SEED">Seed Stock (बीज)</option>
                <option value="PESTICIDE">Pesticide / Spray (दवाई)</option>
                <option value="CROP_HARVEST">Crop Harvested Grain</option>
                <option value="EQUIPMENT_SUPPLY">Equipment & Spares</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Item Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. IFFCO Neem Coated Urea (45kg)"
              value={supplyForm.name}
              onChange={(e) => setSupplyForm({ ...supplyForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Quantity *
              </label>
              <input
                type="number"
                step="0.5"
                required
                placeholder="e.g. 20"
                value={supplyForm.quantity}
                onChange={(e) => setSupplyForm({ ...supplyForm, quantity: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Unit *
              </label>
              <input
                type="text"
                placeholder="Bag (50kg) / Litre / Kg"
                value={supplyForm.unit}
                onChange={(e) => setSupplyForm({ ...supplyForm, unit: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Low Stock Alert Limit
              </label>
              <input
                type="number"
                value={supplyForm.minStockAlert}
                onChange={(e) => setSupplyForm({ ...supplyForm, minStockAlert: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsSupplyModalOpen(false)}
              className="px-4 py-2 border border-stone-300 rounded-xl text-sm font-semibold text-stone-700 hover:bg-stone-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm"
            >
              Save Stock
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
