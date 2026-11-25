import React from 'react';

interface BadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'sm' }: BadgeProps) {
  const normalized = status.toUpperCase();
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';

  let colorClasses = 'bg-stone-100 text-stone-700 border-stone-200';

  if (['ACTIVE', 'PAID', 'COMPLETED', 'GROWING', 'AVAILABLE'].includes(normalized)) {
    colorClasses = 'bg-blue-50 text-blue-700 border-blue-200 font-medium';
  } else if (['PENDING', 'PLANNING', 'IN_USE'].includes(normalized)) {
    colorClasses = 'bg-amber-50 text-amber-700 border-amber-200 font-medium';
  } else if (['PARTIAL', 'IN_PROGRESS', 'HARVESTING'].includes(normalized)) {
    colorClasses = 'bg-blue-50 text-blue-700 border-blue-200 font-medium';
  } else if (['HARVESTED'].includes(normalized)) {
    colorClasses = 'bg-purple-50 text-purple-700 border-purple-200 font-medium';
  } else if (['INACTIVE', 'CANCELLED', 'FAILED', 'FALLOW'].includes(normalized)) {
    colorClasses = 'bg-stone-100 text-stone-600 border-stone-300';
  }

  // Readable labels
  const labelMap: Record<string, string> = {
    ACTIVE: 'Active / सक्रिय',
    FALLOW: 'Fallow / परती',
    INACTIVE: 'Inactive',
    GROWING: 'Growing / बढ़ रहा है',
    HARVESTED: 'Harvested / कटाई पूर्ण',
    HARVESTING: 'Harvesting',
    PLANNING: 'Planned',
    SOWN: 'Sown / बोया गया',
    PENDING: 'Pending / बकाया',
    PAID: 'Paid / चुकता',
    PARTIAL: 'Partial / आंशिक',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed / सम्पन्न',
    OWNED: 'Owned / निजी',
    LEASED: 'Leased / बटाई',
    RABI: 'Rabi (रबी)',
    KHARIF: 'Kharif (खरीफ)',
    ZAID: 'Zaid (जायद)',
    PERENNIAL: 'Perennial',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border ${sizeClasses} ${colorClasses}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-70" />
      {labelMap[normalized] || status}
    </span>
  );
}
