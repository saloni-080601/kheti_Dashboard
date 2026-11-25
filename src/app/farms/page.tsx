'use client';

import React, { useState, useEffect } from 'react';
import { useFarm } from '@/context/FarmContext';
import { StatusBadge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import {
  MapPin,
  Layers,
  Plus,
  Trash2,
  Sprout,
  Droplets,
  AlertTriangle,
  Scissors,
  CheckCircle,
} from 'lucide-react';

export default function FarmsPage() {
  const { selectedFarmId, refreshFarms } = useFarm();
  const [farms, setFarms] = useState<any[]>([]);
  const [fields, setFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isFarmModalOpen, setIsFarmModalOpen] = useState(false);
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [selectedFieldForSection, setSelectedFieldForSection] = useState<any>(null);

  // Form states
  const [farmForm, setFarmForm] = useState({
    name: '',
    location: '',
    totalArea: '',
    ownershipType: 'OWNED',
    leaseCostPerYear: '',
    description: '',
  });

  const [fieldForm, setFieldForm] = useState({
    farmId: '',
    name: '',
    area: '',
    location: '',
    soilType: 'Black Cotton Soil',
    irrigationSource: 'Canal & Borewell',
    status: 'ACTIVE',
    notes: '',
  });

  const [sectionForm, setSectionForm] = useState({
    fieldId: '',
    name: '',
    area: '',
    notes: '',
  });

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [farmsRes, fieldsRes] = await Promise.all([
        fetch('/api/farms'),
        fetch(`/api/fields?farmId=${selectedFarmId}`),
      ]);
      if (farmsRes.ok && fieldsRes.ok) {
        const farmsData = await farmsRes.json();
        const fieldsData = await fieldsRes.json();
        setFarms(farmsData);
        setFields(fieldsData);
        if (farmsData.length > 0 && !fieldForm.farmId) {
          setFieldForm((prev) => ({ ...prev, farmId: farmsData[0].id }));
        }
      }
    } catch (err) {
      console.error('Failed to load farms data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedFarmId]);

  const handleCreateFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await fetch('/api/farms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(farmForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create farm');

      setSuccessMsg('Farm created successfully!');
      setIsFarmModalOpen(false);
      setFarmForm({
        name: '',
        location: '',
        totalArea: '',
        ownershipType: 'OWNED',
        leaseCostPerYear: '',
        description: '',
      });
      await refreshFarms();
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleCreateField = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await fetch('/api/fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fieldForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create field');

      setSuccessMsg('Field (Khet) created successfully!');
      setIsFieldModalOpen(false);
      setFieldForm({
        farmId: farms[0]?.id || '',
        name: '',
        area: '',
        location: '',
        soilType: 'Black Cotton Soil',
        irrigationSource: 'Canal & Borewell',
        status: 'ACTIVE',
        notes: '',
      });
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await fetch('/api/fields/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...sectionForm,
          fieldId: selectedFieldForSection.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create section');

      setSuccessMsg('Section created successfully!');
      setIsSectionModalOpen(false);
      setSectionForm({ fieldId: '', name: '', area: '', notes: '' });
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteField = async (id: string) => {
    if (!confirm('Are you sure you want to delete this field? All linked crop logs will be affected.')) return;
    try {
      const res = await fetch(`/api/fields?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccessMsg('Field removed.');
        await loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSection = async (id: string) => {
    if (!confirm('Delete this subplot section?')) return;
    try {
      const res = await fetch(`/api/fields/sections?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccessMsg('Section removed.');
        await loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header and Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <span>Farms & Land Management</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
              खेत और भूमि खाता
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Track total acreage, Khets, subplots, soil types, and prevent over-allocation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setErrorMsg('');
              setIsFarmModalOpen(true);
            }}
            className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors border border-stone-200"
          >
            <Plus className="w-4 h-4" /> Add Farm (नया फार्म)
          </button>
          <button
            onClick={() => {
              setErrorMsg('');
              setIsFieldModalOpen(true);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors shadow-sm shadow-blue-700/20"
          >
            <Plus className="w-4 h-4" /> Add Field (नया खेत)
          </button>
        </div>
      </div>

      {/* Notifications */}
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

      {/* Farm Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {farms.map((farm) => {
          const allocPct = farm.totalArea > 0 ? Math.round((farm.totalFieldAcres / farm.totalArea) * 100) : 0;
          return (
            <div
              key={farm.id}
              className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-sm space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-stone-900 text-base">{farm.name}</h3>
                    <StatusBadge status={farm.ownershipType} />
                  </div>
                  <p className="text-xs text-stone-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5" /> {farm.location || 'Location not specified'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-extrabold text-stone-900">{farm.totalArea}</span>
                  <span className="text-xs font-semibold text-stone-500 ml-1">Acres Total</span>
                </div>
              </div>

              {farm.description && (
                <p className="text-xs text-stone-600 bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                  {farm.description}
                </p>
              )}

              {/* Allocation progress */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-stone-600">
                    Allocated to Fields: <strong>{farm.totalFieldAcres} Acres</strong>
                  </span>
                  <span className="text-blue-700 font-bold">
                    {farm.remainingFarmAcres.toFixed(1)} Acres Unallocated
                  </span>
                </div>
                <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(100, allocPct)}%` }}
                  />
                </div>
              </div>

              {farm.ownershipType === 'LEASED' && farm.leaseCostPerYear > 0 && (
                <div className="text-[11px] font-medium text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg">
                  Lease Rent: ₹{farm.leaseCostPerYear.toLocaleString()} / year
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Fields (Khet) List & Subplots */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            <span>All Fields (Khets) & Sub-Plots</span>
            <span className="text-xs text-stone-500 font-normal">
              ({fields.length} parcels recorded)
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {fields.map((field) => {
            const cultivatedPct =
              field.area > 0 ? Math.round((field.cultivatedAcres / field.area) * 100) : 0;

            return (
              <div
                key={field.id}
                className="bg-white rounded-2xl border border-stone-200/90 shadow-sm flex flex-col overflow-hidden hover:border-blue-300 transition-all"
              >
                {/* Field Card Header */}
                <div className="p-5 border-b border-stone-100 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-stone-900 text-base">{field.name}</h3>
                      <p className="text-xs text-stone-500">{field.farm?.name}</p>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <StatusBadge status={field.status} />
                      <button
                        onClick={() => handleDeleteField(field.id)}
                        className="text-stone-400 hover:text-rose-600 p-1 rounded transition-colors"
                        title="Delete field"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Acreage and Soil summary */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="p-2 bg-stone-50 rounded-lg">
                      <span className="text-stone-500 block">Total Area:</span>
                      <span className="font-bold text-stone-900 text-sm">{field.area} Acres</span>
                    </div>
                    <div className="p-2 bg-stone-50 rounded-lg">
                      <span className="text-stone-500 block">Soil Type:</span>
                      <span className="font-semibold text-stone-800">{field.soilType}</span>
                    </div>
                  </div>

                  <div className="flex items-center text-xs text-stone-600 gap-1">
                    <Droplets className="w-3.5 h-3.5 text-blue-600" />
                    <span>Irrigation: <strong>{field.irrigationSource}</strong></span>
                  </div>
                </div>

                {/* Land Cultivation Progress */}
                <div className="px-5 py-3 bg-stone-50/50 border-b border-stone-100 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-stone-700">
                      Cultivated: <strong>{field.cultivatedAcres} Ac</strong>
                    </span>
                    <span className="font-bold text-blue-700">
                      Remaining: {field.remainingAcres.toFixed(1)} Ac Free
                    </span>
                  </div>
                  <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${Math.min(100, cultivatedPct)}%` }}
                    />
                  </div>
                </div>

                {/* Crops in this field */}
                <div className="p-5 flex-1 space-y-3">
                  <div>
                    <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1.5">
                      Current Crops:
                    </span>
                    {field.crops && field.crops.length > 0 ? (
                      <div className="space-y-1.5">
                        {field.crops.map((crop: any) => (
                          <div
                            key={crop.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-blue-50/80 border border-blue-100 text-xs"
                          >
                            <span className="font-bold text-blue-950 flex items-center gap-1.5">
                              <Sprout className="w-3.5 h-3.5 text-blue-600" />
                              {crop.name}
                            </span>
                            <span className="font-semibold text-blue-800">
                              {crop.area} Acres ({crop.season})
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-stone-400 italic">No crops currently planted.</p>
                    )}
                  </div>

                  {/* Subplot Sections */}
                  <div className="pt-2 border-t border-stone-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                        Sub-Plots / Sections:
                      </span>
                      <button
                        onClick={() => {
                          setSelectedFieldForSection(field);
                          setErrorMsg('');
                          setIsSectionModalOpen(true);
                        }}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
                      >
                        <Scissors className="w-3 h-3" /> Divide (विभाजित करें)
                      </button>
                    </div>

                    {field.sections && field.sections.length > 0 ? (
                      <div className="space-y-1">
                        {field.sections.map((sec: any) => (
                          <div
                            key={sec.id}
                            className="flex items-center justify-between text-xs p-1.5 bg-stone-50 rounded border border-stone-200/60"
                          >
                            <span className="font-medium text-stone-800">{sec.name}</span>
                            <div className="flex items-center space-x-2">
                              <span className="text-stone-600 font-semibold">{sec.area} Ac</span>
                              <button
                                onClick={() => handleDeleteSection(sec.id)}
                                className="text-stone-400 hover:text-rose-600"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-stone-400">Single whole parcel.</p>
                    )}
                  </div>
                </div>

                {field.notes && (
                  <div className="px-5 py-2.5 bg-stone-50 border-t border-stone-100 text-[11px] text-stone-500 truncate">
                    {field.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal: Add Farm */}
      <Modal
        isOpen={isFarmModalOpen}
        onClose={() => setIsFarmModalOpen(false)}
        title="Add Agricultural Farm"
        subtitle="Create an agricultural estate or operational unit"
      >
        <form onSubmit={handleCreateFarm} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Farm Name * (फार्म का नाम)
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Green Valley Farm (Farm A)"
              value={farmForm.name}
              onChange={(e) => setFarmForm({ ...farmForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Total Land Area (Acres) * (कुल एकड़)
              </label>
              <input
                type="number"
                step="0.1"
                required
                placeholder="25.0"
                value={farmForm.totalArea}
                onChange={(e) => setFarmForm({ ...farmForm, totalArea: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Ownership Type (स्वामित्व)
              </label>
              <select
                value={farmForm.ownershipType}
                onChange={(e) => setFarmForm({ ...farmForm, ownershipType: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none bg-white"
              >
                <option value="OWNED">Owned (निजी भूमि)</option>
                <option value="LEASED">Leased / Rental (पट्टे/बटाई पर)</option>
              </select>
            </div>
          </div>

          {farmForm.ownershipType === 'LEASED' && (
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Annual Lease Rent (₹ / Year)
              </label>
              <input
                type="number"
                placeholder="e.g. 150000"
                value={farmForm.leaseCostPerYear}
                onChange={(e) => setFarmForm({ ...farmForm, leaseCostPerYear: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Location / Tehsil / Village
            </label>
            <input
              type="text"
              placeholder="e.g. Kalyanpur Tehsil, Narsinghpur"
              value={farmForm.location}
              onChange={(e) => setFarmForm({ ...farmForm, location: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Description / Notes
            </label>
            <textarea
              rows={2}
              placeholder="Soil overview, tube wells, road connectivity..."
              value={farmForm.description}
              onChange={(e) => setFarmForm({ ...farmForm, description: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsFarmModalOpen(false)}
              className="px-4 py-2 border border-stone-300 rounded-xl text-sm font-semibold text-stone-700 hover:bg-stone-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm"
            >
              Save Farm
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Field (Khet) */}
      <Modal
        isOpen={isFieldModalOpen}
        onClose={() => setIsFieldModalOpen(false)}
        title="Add Field (Khet) to Farm"
        subtitle="A farm can contain multiple independent fields"
      >
        <form onSubmit={handleCreateField} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Select Farm *
            </label>
            <select
              value={fieldForm.farmId}
              onChange={(e) => setFieldForm({ ...fieldForm, farmId: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none bg-white font-medium"
            >
              {farms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.totalArea} Ac Total - {f.remainingFarmAcres.toFixed(1)} Ac Free)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Field Name or Number * (e.g. Khet 1)
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Khet 1 - North Canal Plot"
                value={fieldForm.name}
                onChange={(e) => setFieldForm({ ...fieldForm, name: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Field Area in Acres * (एकड़)
              </label>
              <input
                type="number"
                step="0.1"
                required
                placeholder="10.0"
                value={fieldForm.area}
                onChange={(e) => setFieldForm({ ...fieldForm, area: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Soil Type (मिट्टी का प्रकार)
              </label>
              <select
                value={fieldForm.soilType}
                onChange={(e) => setFieldForm({ ...fieldForm, soilType: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none bg-white"
              >
                <option value="Black Cotton Soil">Black Cotton Soil (काली मिट्टी)</option>
                <option value="Alluvial Loam">Alluvial Loam (दोमट मिट्टी)</option>
                <option value="Sandy Loam">Sandy Loam (बलुई दोमट)</option>
                <option value="Red Soil">Red Soil (लाल मिट्टी)</option>
                <option value="Clay">Clay (चिकनी मिट्टी)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Irrigation Source (सिंचाई का साधन)
              </label>
              <select
                value={fieldForm.irrigationSource}
                onChange={(e) => setFieldForm({ ...fieldForm, irrigationSource: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none bg-white"
              >
                <option value="Canal & Borewell">Canal & Borewell (नहर व बोरवेल)</option>
                <option value="Tubewell (Electric/Solar)">Tubewell (नलकूप)</option>
                <option value="Drip System">Drip Irrigation (ड्रिप)</option>
                <option value="Sprinkler">Sprinkler (फव्वारा)</option>
                <option value="Rainfed">Rainfed (वर्षा आधारित)</option>
                <option value="River Lift">River Lift (नदी लिफ्ट)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Field Status
            </label>
            <select
              value={fieldForm.status}
              onChange={(e) => setFieldForm({ ...fieldForm, status: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none bg-white"
            >
              <option value="ACTIVE">Active (सक्रिय)</option>
              <option value="FALLOW">Fallow / Resting (परती)</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Notes
            </label>
            <textarea
              rows={2}
              placeholder="Drainage status, leveling, stones..."
              value={fieldForm.notes}
              onChange={(e) => setFieldForm({ ...fieldForm, notes: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsFieldModalOpen(false)}
              className="px-4 py-2 border border-stone-300 rounded-xl text-sm font-semibold text-stone-700 hover:bg-stone-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm"
            >
              Save Field (खेत जोड़ें)
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Subdivide Field into Sections */}
      <Modal
        isOpen={isSectionModalOpen}
        onClose={() => setIsSectionModalOpen(false)}
        title={`Divide "${selectedFieldForSection?.name}" into Sub-Plots`}
        subtitle={`Field total: ${selectedFieldForSection?.area} Acres. Partition into smaller manageable plots.`}
      >
        <form onSubmit={handleCreateSection} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Subplot / Section Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Subplot A (Wheat block) or East Half"
              value={sectionForm.name}
              onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Section Area (Acres) *
            </label>
            <input
              type="number"
              step="0.1"
              required
              placeholder="e.g. 4.0"
              value={sectionForm.area}
              onChange={(e) => setSectionForm({ ...sectionForm, area: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Notes
            </label>
            <input
              type="text"
              placeholder="Soil variation, boundary landmarks..."
              value={sectionForm.notes}
              onChange={(e) => setSectionForm({ ...sectionForm, notes: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsSectionModalOpen(false)}
              className="px-4 py-2 border border-stone-300 rounded-xl text-sm font-semibold text-stone-700 hover:bg-stone-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm"
            >
              Create Sub-Plot
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
