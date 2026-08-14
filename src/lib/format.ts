import { format, formatDistanceToNow, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

export function prettyDate(iso: string): string {
  return format(parseISO(iso), "d MMM yyyy");
}

export function prettyDay(iso: string): string {
  return format(parseISO(iso), "d MMMM");
}

export function ago(iso: string): string {
  return formatDistanceToNow(parseISO(iso), { addSuffix: true });
}

export function localTime(timezone: string): string {
  try {
    return formatInTimeZone(new Date(), timezone, "h:mm a");
  } catch {
    return "";
  }
}

export function todayIso(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function statusCopy(daysUntilDue: number | null, status: string | null): string {
  if (!status || daysUntilDue == null) return "";
  if (status === "overdue") {
    const n = Math.abs(daysUntilDue);
    return n === 0 ? "Due today" : `${n} day${n === 1 ? "" : "s"} overdue`;
  }
  if (status === "due_soon") {
    if (daysUntilDue === 0) return "Due today";
    if (daysUntilDue === 1) return "Due tomorrow";
    return `Due in ${daysUntilDue} days`;
  }
  return "In touch";
}
