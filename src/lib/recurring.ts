import { addDays, addMonths, isSameDay, parseISO, startOfDay } from "date-fns";
import type { ImportantDate, UpcomingDate } from "../types";

export function leapSafeDate(year: number, month: number, day: number): Date {
  const date = new Date(year, month - 1, Math.min(day, daysInMonth(year, month)));
  date.setHours(0, 0, 0, 0);
  return date;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export interface RecurringOccurrence {
  month: number;
  day: number;
  year: number;
  date: string;
  leapAdjusted: boolean;
}

export function nextOccurrence(
  month: number,
  day: number,
  from: Date = new Date(),
): RecurringOccurrence {
  const start = startOfDay(from);
  const currentYear = start.getFullYear();
  let tryYear = currentYear;
  while (true) {
    const d = leapSafeDate(tryYear, month, day);
    if (d >= start || tryYear > currentYear) {
      return {
        month,
        day,
        year: tryYear,
        date: toISODate(d),
        leapAdjusted: !isLeapYear(tryYear) && month === 2 && day === 29,
      };
    }
    tryYear += 1;
  }
}

export function occurrenceInMonth(
  year: number,
  month: number,
  day: number,
): { date: string; leapAdjusted: boolean } | null {
  const dim = daysInMonth(year, month);
  if (day > dim) {
    if (month === 2 && day === 29 && !isLeapYear(year)) {
      const d = new Date(year, 1, 28);
      d.setHours(0, 0, 0, 0);
      return { date: toISODate(d), leapAdjusted: true };
    }
    return null;
  }
  const d = new Date(year, month - 1, day);
  d.setHours(0, 0, 0, 0);
  return { date: toISODate(d), leapAdjusted: false };
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseISODate(s: string): Date {
  const d = parseISO(s);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function ageOn(date: Date, birthMonth: number, birthDay: number, birthYear: number): number {
  let age = date.getFullYear() - birthYear;
  const before = date.getMonth() + 1 < birthMonth ||
    (date.getMonth() + 1 === birthMonth && date.getDate() < birthDay);
  if (before) age -= 1;
  return age;
}

export function ageReachedThisYear(year: number, birthYear: number): number {
  return year - birthYear;
}

export function isMilestone(age: number): boolean {
  return age > 0 && age % 10 === 0;
}

export function upcomingDatesFor(
  dates: ImportantDate[],
  from: Date = new Date(),
  windowDays = 30,
): UpcomingDate[] {
  const result: UpcomingDate[] = [];
  const horizon = addDays(startOfDay(from), windowDays);
  for (const d of dates) {
    let occ = nextOccurrence(d.month, d.day, from);
    if (occ.year === from.getFullYear() && d.year != null) {
      const y = from.getFullYear();
      const candidate = leapSafeDate(y, d.month, d.day);
      if (candidate < startOfDay(from) && d.year < y) {
        occ = nextOccurrence(d.month, d.day, new Date(from.getFullYear() + 1, 0, 1));
      }
    }
    if (parseISO(occ.date) > horizon) continue;
    let age: number | null = null;
    if (d.year != null) {
      age = ageOn(parseISODate(occ.date), d.month, d.day, d.year);
    }
    result.push({
      id: d.id,
      personId: d.personId,
      kind: d.kind,
      label: d.label,
      year: d.year,
      occurrence: occ.date,
      age,
      milestone: age != null && isMilestone(age),
    });
  }
  result.sort((a, b) => a.occurrence.localeCompare(b.occurrence));
  return result;
}

export function nextNMonths(from: Date, n: number): { year: number; month: number }[] {
  const out: { year: number; month: number }[] = [];
  let d = startOfDay(from);
  for (let i = 0; i < n; i++) {
    out.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
    d = addMonths(d, 1);
  }
  return out;
}

export function occurrenceWithin(
  month: number,
  day: number,
  windowStart: Date,
  windowEnd: Date,
): boolean {
  const start = startOfDay(windowStart);
  const end = startOfDay(windowEnd);
  const occ = nextOccurrence(month, day, start);
  const d = parseISO(occ.date);
  return d >= start && d <= end;
}

export function isSameOccurrence(a: RecurringOccurrence, b: Date): boolean {
  return isSameDay(parseISO(a.date), b);
}
