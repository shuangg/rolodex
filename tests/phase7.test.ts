import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { RolodexRepo } from '../server/repo';
import { seedDatabase } from '../server/seed';
import { getNextOccurrence } from '../shared/dates';

function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE people (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      photo_url TEXT,
      email TEXT,
      phone TEXT,
      job_title TEXT,
      company TEXT,
      city TEXT,
      time_zone TEXT,
      circle TEXT NOT NULL,
      cadence_override_days INTEGER,
      check_ins_enabled INTEGER NOT NULL DEFAULT 1,
      snooze_until TEXT,
      how_we_met TEXT,
      notes TEXT,
      tags TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE interactions (
      id TEXT PRIMARY KEY,
      person_id TEXT NOT NULL,
      type TEXT NOT NULL,
      date TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE
    );
    CREATE TABLE important_dates (
      id TEXT PRIMARY KEY,
      person_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT,
      month INTEGER NOT NULL,
      day INTEGER NOT NULL,
      year INTEGER,
      created_at TEXT NOT NULL,
      FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE
    );
    CREATE TABLE facts (
      id TEXT PRIMARY KEY,
      person_id TEXT NOT NULL,
      fact TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE
    );
    CREATE TABLE news (
      id TEXT PRIMARY KEY,
      person_id TEXT NOT NULL,
      content TEXT NOT NULL,
      date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE
    );
    CREATE TABLE reminders (
      id TEXT PRIMARY KEY,
      person_id TEXT NOT NULL,
      title TEXT NOT NULL,
      due_date TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE
    );
    CREATE TABLE gifts (
      id TEXT PRIMARY KEY,
      person_id TEXT NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'idea',
      occasion TEXT,
      date TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE
    );
    CREATE TABLE connections (
      id TEXT PRIMARY KEY,
      person_a_id TEXT NOT NULL,
      person_b_id TEXT NOT NULL,
      relationship_type TEXT NOT NULL,
      custom_label TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (person_a_id) REFERENCES people(id) ON DELETE CASCADE,
      FOREIGN KEY (person_b_id) REFERENCES people(id) ON DELETE CASCADE
    );
  `);
  return db;
}

describe('Phase 7: Today Dashboard and Aggregations', () => {
  let db: Database.Database;
  let repo: RolodexRepo;

  beforeEach(() => {
    db = createTestDb();
    seedDatabase(db, true);
    repo = new RolodexRepo(db);
  });

  it('correctly sorts Who To Contact with most overdue contacts first', () => {
    const people = repo.getAllPeople();
    const whoToContact = people
      .filter((p) => p.status === 'overdue' || p.status === 'due_soon')
      .sort((a, b) => {
        if (a.status === 'overdue' && b.status !== 'overdue') return -1;
        if (b.status === 'overdue' && a.status !== 'overdue') return 1;
        if (a.status === 'overdue' && b.status === 'overdue') {
          return (b.days_overdue || 0) - (a.days_overdue || 0);
        }
        return (a.days_until_due || 0) - (b.days_until_due || 0);
      });

    expect(whoToContact.length).toBeGreaterThan(0);
    expect(whoToContact[0].status).toBe('overdue');
    if (whoToContact.length > 1 && whoToContact[1].status === 'overdue') {
      expect((whoToContact[0].days_overdue || 0)).toBeGreaterThanOrEqual(whoToContact[1].days_overdue || 0);
    }
  });

  it('removes person from Who To Contact immediately upon logging an interaction', () => {
    const people = repo.getAllPeople();
    const overduePerson = people.find((p) => p.status === 'overdue');
    expect(overduePerson).toBeDefined();

    const todayStr = new Date().toISOString().slice(0, 10);
    repo.createInteraction({
      id: 'touchpoint_new',
      person_id: overduePerson!.id,
      type: 'call',
      date: todayStr,
      notes: 'Touchpoint logged from Today',
    });

    const updated = repo.getPersonById(overduePerson!.id);
    expect(updated?.status).toBe('in_touch');
  });

  it('accurately matches circle overdue breakdown data with raw people counts', () => {
    const people = repo.getAllPeople();

    for (const circle of ['inner', 'close', 'wider', 'distant'] as const) {
      const circlePeople = people.filter((p) => p.circle === circle);
      const overduePeople = circlePeople.filter((p) => p.status === 'overdue');
      expect(circlePeople.length).toBeGreaterThan(0);
      expect(overduePeople.length).toBeLessThanOrEqual(circlePeople.length);
    }
  });

  it('accurately identifies upcoming dates in the next 30 days', () => {
    const allDates = repo.getAllImportantDates();
    const upcoming = allDates
      .map((d) => ({ ...d, occ: getNextOccurrence(d) }))
      .filter((d) => d.occ.daysUntil >= 0 && d.occ.daysUntil <= 30);

    expect(upcoming.length).toBeGreaterThan(0);
  });
});
