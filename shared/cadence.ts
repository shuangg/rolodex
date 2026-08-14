import {
  CircleType,
  CIRCLE_CADENCE_DAYS,
  CheckInStatus,
  Person,
} from './types';

/**
 * Format Date object to YYYY-MM-DD string in local timezone
 */
export function formatDateISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse YYYY-MM-DD string to Date object at local midnight
 */
export function parseDateISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

/**
 * Difference in calendar days between dateA and dateB (dateA - dateB)
 */
export function diffCalendarDays(dateA: Date, dateB: Date): number {
  const utcA = Date.UTC(dateA.getFullYear(), dateA.getMonth(), dateA.getDate());
  const utcB = Date.UTC(dateB.getFullYear(), dateB.getMonth(), dateB.getDate());
  return Math.round((utcA - utcB) / (1000 * 60 * 60 * 24));
}

/**
 * Add days to a Date object
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setDate(result.getDate() + days);
  return result;
}

export interface ComputedStatus {
  status: CheckInStatus;
  days_overdue?: number;
  days_until_due?: number;
  effective_cadence_days: number;
  next_due_date?: string;
}

export function computeCheckInStatus(
  person: Pick<Person, 'circle' | 'cadence_override_days' | 'check_ins_enabled' | 'snooze_until' | 'created_at'>,
  lastContactedDateStr: string | null | undefined,
  today: Date = new Date()
): ComputedStatus {
  const effectiveCadence =
    person.cadence_override_days != null && person.cadence_override_days > 0
      ? person.cadence_override_days
      : CIRCLE_CADENCE_DAYS[person.circle as CircleType] || 30;

  // 1. If check-ins are disabled
  if (person.check_ins_enabled === false) {
    return {
      status: 'off',
      effective_cadence_days: effectiveCadence,
    };
  }

  const todayStr = formatDateISO(today);

  // 2. If snoozed until a date in the future
  if (person.snooze_until && person.snooze_until > todayStr) {
    return {
      status: 'snoozed',
      effective_cadence_days: effectiveCadence,
    };
  }

  // 3. If never contacted
  if (!lastContactedDateStr) {
    // Created date or standard
    const createdDate = person.created_at ? parseDateISO(person.created_at.slice(0, 10)) : today;
    const daysSinceCreated = Math.max(0, diffCalendarDays(today, createdDate));
    return {
      status: 'overdue',
      days_overdue: Math.max(1, daysSinceCreated),
      effective_cadence_days: effectiveCadence,
    };
  }

  // 4. Calculate next due date
  const lastContactDate = parseDateISO(lastContactedDateStr);
  const nextDueDate = addDays(lastContactDate, effectiveCadence);
  const nextDueDateStr = formatDateISO(nextDueDate);
  const diffDays = diffCalendarDays(nextDueDate, today); // positive if in future, negative if overdue

  if (diffDays < 0) {
    return {
      status: 'overdue',
      days_overdue: Math.abs(diffDays),
      effective_cadence_days: effectiveCadence,
      next_due_date: nextDueDateStr,
    };
  } else if (diffDays <= 7) {
    return {
      status: 'due_soon',
      days_until_due: diffDays,
      effective_cadence_days: effectiveCadence,
      next_due_date: nextDueDateStr,
    };
  } else {
    return {
      status: 'in_touch',
      days_until_due: diffDays,
      effective_cadence_days: effectiveCadence,
      next_due_date: nextDueDateStr,
    };
  }
}
