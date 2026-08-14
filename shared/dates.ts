import { ImportantDate, ImportantDateType } from './types';
import { formatDateISO, parseDateISO, diffCalendarDays } from './cadence';

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Given month (1-12) and day (1-31), return the valid Date for a specific target year,
 * properly handling Feb 29 in non-leap years (mapped to Feb 28).
 */
export function getValidDateForYear(month: number, day: number, targetYear: number): Date {
  let targetMonth = month;
  let targetDay = day;

  // Handle Feb 29 in non-leap year
  if (month === 2 && day === 29 && !isLeapYear(targetYear)) {
    targetDay = 28;
  } else {
    // Clamp to max days in month just in case
    const maxDays = new Date(targetYear, targetMonth, 0).getDate();
    if (targetDay > maxDays) {
      targetDay = maxDays;
    }
  }

  return new Date(targetYear, targetMonth - 1, targetDay, 0, 0, 0, 0);
}

export interface UpcomingOccurrence {
  date: Date;
  dateString: string; // YYYY-MM-DD
  daysUntil: number; // 0 = today, > 0 = future
  turningAge?: number | null;
  currentAge?: number | null;
  isMilestone?: boolean;
}

/**
 * Calculates the next occurrence of an important date from a reference date (today).
 */
export function getNextOccurrence(
  importantDate: Pick<ImportantDate, 'month' | 'day' | 'year' | 'type'>,
  today: Date = new Date()
): UpcomingOccurrence {
  const currentYear = today.getFullYear();
  const todayAtMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);

  // Check this year's occurrence
  let thisYearDate = getValidDateForYear(importantDate.month, importantDate.day, currentYear);
  let occurrenceDate: Date;
  let targetYear: number;

  if (diffCalendarDays(thisYearDate, todayAtMidnight) >= 0) {
    // Today or in the future this year
    occurrenceDate = thisYearDate;
    targetYear = currentYear;
  } else {
    // Already passed this year -> next year
    targetYear = currentYear + 1;
    occurrenceDate = getValidDateForYear(importantDate.month, importantDate.day, targetYear);
  }

  const daysUntil = diffCalendarDays(occurrenceDate, todayAtMidnight);

  let turningAge: number | null = null;
  let currentAge: number | null = null;
  let isMilestone = false;

  if (importantDate.year != null && importantDate.year > 0) {
    turningAge = targetYear - importantDate.year;
    // Current age right now
    const thisYearPassed = diffCalendarDays(thisYearDate, todayAtMidnight) < 0;
    currentAge = thisYearPassed ? currentYear - importantDate.year : currentYear - importantDate.year - 1;

    // Milestone birthday: turning age is a positive decade (e.g., 20, 30, 40, 50, 60, 70, 80, 90, 100)
    if (importantDate.type === 'birthday' && turningAge > 0 && turningAge % 10 === 0) {
      isMilestone = true;
    }
  }

  return {
    date: occurrenceDate,
    dateString: formatDateISO(occurrenceDate),
    daysUntil,
    turningAge,
    currentAge,
    isMilestone,
  };
}

export const IMPORTANT_DATE_LABELS: Record<ImportantDateType, string> = {
  birthday: 'Birthday',
  anniversary: 'Anniversary',
  work_anniversary: 'Work Anniversary',
  child_birthday: "Child's Birthday",
  other: 'Important Date',
};
