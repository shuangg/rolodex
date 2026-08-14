import React from 'react';
import { CheckInStatus } from '@shared/types';
import { Clock, CheckCircle2, AlertCircle, Moon, MinusCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: CheckInStatus;
  daysOverdue?: number;
  daysUntilDue?: number;
  snoozeUntil?: string | null;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  daysOverdue,
  daysUntilDue,
  snoozeUntil,
  size = 'sm',
}) => {
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1';

  switch (status) {
    case 'in_touch':
      return (
        <span
          className={`inline-flex items-center gap-1 font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 ${sizeClass}`}
        >
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>In touch</span>
        </span>
      );

    case 'due_soon':
      return (
        <span
          className={`inline-flex items-center gap-1 font-medium rounded-full bg-amber-50 text-amber-800 border border-amber-200 ${sizeClass}`}
        >
          <Clock className="w-3 h-3 text-amber-600" />
          <span>Due soon {daysUntilDue != null ? `(${daysUntilDue}d)` : ''}</span>
        </span>
      );

    case 'overdue':
      return (
        <span
          className={`inline-flex items-center gap-1 font-medium rounded-full bg-rose-50 text-rose-700 border border-rose-200 ${sizeClass}`}
        >
          <AlertCircle className="w-3 h-3 text-rose-600" />
          <span>Overdue {daysOverdue != null ? `(${daysOverdue}d)` : ''}</span>
        </span>
      );

    case 'snoozed':
      return (
        <span
          className={`inline-flex items-center gap-1 font-medium rounded-full bg-purple-50 text-purple-700 border border-purple-200 ${sizeClass}`}
        >
          <Moon className="w-3 h-3 text-purple-600" />
          <span>Snoozed {snoozeUntil ? `until ${snoozeUntil}` : ''}</span>
        </span>
      );

    case 'off':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1 font-medium rounded-full bg-gray-100 text-gray-600 border border-gray-200 ${sizeClass}`}
        >
          <MinusCircle className="w-3 h-3 text-gray-400" />
          <span>Check-ins off</span>
        </span>
      );
  }
};
