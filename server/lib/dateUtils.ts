import { addDays, differenceInCalendarDays, format, parse, startOfDay } from 'date-fns'

const ISO_FORMAT = 'yyyy-MM-dd'

export function todayISO(): string {
  return format(startOfDay(new Date()), ISO_FORMAT)
}

export function parseISODate(iso: string): Date {
  const d = parse(iso, ISO_FORMAT, startOfDay(new Date()))
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid ISO date: ${iso}`)
  return d
}

export function toISO(d: Date): string {
  return format(startOfDay(d), ISO_FORMAT)
}

export function addDaysISO(iso: string, days: number): string {
  return toISO(addDays(parseISODate(iso), days))
}

export function daysBetweenISO(fromISO: string, toISOStr: string): number {
  return differenceInCalendarDays(parseISODate(toISOStr), parseISODate(fromISO))
}

export function isValidISODate(iso: unknown): iso is string {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false
  try {
    parseISODate(iso)
    return true
  } catch {
    return false
  }
}

export function nowISO(): string {
  return new Date().toISOString()
}
