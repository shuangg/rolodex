import React from 'react';
import { CircleType, CIRCLE_LABELS } from '@shared/types';

interface CircleBadgeProps {
  circle: CircleType;
  short?: boolean;
  className?: string;
}

export const CircleBadge: React.FC<CircleBadgeProps> = ({ circle, short = false, className = '' }) => {
  const styles: Record<CircleType, string> = {
    inner: 'bg-amber-50 text-amber-900 border-amber-300',
    close: 'bg-sky-50 text-sky-900 border-sky-300',
    wider: 'bg-purple-50 text-purple-900 border-purple-300',
    distant: 'bg-slate-100 text-slate-700 border-slate-300',
  };

  const shortLabels: Record<CircleType, string> = {
    inner: 'Inner',
    close: 'Close',
    wider: 'Wider',
    distant: 'Distant',
  };

  const label = short ? shortLabels[circle] : CIRCLE_LABELS[circle] || circle;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${styles[circle] || styles.wider} ${className}`}
    >
      {label}
    </span>
  );
};
