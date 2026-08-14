import { describe, it, expect } from 'vitest';
import { getNextOccurrence, isLeapYear, getValidDateForYear } from '../shared/dates';
import { ImportantDate } from '../shared/types';

describe('Phase 5: Important Dates and Recurring Calendar Arithmetic', () => {
  it('correctly detects leap years', () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2025)).toBe(false);
    expect(isLeapYear(2026)).toBe(false);
    expect(isLeapYear(2027)).toBe(false);
    expect(isLeapYear(2028)).toBe(true);
    expect(isLeapYear(2000)).toBe(true);
    expect(isLeapYear(1900)).toBe(false);
  });

  it('handles a 29 February birthday in non-leap years gracefully without crashing', () => {
    const leapDayBirthday: Pick<ImportantDate, 'month' | 'day' | 'year' | 'type'> = {
      month: 2,
      day: 29,
      year: 1996,
      type: 'birthday',
    };

    // Reference date: Jan 15, 2026 (non-leap year)
    const today2026 = new Date('2026-01-15T00:00:00Z');
    const occurrence2026 = getNextOccurrence(leapDayBirthday, today2026);

    // In 2026, falls on Feb 28
    expect(occurrence2026.dateString).toBe('2026-02-28');
    expect(occurrence2026.turningAge).toBe(30);
    // Turning 30 is a milestone decade!
    expect(occurrence2026.isMilestone).toBe(true);

    // In 2028 (leap year), falls on Feb 29
    const today2028 = new Date('2028-01-01T00:00:00Z');
    const occurrence2028 = getNextOccurrence(leapDayBirthday, today2028);
    expect(occurrence2028.dateString).toBe('2028-02-29');
    expect(occurrence2028.turningAge).toBe(32);
    expect(occurrence2028.isMilestone).toBe(false);
  });

  it('calculates next occurrence across a calendar year boundary', () => {
    const decBirthday: Pick<ImportantDate, 'month' | 'day' | 'year' | 'type'> = {
      month: 1,
      day: 10,
      year: 1990,
      type: 'birthday',
    };

    // Reference date: Nov 20, 2026 -> next occurrence is Jan 10, 2027
    const today = new Date('2026-11-20T00:00:00Z');
    const occ = getNextOccurrence(decBirthday, today);

    expect(occ.dateString).toBe('2027-01-10');
    expect(occ.daysUntil).toBe(51);
    expect(occ.turningAge).toBe(37);
  });

  it('flags milestone birthdays when turning age ends in zero', () => {
    const birthdayTurning40: Pick<ImportantDate, 'month' | 'day' | 'year' | 'type'> = {
      month: 8,
      day: 15,
      year: 1986, // In 2026, 2026 - 1986 = 40
      type: 'birthday',
    };

    const today = new Date('2026-05-01T00:00:00Z');
    const occ = getNextOccurrence(birthdayTurning40, today);
    expect(occ.turningAge).toBe(40);
    expect(occ.isMilestone).toBe(true);

    const nonMilestone: Pick<ImportantDate, 'month' | 'day' | 'year' | 'type'> = {
      month: 8,
      day: 15,
      year: 1985, // In 2026, 2026 - 1985 = 41
      type: 'birthday',
    };
    const occNon = getNextOccurrence(nonMilestone, today);
    expect(occNon.turningAge).toBe(41);
    expect(occNon.isMilestone).toBe(false);
  });

  it('handles important dates with unknown years', () => {
    const noYearDate: Pick<ImportantDate, 'month' | 'day' | 'year' | 'type'> = {
      month: 4,
      day: 25,
      year: null,
      type: 'anniversary',
    };

    const today = new Date('2026-04-01T00:00:00Z');
    const occ = getNextOccurrence(noYearDate, today);

    expect(occ.dateString).toBe('2026-04-25');
    expect(occ.daysUntil).toBe(24);
    expect(occ.turningAge).toBeNull();
    expect(occ.isMilestone).toBe(false);
  });
});
