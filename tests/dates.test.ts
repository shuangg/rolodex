import { describe, expect, it } from "vitest";
import { addDays, format, startOfDay } from "date-fns";
import {
  ageThisYear,
  daysUntilNext,
  isLeapYearNum,
  isMilestoneAge,
  nextOccurrence,
  occurrenceInYear,
} from "../shared/dates.ts";

describe("recurring date arithmetic", () => {
  it("places a 29 February birthday on 28 February in a non-leap year", () => {
    expect(isLeapYearNum(2026)).toBe(false);
    const occ = occurrenceInYear(2026, 2, 29);
    expect(format(occ, "yyyy-MM-dd")).toBe("2026-02-28");
    const next = nextOccurrence(2, 29, startOfDay(new Date("2026-01-15")));
    expect(format(next, "yyyy-MM-dd")).toBe("2026-02-28");
  });

  it("keeps 29 February in a leap year", () => {
    expect(isLeapYearNum(2028)).toBe(true);
    expect(format(occurrenceInYear(2028, 2, 29), "yyyy-MM-dd")).toBe("2028-02-29");
  });

  it("rolls into the next calendar year", () => {
    const from = startOfDay(new Date("2026-12-20"));
    const next = nextOccurrence(1, 7, from);
    expect(format(next, "yyyy-MM-dd")).toBe("2027-01-07");
    expect(daysUntilNext(1, 7, from)).toBe(18);
  });

  it("computes age and flags milestone birthdays", () => {
    expect(ageThisYear(1986, new Date("2026-08-14"))).toBe(40);
    expect(isMilestoneAge(40)).toBe(true);
    expect(isMilestoneAge(41)).toBe(false);
    expect(isMilestoneAge(0)).toBe(false);
  });

  it("does not disappear after the date has passed this year", () => {
    const next = nextOccurrence(3, 4, startOfDay(new Date("2026-08-14")));
    expect(format(next, "yyyy-MM-dd")).toBe("2027-03-04");
    expect(format(addDays(next, 0), "yyyy-MM-dd")).toBe("2027-03-04");
  });
});
