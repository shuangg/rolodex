import type { Circle, CheckinInfo, CheckinStatus } from "../types";
import { addDays, differenceInCalendarDays, parseISO } from "date-fns";

export const CIRCLE_CADENCE_DAYS: Record<Circle, number> = {
  inner: 30,
  close: 90,
  wider: 180,
  distant: 365,
};

export function cadenceDaysFor(person: {
  circle: Circle;
  cadenceOverrideDays: number | null;
  checkinsOptedOut: boolean;
}): number | null {
  if (person.checkinsOptedOut) return null;
  if (person.cadenceOverrideDays != null && person.cadenceOverrideDays > 0) {
    return person.cadenceOverrideDays;
  }
  return CIRCLE_CADENCE_DAYS[person.circle];
}

export function snoozeActive(snoozeUntil: string | null, today: Date): boolean {
  if (!snoozeUntil) return false;
  const until = parseISO(snoozeUntil);
  if (isNaN(until.getTime())) return false;
  return differenceInCalendarDays(until, today) >= 0;
}

export interface CheckinInput {
  circle: Circle;
  cadenceOverrideDays: number | null;
  checkinsOptedOut: boolean;
  snoozeUntil: string | null;
  lastContacted: string | null;
}

export function computeCheckin(input: CheckinInput, today: Date = new Date()): CheckinInfo {
  const snoozed = snoozeActive(input.snoozeUntil, today);
  const optedOut = input.checkinsOptedOut;
  const cadenceDays = cadenceDaysFor(input);
  const base: CheckinInfo = {
    status: "in_touch",
    cadenceDays,
    daysUntilDue: Infinity,
    dueDate: null,
    snoozed,
    optedOut,
    daysOverdue: 0,
  };

  if (optedOut || snoozed || cadenceDays == null) return base;

  const last = input.lastContacted ? parseISO(input.lastContacted) : null;
  if (!last || isNaN(last.getTime())) {
    return { ...base, status: "overdue", daysUntilDue: -Infinity, daysOverdue: Infinity };
  }

  const dueDate = addDays(last, cadenceDays);
  const daysUntilDue = differenceInCalendarDays(dueDate, today);
  let status: CheckinStatus;
  if (daysUntilDue < 0) status = "overdue";
  else if (daysUntilDue <= 7) status = "due_soon";
  else status = "in_touch";

  return {
    ...base,
    status,
    daysUntilDue,
    daysOverdue: Math.max(0, -daysUntilDue),
    dueDate: dueDate.toISOString().slice(0, 10),
  };
}

export function dueOrdering(a: { lastContacted: string | null; checkin: CheckinInfo }, b: {
  lastContacted: string | null;
  checkin: CheckinInfo;
}): number {
  const av = a.checkin.status === "overdue" ? a.checkin.daysOverdue : a.checkin.daysUntilDue;
  const bv = b.checkin.status === "overdue" ? b.checkin.daysOverdue : b.checkin.daysUntilDue;
  if (a.checkin.status === "overdue" && b.checkin.status === "overdue") return (bv ?? 0) - (av ?? 0);
  if (a.checkin.status === "overdue") return -1;
  if (b.checkin.status === "overdue") return 1;
  return (av ?? 0) - (bv ?? 0);
}

export function isDue(person: { checkin: CheckinInfo }): boolean {
  return person.checkin.status === "due_soon" || person.checkin.status === "overdue";
}
