import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: string;
  trendType?: 'positive' | 'negative' | 'neutral';
  color?: 'blue' | 'amber' | 'emerald' | 'purple' | 'stone' | 'rose';
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendType = 'neutral',
  color = 'blue',
}: StatCardProps) {
  const colorSchemes = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    stone: 'bg-stone-100 text-stone-600 border-stone-200',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
          {title}
        </span>
        <div className={`p-2.5 rounded-xl border ${colorSchemes[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="flex items-baseline space-x-2">
        <span className="text-2xl font-bold text-stone-900 tracking-tight">{value}</span>
        {trend && (
          <span
            className={`text-xs font-medium px-1.5 py-0.5 rounded ${
              trendType === 'positive'
                ? 'bg-blue-100 text-blue-800'
                : trendType === 'negative'
                ? 'bg-rose-100 text-rose-800'
                : 'bg-stone-100 text-stone-700'
            }`}
          >
            {trend}
          </span>
        )}
      </div>

      {subtitle && <p className="text-xs text-stone-500 mt-1">{subtitle}</p>}
    </div>
  );
}
