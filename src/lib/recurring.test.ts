import { describe, expect, it } from "vitest";
import {
  ageOn,
  daysInMonth,
  isLeapYear,
  isMilestone,
  leapSafeDate,
  nextOccurrence,
  occurrenceInMonth,
  toISODate,
  upcomingDatesFor,
} from "./recurring";
import type { ImportantDate } from "../types";

describe("leap year helpers", () => {
  it("knows leap years", () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2026)).toBe(false);
    expect(isLeapYear(2028)).toBe(true);
    expect(isLeapYear(1900)).toBe(false);
    expect(isLeapYear(2000)).toBe(true);
  });

  it("computes days in month", () => {
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(daysInMonth(2026, 12)).toBe(31);
  });

  it("clamps Feb 29 to Feb 28 in non-leap years", () => {
    expect(leapSafeDate(2026, 2, 29).getDate()).toBe(28);
    expect(leapSafeDate(2028, 2, 29).getDate()).toBe(29);
    expect(toISODate(leapSafeDate(2026, 2, 29))).toBe("2026-02-28");
  });
});

describe("nextOccurrence", () => {
  it("finds the next birthday from a given date", () => {
    const occ = nextOccurrence(12, 25, new Date(2026, 5, 15));
    expect(occ.year).toBe(2026);
    expect(occ.date).toBe("2026-12-25");
    expect(occ.leapAdjusted).toBe(false);
  });

  it("rolls to next year when today is past the date", () => {
    const occ = nextOccurrence(1, 10, new Date(2026, 5, 15));
    expect(occ.year).toBe(2027);
    expect(occ.date).toBe("2027-01-10");
  });

  it("is today when today is the date", () => {
    const occ = nextOccurrence(5, 15, new Date(2026, 4, 15));
    expect(occ.date).toBe("2026-05-15");
  });

  it("maps Feb 29 to Feb 28 in non-leap years and flags it", () => {
    const occ = nextOccurrence(2, 29, new Date(2026, 5, 15));
    expect(occ.date).toBe("2027-02-28");
    expect(occ.leapAdjusted).toBe(true);
    const leap = nextOccurrence(2, 29, new Date(2027, 5, 15));
    expect(leap.date).toBe("2028-02-29");
    expect(leap.leapAdjusted).toBe(false);
  });
});

describe("occurrenceInMonth", () => {
  it("returns null for impossible days", () => {
    expect(occurrenceInMonth(2026, 2, 30)).toBeNull();
    expect(occurrenceInMonth(2026, 4, 31)).toBeNull();
  });

  it("flags the leap adjustment", () => {
    const r = occurrenceInMonth(2026, 2, 29);
    expect(r).toEqual({ date: "2026-02-28", leapAdjusted: true });
    const exact = occurrenceInMonth(2028, 2, 29);
    expect(exact).toEqual({ date: "2028-02-29", leapAdjusted: false });
  });
});

describe("ageOn / milestones", () => {
  it("computes age before and after the birthday", () => {
    const birth = { m: 6, d: 6, y: 1985 };
    expect(ageOn(new Date(2026, 4, 15), birth.m, birth.d, birth.y)).toBe(40);
    expect(ageOn(new Date(2026, 5, 15), birth.m, birth.d, birth.y)).toBe(41);
    expect(ageOn(new Date(2026, 5, 6), birth.m, birth.d, birth.y)).toBe(41);
    expect(ageOn(new Date(2026, 5, 7), birth.m, birth.d, birth.y)).toBe(41);
  });

  it("flags milestones only on ages ending in zero", () => {
    expect(isMilestone(40)).toBe(true);
    expect(isMilestone(30)).toBe(true);
    expect(isMilestone(0)).toBe(false);
    expect(isMilestone(41)).toBe(false);
    expect(isMilestone(-10)).toBe(false);
  });
});

describe("upcomingDatesFor", () => {
  const from = new Date(2026, 5, 15);

  it("returns only occurrences within the window, sorted", () => {
    const dates: ImportantDate[] = [
      { id: 1, personId: 1, kind: "birthday", label: null, month: 6, day: 20, year: 1990, createdAt: "" },
      { id: 2, personId: 2, kind: "birthday", label: null, month: 7, day: 1, year: null, createdAt: "" },
      { id: 3, personId: 3, kind: "birthday", label: null, month: 1, day: 1, year: 1980, createdAt: "" },
    ];
    const out = upcomingDatesFor(dates, from, 30);
    expect(out.map((u) => u.occurrence)).toEqual(["2026-06-20", "2026-07-01"]);
    expect(out[1].personId).toBe(2);
  });

  it("computes age and milestone from the birth year", () => {
    const dates: ImportantDate[] = [
      { id: 1, personId: 1, kind: "birthday", label: null, month: 6, day: 20, year: 1986, createdAt: "" },
    ];
    const out = upcomingDatesFor(dates, from, 30);
    expect(out[0].age).toBe(40);
    expect(out[0].milestone).toBe(true);
  });

  it("handles Feb 29 births inside the window", () => {
    const dates: ImportantDate[] = [
      { id: 9, personId: 9, kind: "birthday", label: null, month: 2, day: 29, year: 1996, createdAt: "" },
    ];
    const leapYearFrom = new Date(2028, 1, 1);
    const out = upcomingDatesFor(dates, leapYearFrom, 60);
    expect(out[0].occurrence).toBe("2028-02-29");
    const normalFrom = new Date(2026, 1, 1);
    const normal = upcomingDatesFor(dates, normalFrom, 60);
    expect(normal[0].occurrence).toBe("2026-02-28");
  });
});
