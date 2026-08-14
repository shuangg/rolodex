import { describe, it, expect } from 'vitest';
import { computeCheckInStatus, formatDateISO, addDays } from '../shared/cadence';
import { Person } from '../shared/types';

describe('Phase 3: Cadence and Staying in Touch calculation logic', () => {
  const basePerson: Pick<Person, 'circle' | 'cadence_override_days' | 'check_ins_enabled' | 'snooze_until' | 'created_at'> = {
    circle: 'inner',
    cadence_override_days: null,
    check_ins_enabled: true,
    snooze_until: null,
    created_at: '2026-01-01T00:00:00.000Z',
  };

  const today = new Date('2026-06-01T12:00:00Z');

  it('calculates status for Inner Circle (30 days default)', () => {
    // Contacted 10 days ago -> 20 days remaining -> in_touch
    const res1 = computeCheckInStatus(basePerson, '2026-05-22', today);
    expect(res1.status).toBe('in_touch');
    expect(res1.effective_cadence_days).toBe(30);
    expect(res1.days_until_due).toBe(20);

    // Contacted 25 days ago -> 5 days remaining -> due_soon
    const res2 = computeCheckInStatus(basePerson, '2026-05-07', today);
    expect(res2.status).toBe('due_soon');
    expect(res2.days_until_due).toBe(5);

    // Contacted 35 days ago -> 5 days overdue -> overdue
    const res3 = computeCheckInStatus(basePerson, '2026-04-27', today);
    expect(res3.status).toBe('overdue');
    expect(res3.days_overdue).toBe(5);
  });

  it('calculates status for Close (90d), Wider (180d) and Distant (365d)', () => {
    // Close circle: 90 days
    const closeRes = computeCheckInStatus({ ...basePerson, circle: 'close' }, '2026-04-01', today);
    // Spoke April 1 (61 days ago) -> 29 days left -> in_touch
    expect(closeRes.status).toBe('in_touch');
    expect(closeRes.effective_cadence_days).toBe(90);

    // Wider circle: 180 days
    const widerRes = computeCheckInStatus({ ...basePerson, circle: 'wider' }, '2025-11-01', today);
    // Spoke Nov 1 (212 days ago) -> 32 days overdue
    expect(widerRes.status).toBe('overdue');
    expect(widerRes.effective_cadence_days).toBe(180);

    // Distant circle: 365 days
    const distantRes = computeCheckInStatus({ ...basePerson, circle: 'distant' }, '2025-07-01', today);
    // Spoke July 1 2025 (335 days ago) -> 30 days left -> in_touch
    expect(distantRes.status).toBe('in_touch');
    expect(distantRes.effective_cadence_days).toBe(365);
  });

  it('respects cadence_override_days', () => {
    // Inner person with 14 days override
    const overridePerson = {
      ...basePerson,
      circle: 'inner' as const,
      cadence_override_days: 14,
    };

    // Spoke 10 days ago -> 4 days left -> due_soon
    const res = computeCheckInStatus(overridePerson, '2026-05-22', today);
    expect(res.status).toBe('due_soon');
    expect(res.effective_cadence_days).toBe(14);
    expect(res.days_until_due).toBe(4);
  });

  it('disables check-ins when check_ins_enabled is false', () => {
    const disabledPerson = {
      ...basePerson,
      check_ins_enabled: false,
    };

    // Even if never spoke or spoke 100 days ago, status is 'off'
    const res = computeCheckInStatus(disabledPerson, '2025-01-01', today);
    expect(res.status).toBe('off');
  });

  it('snoozes nudges until the snooze date has passed', () => {
    // Snoozed until June 15 (future)
    const snoozedPerson = {
      ...basePerson,
      snooze_until: '2026-06-15',
    };

    const res1 = computeCheckInStatus(snoozedPerson, '2026-01-01', today);
    expect(res1.status).toBe('snoozed');

    // Snooze date passed on May 20 -> calculates regular overdue status
    const expiredSnoozePerson = {
      ...basePerson,
      snooze_until: '2026-05-20',
    };
    const res2 = computeCheckInStatus(expiredSnoozePerson, '2026-01-01', today);
    expect(res2.status).toBe('overdue');
  });
});
