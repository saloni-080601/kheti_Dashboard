'use client';

import React from 'react';
import {
  CheckCircle2,
  Clock,
  Circle,
  Coins,
  Users,
  Calendar,
  Layers,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';
import { HORTICULTURE_STAGES } from '@/lib/horticulture';

interface StageProgressStepperProps {
  crop: any;
  onOpenStageModal: (stage: any) => void;
}

export function StageProgressStepper({ crop, onOpenStageModal }: StageProgressStepperProps) {
  const currentStageNumber = crop.currentStageNumber || 1;
  const stages = crop.stages || [];

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-sm space-y-4">
      {/* Title & Current Stage Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full">
              Horticulture 9-Stage Lifecycle
            </span>
            <span className="text-xs font-semibold text-stone-500">
              Stage {currentStageNumber} of 9
            </span>
          </div>
          <h3 className="text-base font-bold text-stone-900 mt-1 flex items-center gap-1.5">
            <span>{crop.name}</span>
            <span className="text-stone-400 font-normal">|</span>
            <span className="text-blue-600 font-semibold">{crop.currentStageName}</span>
          </h3>
        </div>

        <div className="text-xs text-stone-600 bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-200/60 self-start sm:self-auto flex items-center gap-3">
          <div>
            <span className="text-stone-600">Est. 1st Harvest: </span>
            <span className="font-bold text-stone-800">
              Day {crop.estDaysToHarvest || 35}
            </span>
          </div>
          {crop.actualFirstHarvest && (
            <div className="text-emerald-700 font-semibold border-l border-stone-200 pl-3">
              Actual Picked: {format(new Date(crop.actualFirstHarvest), 'dd MMM')}
            </div>
          )}
        </div>
      </div>

      {/* Horizontal / Grid Stepper for 9 Stages */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-9 gap-2.5">
        {HORTICULTURE_STAGES.map((def) => {
          const stageRecord = stages.find((s: any) => s.stageNumber === def.stageNumber);
          const isCompleted =
            stageRecord?.status === 'COMPLETED' || def.stageNumber < currentStageNumber;
          const isCurrent =
            stageRecord?.status === 'IN_PROGRESS' || def.stageNumber === currentStageNumber;
          const isPending = !isCompleted && !isCurrent;

          const stageCost = stageRecord?.totalCost || 0;
          const dateToShow =
            stageRecord?.actualDate ||
            stageRecord?.completedDate ||
            stageRecord?.expectedDate;

          return (
            <div
              key={def.stageNumber}
              onClick={() => onOpenStageModal({ ...def, ...stageRecord, cropId: crop.id })}
              className={`relative p-3 rounded-xl border text-left cursor-pointer transition-all hover:shadow-md flex flex-col justify-between ${
                isCompleted
                  ? 'bg-emerald-50/60 border-emerald-200 hover:border-emerald-300'
                  : isCurrent
                  ? 'bg-blue-50/90 border-blue-400 ring-2 ring-blue-500/20'
                  : 'bg-stone-50/60 border-stone-200/70 hover:border-stone-300 opacity-80'
              }`}
            >
              {/* Stage Number & Status Badge */}
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                    isCompleted
                      ? 'bg-emerald-200/70 text-emerald-800'
                      : isCurrent
                      ? 'bg-blue-600 text-white'
                      : 'bg-stone-200 text-stone-600'
                  }`}
                >
                  #{def.stageNumber}
                </span>

                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : isCurrent ? (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
                  </span>
                ) : (
                  <Circle className="w-3.5 h-3.5 text-stone-300" />
                )}
              </div>

              {/* Title & Hindi Subtitle */}
              <div>
                <h4 className="text-xs font-bold text-stone-900 leading-tight">
                  {def.stageName}
                </h4>
                <p className="text-[10px] text-stone-500 mt-0.5 font-medium leading-tight line-clamp-1">
                  {def.hindiName}
                </p>
              </div>

              {/* Date & Cost footer */}
              <div className="mt-3 pt-2 border-t border-stone-200/50 text-[10px] space-y-0.5">
                <div className="flex items-center justify-between text-stone-600">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-2.5 h-2.5" />
                    {dateToShow ? format(new Date(dateToShow), 'dd MMM') : `Day ${def.defaultOffsetDays}`}
                  </span>
                  {stageRecord?.actualDate && (
                    <span className="text-[9px] text-emerald-700 font-bold">Done</span>
                  )}
                </div>

                <div className="flex items-center justify-between text-stone-600 font-semibold pt-0.5">
                  <span>Kharcha:</span>
                  <span className={stageCost > 0 ? 'text-amber-700' : 'text-stone-400'}>
                    {stageCost > 0 ? formatCurrency(stageCost) : '₹0'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
