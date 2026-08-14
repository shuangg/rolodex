import {
  addDays,
  differenceInCalendarDays,
  format,
  parseISO,
  startOfDay,
} from "date-fns";
import { CIRCLE_CADENCE_DAYS } from "./types.ts";
import type { CheckInStatus, Circle, Person } from "./types.ts";

export function cadenceDaysFor(person: Pick<Person, "circle" | "cadenceOverrideDays" | "checkinsEnabled">): number | null {
  if (!person.checkinsEnabled) return null;
  if (person.cadenceOverrideDays != null) return person.cadenceOverrideDays;
  return CIRCLE_CADENCE_DAYS[person.circle];
}

export function isSnoozed(snoozeUntil: string | null, today: Date = new Date()): boolean {
  if (!snoozeUntil) return false;
  return startOfDay(parseISO(snoozeUntil)) >= startOfDay(today);
}

export function dueDateFor(
  person: Pick<Person, "circle" | "cadenceOverrideDays" | "checkinsEnabled" | "createdAt">,
  lastContacted: string | null,
): string | null {
  const days = cadenceDaysFor(person);
  if (days == null) return null;
  const origin = lastContacted ?? person.createdAt.slice(0, 10);
  return format(addDays(parseISO(origin), days), "yyyy-MM-dd");
}

export function checkInStatus(
  person: Pick<Person, "circle" | "cadenceOverrideDays" | "checkinsEnabled" | "snoozeUntil" | "createdAt">,
  lastContacted: string | null,
  today: Date = new Date(),
): CheckInStatus | null {
  if (!person.checkinsEnabled) return null;
  if (isSnoozed(person.snoozeUntil, today)) return null;
  const due = dueDateFor(person, lastContacted);
  if (!due) return null;
  const daysUntil = differenceInCalendarDays(parseISO(due), startOfDay(today));
  if (daysUntil < 0) return "overdue";
  if (daysUntil <= 7) return "due_soon";
  return "in_touch";
}

export function daysUntilDue(
  person: Pick<Person, "circle" | "cadenceOverrideDays" | "checkinsEnabled" | "snoozeUntil" | "createdAt">,
  lastContacted: string | null,
  today: Date = new Date(),
): number | null {
  if (!person.checkinsEnabled) return null;
  if (isSnoozed(person.snoozeUntil, today)) return null;
  const due = dueDateFor(person, lastContacted);
  if (!due) return null;
  return differenceInCalendarDays(parseISO(due), startOfDay(today));
}

export function shouldAppearOnDueList(
  person: Pick<Person, "circle" | "cadenceOverrideDays" | "checkinsEnabled" | "snoozeUntil" | "createdAt">,
  lastContacted: string | null,
  today: Date = new Date(),
): boolean {
  const status = checkInStatus(person, lastContacted, today);
  return status === "overdue" || status === "due_soon";
}

export function compareMostOverdue(
  aDays: number | null,
  bDays: number | null,
): number {
  const a = aDays ?? 9999;
  const b = bDays ?? 9999;
  return a - b;
}

export function cadenceLabel(circle: Circle, overrideDays: number | null, enabled: boolean): string {
  if (!enabled) return "Off";
  if (overrideDays == null) return CIRCLE_CADENCE_DAYS[circle] === 30
    ? "Monthly"
    : CIRCLE_CADENCE_DAYS[circle] === 91
      ? "Quarterly"
      : CIRCLE_CADENCE_DAYS[circle] === 182
        ? "Every 6 months"
        : "Yearly";
  if (overrideDays === 30) return "Monthly";
  if (overrideDays === 91) return "Quarterly";
  if (overrideDays === 182) return "Every 6 months";
  if (overrideDays === 365) return "Yearly";
  if (overrideDays % 7 === 0) return `Every ${overrideDays / 7} weeks`;
  return `Every ${overrideDays} days`;
}
