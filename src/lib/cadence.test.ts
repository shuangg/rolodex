import { describe, expect, it } from "vitest";
import {
  CIRCLE_CADENCE_DAYS,
  cadenceDaysFor,
  computeCheckin,
  dueOrdering,
  isDue,
  snoozeActive,
} from "./cadence";
import { checkinLabel } from "./format";

const TODAY = new Date(2026, 5, 15);

function iso(daysAgo: number): string {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

const base = {
  circle: "inner" as const,
  cadenceOverrideDays: null,
  checkinsOptedOut: false,
  snoozeUntil: null,
  lastContacted: iso(10),
};

describe("cadenceDaysFor", () => {
  it("returns the circle cadence", () => {
    expect(CIRCLE_CADENCE_DAYS).toEqual({ inner: 30, close: 90, wider: 180, distant: 365 });
    expect(cadenceDaysFor({ ...base, circle: "inner" })).toBe(30);
    expect(cadenceDaysFor({ ...base, circle: "close" })).toBe(90);
    expect(cadenceDaysFor({ ...base, circle: "wider" })).toBe(180);
    expect(cadenceDaysFor({ ...base, circle: "distant" })).toBe(365);
  });

  it("lets a per-person override win", () => {
    expect(cadenceDaysFor({ ...base, cadenceOverrideDays: 60 })).toBe(60);
  });

  it("returns null when check-ins are opted out", () => {
    expect(cadenceDaysFor({ ...base, checkinsOptedOut: true })).toBeNull();
    expect(cadenceDaysFor({ ...base, checkinsOptedOut: true, cadenceOverrideDays: 60 })).toBeNull();
  });
});

describe("snoozeActive", () => {
  it("is active through the snooze date inclusive", () => {
    expect(snoozeActive(iso(-2), TODAY)).toBe(true);
    expect(snoozeActive(iso(0), TODAY)).toBe(true);
    expect(snoozeActive(iso(1), TODAY)).toBe(false);
    expect(snoozeActive(null, TODAY)).toBe(false);
    expect(snoozeActive("not-a-date", TODAY)).toBe(false);
  });
});

describe("computeCheckin", () => {
  it("is in touch when well inside cadence", () => {
    const r = computeCheckin({ ...base, lastContacted: iso(10) }, TODAY);
    expect(r.status).toBe("in_touch");
    expect(r.cadenceDays).toBe(30);
    expect(r.daysUntilDue).toBe(20);
    expect(r.dueDate).toBe(iso(-20));
  });

  it("is due soon within 7 days of due date", () => {
    const r = computeCheckin({ ...base, lastContacted: iso(26) }, TODAY);
    expect(r.status).toBe("due_soon");
    expect(r.daysUntilDue).toBe(4);
    expect(r.daysOverdue).toBe(0);
  });

  it("is overdue past the due date", () => {
    const r = computeCheckin({ ...base, lastContacted: iso(40) }, TODAY);
    expect(r.status).toBe("overdue");
    expect(r.daysUntilDue).toBe(-10);
    expect(r.daysOverdue).toBe(10);
  });

  it("is overdue forever when never contacted", () => {
    const r = computeCheckin({ ...base, lastContacted: null }, TODAY);
    expect(r.status).toBe("overdue");
    expect(r.daysOverdue).toBe(Infinity);
  });

  it("does not nag opted-out people", () => {
    const r = computeCheckin({ ...base, checkinsOptedOut: true, lastContacted: iso(999) }, TODAY);
    expect(r.status).toBe("in_touch");
    expect(r.optedOut).toBe(true);
    expect(r.cadenceDays).toBeNull();
  });

  it("pauses snoozed people", () => {
    const r = computeCheckin({ ...base, snoozeUntil: iso(-3) }, TODAY);
    expect(r.status).toBe("in_touch");
    expect(r.snoozed).toBe(true);
  });

  it("uses the per-person override when present", () => {
    const r = computeCheckin({ ...base, cadenceOverrideDays: 60, lastContacted: iso(55) }, TODAY);
    expect(r.status).toBe("due_soon");
    expect(r.cadenceDays).toBe(60);
    expect(r.daysUntilDue).toBe(5);
  });
});

describe("isDue / dueOrdering", () => {
  it("treats overdue and due soon as due", () => {
    expect(isDue({ checkin: computeCheckin({ ...base, lastContacted: iso(31) }, TODAY) })).toBe(true);
    expect(isDue({ checkin: computeCheckin({ ...base, lastContacted: iso(25) }, TODAY) })).toBe(true);
    expect(isDue({ checkin: computeCheckin({ ...base, lastContacted: iso(10) }, TODAY) })).toBe(false);
  });

  it("sorts overdue before due soon, most overdue first", () => {
    const overdueFar = { lastContacted: iso(60), checkin: computeCheckin({ ...base, lastContacted: iso(60) }, TODAY) };
    const overdueNear = { lastContacted: iso(31), checkin: computeCheckin({ ...base, lastContacted: iso(31) }, TODAY) };
    const dueSoon = { lastContacted: iso(26), checkin: computeCheckin({ ...base, lastContacted: iso(26) }, TODAY) };
    const sorted = [dueSoon, overdueNear, overdueFar].sort(dueOrdering);
    expect(sorted[0]).toBe(overdueFar);
    expect(sorted[1]).toBe(overdueNear);
    expect(sorted[2]).toBe(dueSoon);
  });
});

describe("checkinLabel", () => {
  it("never labels an overdue person as overdue with a null day count", () => {
    expect(checkinLabel({ status: "overdue", cadenceDays: 30, daysUntilDue: null, dueDate: null, snoozed: false, optedOut: false, daysOverdue: null })).toEqual({ text: "Overdue", tone: "overdue" });
  });
});
