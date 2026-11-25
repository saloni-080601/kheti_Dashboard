'use client';

import React, { useState, useEffect } from 'react';
import { useFarm } from '@/context/FarmContext';
import { StatusBadge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import {
  Tractor,
  Plus,
  Fuel,
  Wrench,
  Clock,
  Layers,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

export default function MachineryPage() {
  const { selectedFarmId } = useFarm();
  const [machinery, setMachinery] = useState<any[]>([]);
  const [farms, setFarms] = useState<any[]>([]);
  const [fields, setFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAddMachineModalOpen, setIsAddMachineModalOpen] = useState(false);
  const [isLogUsageModalOpen, setIsLogUsageModalOpen] = useState(false);
  const [selectedMachineToLog, setSelectedMachineToLog] = useState<any>(null);

  // Forms
  const [machineForm, setMachineForm] = useState({
    farmId: '',
    name: '',
    model: '',
    ownership: 'OWNED',
    fuelType: 'DIESEL',
    hourlyRentalRate: '0',
    status: 'AVAILABLE',
    notes: '',
  });

  const [usageForm, setUsageForm] = useState({
    machineryId: '',
    farmId: '',
    fieldId: '',
    date: new Date().toISOString().split('T')[0],
    hoursUsed: '',
    fuelLitres: '0',
    fuelCost: '0',
    maintenanceCost: '0',
    rentalCost: '0',
    notes: '',
  });

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [macRes, farmsRes, fieldsRes] = await Promise.all([
        fetch(`/api/machinery?farmId=${selectedFarmId}`),
        fetch('/api/farms'),
        fetch(`/api/fields?farmId=${selectedFarmId}`),
      ]);

      if (macRes.ok && farmsRes.ok && fieldsRes.ok) {
        const macData = await macRes.json();
        const farmsData = await farmsRes.json();
        const fieldsData = await fieldsRes.json();

        setMachinery(macData);
        setFarms(farmsData);
        setFields(fieldsData);

        if (farmsData.length > 0 && !machineForm.farmId) {
          setMachineForm((prev) => ({ ...prev, farmId: farmsData[0].id }));
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

  const handleCreateMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await fetch('/api/machinery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_MACHINERY',
          ...machineForm,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add machinery');

      setSuccessMsg('Equipment registered successfully!');
      setIsAddMachineModalOpen(false);
      setMachineForm({
        farmId: farms[0]?.id || '',
        name: '',
        model: '',
        ownership: 'OWNED',
        fuelType: 'DIESEL',
        hourlyRentalRate: '0',
        status: 'AVAILABLE',
        notes: '',
      });
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleLogUsage = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await fetch('/api/machinery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'LOG_USAGE',
          machineryId: selectedMachineToLog.id,
          ...usageForm,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to log machinery usage');

      setSuccessMsg('Usage, fuel, and expenses recorded!');
      setIsLogUsageModalOpen(false);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <span>Machinery, Implements & Fuel</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
              ट्रैक्टर, यंत्र व डीजल हिसाब
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Manage tractors, harvesters, implements, operating hours, fuel consumption, and rental fees.
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg('');
            setIsAddMachineModalOpen(true);
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors shadow-sm shadow-blue-700/20"
        >
          <Plus className="w-4 h-4" /> Add Machine / Implement (यंत्र जोड़ें)
        </button>
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

      {/* Machinery Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {machinery.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-2xl border border-stone-200/90 shadow-sm flex flex-col overflow-hidden hover:border-blue-300 transition-all"
          >
            <div className="p-5 border-b border-stone-100 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-stone-900 text-base">{item.name}</h3>
                  <p className="text-xs text-stone-500">{item.model || 'Standard'}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StatusBadge status={item.status} />
                  <StatusBadge status={item.ownership} />
                </div>
              </div>

              <div className="flex items-center space-x-2 text-xs text-stone-600">
                <Fuel className="w-3.5 h-3.5 text-amber-500" />
                <span>Fuel: <strong>{item.fuelType}</strong></span>
                {item.ownership === 'RENTED' && (
                  <span className="text-amber-800 font-bold">
                    • ₹{item.hourlyRentalRate}/hr Rent
                  </span>
                )}
              </div>
            </div>

            {/* Operating Hours and Operating Cost */}
            <div className="p-5 flex-1 space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200/60">
                  <span className="text-stone-500 block text-[11px]">Total Operating Hours</span>
                  <span className="font-extrabold text-stone-900 text-base">
                    {item.totalHours.toFixed(1)} hrs
                  </span>
                </div>
                <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200/60">
                  <span className="text-stone-500 block text-[11px]">Total Cost Incurred</span>
                  <span className="font-extrabold text-stone-900 text-base">
                    ₹{item.totalCost.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="text-xs text-stone-600 space-y-1 bg-stone-50/70 p-2.5 rounded-xl border border-stone-200">
                <div className="flex justify-between">
                  <span>Diesel Fuel:</span>
                  <span className="font-semibold text-stone-800">
                    ₹{item.totalFuelCost.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Maintenance / Repairs:</span>
                  <span className="font-semibold text-stone-800">
                    ₹{item.totalMaintenanceCost.toLocaleString()}
                  </span>
                </div>
                {item.totalRentalCost > 0 && (
                  <div className="flex justify-between text-amber-900">
                    <span>Rental Charges:</span>
                    <span className="font-semibold">
                      ₹{item.totalRentalCost.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Recent usage logs */}
              {item.logs && item.logs.length > 0 && (
                <div className="pt-1">
                  <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
                    Recent Operations:
                  </span>
                  <div className="space-y-1 text-xs">
                    {item.logs.slice(0, 2).map((log: any) => (
                      <div
                        key={log.id}
                        className="p-1.5 bg-stone-50 rounded border border-stone-200 flex items-center justify-between text-[11px]"
                      >
                        <span className="text-stone-700">
                          {new Date(log.date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                          })}
                          {' - '}
                          {log.hoursUsed} hrs ({log.field?.name || 'Field'})
                        </span>
                        <span className="font-semibold text-stone-800">
                          ₹{(log.fuelCost + log.maintenanceCost + log.rentalCost).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-stone-50 border-t border-stone-100 flex items-center justify-between">
              <span className="text-xs text-stone-500 truncate max-w-[150px]">
                {item.notes || 'No remarks'}
              </span>
              <button
                onClick={() => {
                  setSelectedMachineToLog(item);
                  setUsageForm({
                    machineryId: item.id,
                    farmId: item.farmId,
                    fieldId: fields[0]?.id || '',
                    date: new Date().toISOString().split('T')[0],
                    hoursUsed: '4',
                    fuelLitres: item.fuelType === 'DIESEL' ? '15' : '0',
                    fuelCost: item.fuelType === 'DIESEL' ? '1425' : '0',
                    maintenanceCost: '0',
                    rentalCost: item.ownership === 'RENTED' ? (item.hourlyRentalRate * 4).toString() : '0',
                    notes: '',
                  });
                  setErrorMsg('');
                  setIsLogUsageModalOpen(true);
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <Clock className="w-3.5 h-3.5" /> Log Hours & Fuel
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Add Machinery */}
      <Modal
        isOpen={isAddMachineModalOpen}
        onClose={() => setIsAddMachineModalOpen(false)}
        title="Add Farm Machinery or Implement"
        subtitle="Register tractor, rotavator, seed drill, or hired machinery"
      >
        <form onSubmit={handleCreateMachine} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Farm *
              </label>
              <select
                value={machineForm.farmId}
                onChange={(e) => setMachineForm({ ...machineForm, farmId: e.target.value })}
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
                Ownership (स्वामित्व)
              </label>
              <select
                value={machineForm.ownership}
                onChange={(e) => setMachineForm({ ...machineForm, ownership: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none bg-white font-medium"
              >
                <option value="OWNED">Owned (निजी मशीन)</option>
                <option value="RENTED">Hired / Rental (किराए पर)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Equipment Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Mahindra 575 DI Tractor"
                value={machineForm.name}
                onChange={(e) => setMachineForm({ ...machineForm, name: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Model / Horsepower
              </label>
              <input
                type="text"
                placeholder="e.g. 47 HP 2022 Model"
                value={machineForm.model}
                onChange={(e) => setMachineForm({ ...machineForm, model: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Fuel Type
              </label>
              <select
                value={machineForm.fuelType}
                onChange={(e) => setMachineForm({ ...machineForm, fuelType: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none bg-white font-medium"
              >
                <option value="DIESEL">Diesel (डीजल)</option>
                <option value="ELECTRIC">Electricity / Solar (बिजली)</option>
                <option value="NONE">None (Implement/Rotavator)</option>
              </select>
            </div>

            {machineForm.ownership === 'RENTED' && (
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Hourly Rental Rate (₹ / Hour)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 1800"
                  value={machineForm.hourlyRentalRate}
                  onChange={(e) => setMachineForm({ ...machineForm, hourlyRentalRate: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none font-bold"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddMachineModalOpen(false)}
              className="px-4 py-2 border border-stone-300 rounded-xl text-sm font-semibold text-stone-700 hover:bg-stone-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm"
            >
              Save Equipment
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Log Usage & Fuel */}
      <Modal
        isOpen={isLogUsageModalOpen}
        onClose={() => setIsLogUsageModalOpen(false)}
        title={`Log Usage for ${selectedMachineToLog?.name}`}
        subtitle="Records hours worked and synchronizes diesel and maintenance to expenses"
      >
        <form onSubmit={handleLogUsage} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Operation Date *
              </label>
              <input
                type="date"
                required
                value={usageForm.date}
                onChange={(e) => setUsageForm({ ...usageForm, date: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Operating Hours * (घंटे)
              </label>
              <input
                type="number"
                step="0.5"
                required
                value={usageForm.hoursUsed}
                onChange={(e) => setUsageForm({ ...usageForm, hoursUsed: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Field (Khet) Operated In
            </label>
            <select
              value={usageForm.fieldId}
              onChange={(e) => setUsageForm({ ...usageForm, fieldId: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none bg-white font-medium"
            >
              <option value="">Select Field (Optional)</option>
              {fields.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {selectedMachineToLog?.fuelType === 'DIESEL' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Fuel Consumed (Litres)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={usageForm.fuelLitres}
                  onChange={(e) => setUsageForm({ ...usageForm, fuelLitres: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Diesel Fuel Cost (₹)
                </label>
                <input
                  type="number"
                  value={usageForm.fuelCost}
                  onChange={(e) => setUsageForm({ ...usageForm, fuelCost: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Maintenance / Service Cost (₹)
              </label>
              <input
                type="number"
                value={usageForm.maintenanceCost}
                onChange={(e) => setUsageForm({ ...usageForm, maintenanceCost: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
              />
            </div>
            {selectedMachineToLog?.ownership === 'RENTED' && (
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Rental Charges Paid (₹)
                </label>
                <input
                  type="number"
                  value={usageForm.rentalCost}
                  onChange={(e) => setUsageForm({ ...usageForm, rentalCost: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Remarks
            </label>
            <input
              type="text"
              placeholder="e.g. Harrowing before wheat sowing"
              value={usageForm.notes}
              onChange={(e) => setUsageForm({ ...usageForm, notes: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsLogUsageModalOpen(false)}
              className="px-4 py-2 border border-stone-300 rounded-xl text-sm font-semibold text-stone-700 hover:bg-stone-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm"
            >
              Record Usage & Expense
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
