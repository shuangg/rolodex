import { describe, expect, it } from "vitest";
import { addDays, format, startOfDay } from "date-fns";
import { checkInStatus, dueDateFor, shouldAppearOnDueList } from "../shared/checkin.ts";
import type { Person } from "../shared/types.ts";

const today = startOfDay(new Date("2026-08-14"));

function person(overrides: Partial<Person> = {}): Person {
  return {
    id: "1",
    name: "Test",
    hasPhoto: false,
    email: null,
    phone: null,
    jobTitle: null,
    company: null,
    city: null,
    timezone: null,
    circle: "inner",
    cadenceOverrideDays: null,
    checkinsEnabled: true,
    snoozeUntil: null,
    howMet: null,
    whereMet: null,
    whenMet: null,
    notes: null,
    tags: [],
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function daysAgo(days: number): string {
  return format(addDays(today, -days), "yyyy-MM-dd");
}

describe("cadence and check-in status", () => {
  it("marks inner-circle people in touch, due soon and overdue from last contact", () => {
    expect(checkInStatus(person(), daysAgo(10), today)).toBe("in_touch");
    expect(checkInStatus(person(), daysAgo(26), today)).toBe("due_soon");
    expect(checkInStatus(person(), daysAgo(40), today)).toBe("overdue");
  });

  it("uses an individual cadence override", () => {
    const weekly = person({ cadenceOverrideDays: 14 });
    expect(checkInStatus(weekly, daysAgo(8), today)).toBe("due_soon");
    expect(checkInStatus(weekly, daysAgo(20), today)).toBe("overdue");
  });

  it("turns check-ins off and removes them from the due list", () => {
    const off = person({ checkinsEnabled: false });
    expect(checkInStatus(off, daysAgo(400), today)).toBeNull();
    expect(shouldAppearOnDueList(off, daysAgo(400), today)).toBe(false);
    expect(dueDateFor(off, daysAgo(400))).toBeNull();
  });

  it("snoozes a person until the snooze date passes", () => {
    const snoozed = person({ snoozeUntil: "2026-08-20" });
    expect(checkInStatus(snoozed, daysAgo(80), today)).toBeNull();
    expect(shouldAppearOnDueList(snoozed, daysAgo(80), today)).toBe(false);
    expect(checkInStatus(snoozed, daysAgo(80), startOfDay(new Date("2026-08-21")))).toBe("overdue");
  });

  it("uses distant yearly cadence", () => {
    const distant = person({ circle: "distant" });
    expect(checkInStatus(distant, daysAgo(300), today)).toBe("in_touch");
    expect(checkInStatus(distant, daysAgo(370), today)).toBe("overdue");
  });
});
