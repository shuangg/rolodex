import { describe, expect, it } from "vitest";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { initMemoryDb } from "../server/db.ts";
import { seedIfEmpty } from "../server/seed.ts";
import { listImportantDates, listInteractions, listPeople } from "../server/repo.ts";
import { EMPTY_STATES } from "../shared/copy.ts";

describe("seed data", () => {
  it("fills the rolodex with realistic sample data", () => {
    initMemoryDb();
    seedIfEmpty();
    const people = listPeople();
    expect(people.length).toBeGreaterThanOrEqual(30);
    for (const circle of ["inner", "close", "wider", "distant"] as const) {
      expect(people.some((p) => p.circle === circle), `${circle} should not be empty`).toBe(true);
    }
    for (const person of people) {
      expect(person.name.length).toBeGreaterThan(1);
    }
    const birthdays = listImportantDates().filter((d) => d.type === "birthday");
    const now = new Date();
    for (let i = 1; i <= 3; i++) {
      const month = new Date(now.getFullYear(), now.getMonth() + i, 1).getMonth() + 1;
      expect(
        birthdays.some((d) => d.month === month),
        `expected a birthday in month ${month}`,
      ).toBe(true);
    }
    const oldest = listInteractions().reduce((min, item) => (item.date < min ? item.date : min), "9999-12-31");
    expect(differenceInCalendarDays(now, parseISO(oldest))).toBeGreaterThanOrEqual(365);
    expect(people.some((p) => p.latestNews)).toBe(true);
    expect(people.some((p) => !p.checkinsEnabled)).toBe(true);
    expect(people.some((p) => p.snoozeUntil)).toBe(true);
  });
});

describe("today empty states", () => {
  it("has written copy for every panel", () => {
    expect(EMPTY_STATES.contact.length).toBeGreaterThan(20);
    expect(EMPTY_STATES.dates.length).toBeGreaterThan(20);
    expect(EMPTY_STATES.reminders.length).toBeGreaterThan(10);
    expect(EMPTY_STATES.activity.length).toBeGreaterThan(20);
    expect(EMPTY_STATES.charts.length).toBeGreaterThan(10);
  });
});
