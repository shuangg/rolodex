import {
  addYears,
  getDaysInMonth,
  isLeapYear,
  startOfDay,
} from "date-fns";

export function isLeapYearNum(year: number): boolean {
  return isLeapYear(new Date(year, 0, 1));
}

export function clampMonthDay(year: number, month: number, day: number): Date {
  const max = getDaysInMonth(new Date(year, month - 1, 1));
  const safeDay = Math.min(day, max);
  return new Date(year, month - 1, safeDay);
}

export function occurrenceInYear(year: number, month: number, day: number): Date {
  return clampMonthDay(year, month, day);
}

export function nextOccurrence(
  month: number,
  day: number,
  fromDate: Date = new Date(),
): Date {
  const from = startOfDay(fromDate);
  const thisYear = occurrenceInYear(from.getFullYear(), month, day);
  if (startOfDay(thisYear) >= from) return startOfDay(thisYear);
  return startOfDay(occurrenceInYear(from.getFullYear() + 1, month, day));
}

export function previousOccurrence(
  month: number,
  day: number,
  fromDate: Date = new Date(),
): Date {
  const from = startOfDay(fromDate);
  const thisYear = occurrenceInYear(from.getFullYear(), month, day);
  if (startOfDay(thisYear) <= from) return startOfDay(thisYear);
  return startOfDay(occurrenceInYear(from.getFullYear() - 1, month, day));
}

export function ageOn(birthYear: number, onDate: Date): number {
  return onDate.getFullYear() - birthYear;
}

export function ageThisYear(birthYear: number, today: Date = new Date()): number {
  return today.getFullYear() - birthYear;
}

export function isMilestoneAge(age: number): boolean {
  return age > 0 && age % 10 === 0;
}

export function daysUntilNext(month: number, day: number, fromDate: Date = new Date()): number {
  const next = nextOccurrence(month, day, fromDate);
  return Math.round((startOfDay(next).getTime() - startOfDay(fromDate).getTime()) / 86_400_000);
}

export function upcomingWithin(
  month: number,
  day: number,
  days: number,
  fromDate: Date = new Date(),
): boolean {
  return daysUntilNext(month, day, fromDate) <= days;
}

export function nextYearOccurrence(month: number, day: number, fromDate: Date = new Date()): Date {
  return addYears(nextOccurrence(month, day, fromDate), 0);
}
