'use client';

import React, { useState, useEffect } from 'react';
import { useFarm } from '@/context/FarmContext';
import { StatusBadge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import {
  CalendarCheck,
  Plus,
  CheckCircle2,
  Clock,
  Layers,
  Sprout,
  Tractor,
  AlertTriangle,
  CheckCircle,
  Filter,
} from 'lucide-react';

export default function ActivitiesPage() {
  const { selectedFarmId } = useFarm();
  const [activities, setActivities] = useState<any[]>([]);
  const [farms, setFarms] = useState<any[]>([]);
  const [fields, setFields] = useState<any[]>([]);
  const [crops, setCrops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [form, setForm] = useState({
    farmId: '',
    fieldId: '',
    cropId: '',
    title: '',
    activityType: 'FERTILIZING',
    date: new Date().toISOString().split('T')[0],
    status: 'PENDING',
    cost: '',
    machineryUsed: '',
    notes: '',
  });

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [actRes, farmsRes, fieldsRes, cropsRes] = await Promise.all([
        fetch(`/api/activities?farmId=${selectedFarmId}&status=${statusFilter}`),
        fetch('/api/farms'),
        fetch(`/api/fields?farmId=${selectedFarmId}`),
        fetch(`/api/crops?farmId=${selectedFarmId}`),
      ]);

      if (actRes.ok && farmsRes.ok && fieldsRes.ok && cropsRes.ok) {
        setActivities(await actRes.json());
        const farmsData = await farmsRes.json();
        const fieldsData = await fieldsRes.json();
        const cropsData = await cropsRes.json();

        setFarms(farmsData);
        setFields(fieldsData);
        setCrops(cropsData);

        if (farmsData.length > 0 && !form.farmId) {
          setForm((prev) => ({
            ...prev,
            farmId: farmsData[0].id,
            fieldId: fieldsData[0]?.id || '',
            cropId: cropsData[0]?.id || '',
          }));
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
  }, [selectedFarmId, statusFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to schedule activity');

      setSuccessMsg('Farming activity scheduled successfully!');
      setIsModalOpen(false);
      setForm({
        farmId: farms[0]?.id || '',
        fieldId: fields[0]?.id || '',
        cropId: crops[0]?.id || '',
        title: '',
        activityType: 'FERTILIZING',
        date: new Date().toISOString().split('T')[0],
        status: 'PENDING',
        cost: '',
        machineryUsed: '',
        notes: '',
      });
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleToggleStatus = async (activity: any) => {
    const nextStatus = activity.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    try {
      const res = await fetch('/api/activities', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: activity.id, status: nextStatus }),
      });
      if (res.ok) {
        setSuccessMsg(`Marked activity as ${nextStatus}!`);
        await loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const availableFields = fields.filter((f) => !form.farmId || f.farmId === form.farmId);
  const availableCrops = crops.filter((c) => !form.fieldId || c.fieldId === form.fieldId);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <span>Farming Activities & Tasks</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
              कृषि कार्य व दैनिक डायरी
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Schedule and track ploughing, sowing, spraying, weeding, irrigation, and harvesting.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-stone-100 border border-stone-200 rounded-xl text-xs font-semibold text-stone-800"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending (बाकी कार्य)</option>
            <option value="IN_PROGRESS">In Progress (जारी)</option>
            <option value="COMPLETED">Completed (सम्पन्न)</option>
          </select>

          <button
            onClick={() => {
              setErrorMsg('');
              setIsModalOpen(true);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors shadow-sm shadow-blue-700/20"
          >
            <Plus className="w-4 h-4" /> Schedule Activity (नया कार्य)
          </button>
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

      {/* Activities Timeline List */}
      <div className="bg-white rounded-2xl border border-stone-200/90 shadow-sm overflow-hidden">
        <div className="p-4 bg-stone-50/70 border-b border-stone-200 flex items-center justify-between text-xs font-bold text-stone-600">
          <span>{activities.length} Recorded Activities</span>
          <span>Click checkbox to mark done</span>
        </div>

        <div className="divide-y divide-stone-100">
          {activities.length > 0 ? (
            activities.map((act) => {
              const isDone = act.status === 'COMPLETED';

              return (
                <div
                  key={act.id}
                  className={`p-4 sm:p-5 flex items-start sm:items-center justify-between gap-4 transition-colors ${
                    isDone ? 'bg-stone-50/30' : 'hover:bg-amber-50/20'
                  }`}
                >
                  <div className="flex items-start sm:items-center space-x-3.5">
                    <button
                      onClick={() => handleToggleStatus(act)}
                      className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-colors flex-shrink-0 mt-0.5 sm:mt-0 ${
                        isDone
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-stone-300 hover:border-blue-500 text-transparent'
                      }`}
                    >
                      ✓
                    </button>

                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <span
                          className={`font-bold text-sm sm:text-base ${
                            isDone ? 'line-through text-stone-500' : 'text-stone-900'
                          }`}
                        >
                          {act.title}
                        </span>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                          {act.activityType.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="flex items-center space-x-3 text-xs text-stone-500 flex-wrap gap-y-1">
                        <span className="flex items-center gap-1 font-medium text-stone-700">
                          <Clock className="w-3.5 h-3.5 text-stone-400" />
                          {new Date(act.date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-stone-400" />
                          {act.field?.name || act.farm?.name}
                        </span>
                        {act.crop && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-blue-800 font-semibold">
                              <Sprout className="w-3.5 h-3.5 text-blue-600" />
                              {act.crop.name}
                            </span>
                          </>
                        )}
                        {act.machineryUsed && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-stone-600">
                              <Tractor className="w-3.5 h-3.5 text-stone-400" />
                              {act.machineryUsed}
                            </span>
                          </>
                        )}
                      </div>

                      {act.notes && (
                        <p className="text-xs text-stone-600 mt-1 italic">
                          &quot;{act.notes}&quot;
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <StatusBadge status={act.status} />
                    {act.cost > 0 && (
                      <span className="text-xs font-bold text-stone-900">
                        ₹{act.cost.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-stone-400 text-sm">
              No activities found for this filter.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Add Activity */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Schedule Farm Activity (कृषि कार्य जोड़ें)"
        subtitle="Log task details, assigned machinery, and estimated costs"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Activity Title * (कार्य विवरण)
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Second Urea Top Dressing or Herbicide Spray"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Activity Category *
              </label>
              <select
                value={form.activityType}
                onChange={(e) => setForm({ ...form, activityType: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none bg-white font-medium"
              >
                <option value="FERTILIZING">Fertilizing / खाद डालना</option>
                <option value="PESTICIDE">Pesticide / Spray (कीटनाशक छिड़काव)</option>
                <option value="IRRIGATION">Irrigation / सिंचाई</option>
                <option value="WEEDING">Weeding / निंदाई-गुड़ाई</option>
                <option value="SOIL_PREPARATION">Ploughing / खेत की जुताई</option>
                <option value="SOWING">Sowing / बुवाई</option>
                <option value="HARVESTING">Harvesting / कटाई</option>
                <option value="THRESHING">Threshing / गहाई</option>
                <option value="OTHER">Other Farm Operation</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Scheduled Date *
              </label>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Farm *
              </label>
              <select
                value={form.farmId}
                onChange={(e) => setForm({ ...form, farmId: e.target.value })}
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
                Field (Khet)
              </label>
              <select
                value={form.fieldId}
                onChange={(e) => setForm({ ...form, fieldId: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none bg-white font-medium"
              >
                <option value="">Select Field (Optional)</option>
                {availableFields.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Linked Crop
              </label>
              <select
                value={form.cropId}
                onChange={(e) => setForm({ ...form, cropId: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none bg-white font-medium"
              >
                <option value="">Select Crop (Optional)</option>
                {availableCrops.map((c) => (
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
                Cost Incurred (₹)
              </label>
              <input
                type="number"
                placeholder="e.g. 1500"
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Machinery Used
              </label>
              <input
                type="text"
                placeholder="e.g. Mahindra 575 DI + Rotavator"
                value={form.machineryUsed}
                onChange={(e) => setForm({ ...form, machineryUsed: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Field Observations / Instructions
            </label>
            <textarea
              rows={2}
              placeholder="Dosage rate, nozzle type, weather remarks..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none"
            />
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
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm"
            >
              Save Activity
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
