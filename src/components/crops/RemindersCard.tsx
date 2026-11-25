'use client';

import React, { useState } from 'react';
import {
  BellRing,
  Droplets,
  Sprout,
  Users,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

interface RemindersCardProps {
  reminders: any[];
  onReminderResolved: () => void;
}

export function RemindersCard({ reminders, onReminderResolved }: RemindersCardProps) {
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const handleResolve = async (id: string) => {
    setResolvingId(id);
    try {
      const res = await fetch('/api/reminders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isResolved: true }),
      });
      if (res.ok) {
        onReminderResolved();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setResolvingId(null);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'DRIP_CHECK':
        return <Droplets className="w-4 h-4 text-blue-600" />;
      case 'FERTIGATION':
      case 'SPRAY':
        return <Sprout className="w-4 h-4 text-emerald-600" />;
      case 'LABOUR_BOOKING':
        return <Users className="w-4 h-4 text-purple-600" />;
      default:
        return <BellRing className="w-4 h-4 text-amber-600" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'HIGH':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  if (!reminders || reminders.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <BellRing className="w-4 h-4 text-stone-400" />
          <h3 className="text-sm font-bold text-stone-900">Crop Reminders & Alerts</h3>
        </div>
        <p className="text-xs text-stone-500">No active alerts. All crop tasks are up to date!</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
            <BellRing className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-900">
              Crop Action Alerts & Reminders
            </h3>
            <p className="text-[11px] text-stone-500">
              Drip check, fertigation, spray, labour booking & picking alerts
            </p>
          </div>
        </div>

        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
          {reminders.length} Active
        </span>
      </div>

      <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
        {reminders.map((r) => {
          const dueDateObj = new Date(r.dueDate);
          const daysLeft = differenceInDays(dueDateObj, new Date());
          const isOverdue = daysLeft < 0;

          return (
            <div
              key={r.id}
              className={`p-3 rounded-xl border flex items-start justify-between gap-3 transition-colors ${
                isOverdue
                  ? 'bg-rose-50/70 border-rose-200'
                  : 'bg-stone-50/70 border-stone-200/80 hover:bg-stone-50'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 rounded-lg bg-white border border-stone-200/80 shadow-xs flex-shrink-0 mt-0.5">
                  {getCategoryIcon(r.category)}
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-stone-900 leading-tight">
                      {r.title}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${getPriorityBadge(
                        r.priority
                      )}`}
                    >
                      {r.priority}
                    </span>
                  </div>

                  {r.notes && (
                    <p className="text-[11px] text-stone-600 mt-0.5 leading-snug">
                      {r.notes}
                    </p>
                  )}

                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-stone-400">
                    <span className="flex items-center gap-1 font-medium text-stone-600">
                      <Calendar className="w-3 h-3" />
                      Due: {format(dueDateObj, 'dd MMM yyyy')}
                    </span>
                    <span
                      className={`font-bold ${
                        isOverdue
                          ? 'text-rose-600'
                          : daysLeft === 0
                          ? 'text-amber-600'
                          : 'text-emerald-700'
                      }`}
                    >
                      {isOverdue
                        ? `${Math.abs(daysLeft)}d overdue`
                        : daysLeft === 0
                        ? 'Due Today'
                        : `in ${daysLeft} days`}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleResolve(r.id)}
                disabled={resolvingId === r.id}
                title="Mark as Done"
                className="p-1.5 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors flex-shrink-0 border border-transparent hover:border-emerald-200"
              >
                <CheckCircle2 className="w-5 h-5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
