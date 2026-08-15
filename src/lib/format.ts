import { format, formatDistanceToNow, parseISO } from "date-fns";
import type { CheckinInfo } from "../types";

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = parseISO(iso);
  if (isNaN(d.getTime())) return iso;
  return format(d, "d MMM yyyy");
}

export function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = parseISO(iso);
  if (isNaN(d.getTime())) return iso;
  return format(d, "d MMM");
}

export function formatMonthYear(year: number, month: number): string {
  return format(new Date(year, month - 1, 1), "MMMM yyyy");
}

export function relativeDate(iso: string | null | undefined): string {
  if (!iso) return "never";
  const d = parseISO(iso);
  if (isNaN(d.getTime())) return iso;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function checkinLabel(info: CheckinInfo): { text: string; tone: "ok" | "soon" | "overdue" | "off" } {
  if (info.optedOut) return { text: "Check-ins off", tone: "off" };
  if (info.snoozed) return { text: "Snoozed", tone: "off" };
  if (info.status === "overdue") {
    if (info.daysOverdue == null || !isFinite(info.daysOverdue)) return { text: "Overdue", tone: "overdue" };
    const days = info.daysOverdue;
    return { text: days === 1 ? "Overdue 1 day" : `Overdue ${days} days`, tone: "overdue" };
  }
  if (info.status === "due_soon") {
    const days = info.daysUntilDue;
    if (days == null) return { text: "Due soon", tone: "soon" };
    return { text: days === 0 ? "Due today" : days === 1 ? "Due tomorrow" : `Due in ${days} days`, tone: "soon" };
  }
  return { text: "In touch", tone: "ok" };
}

export function timeZoneLabel(tz: string | null): string {
  if (!tz) return "";
  return tz.replace(/_/g, " ");
}

export function monthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-");
  return formatMonthYear(Number(y), Number(m));
}
