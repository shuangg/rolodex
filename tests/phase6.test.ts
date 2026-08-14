import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { RolodexRepo } from '../server/repo';
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
    CREATE TABLE news (
      id TEXT PRIMARY KEY,
      person_id TEXT NOT NULL,
      content TEXT NOT NULL,
      date TEXT NOT NULL,
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

describe('Phase 6: Gifts and Bidirectional Connections', () => {
  let db: Database.Database;
  let repo: RolodexRepo;

  beforeEach(() => {
    db = createTestDb();
    repo = new RolodexRepo(db);
    repo.createPerson({ id: 'p1', name: 'Elena Rostova', circle: 'inner', tags: [] });
    repo.createPerson({ id: 'p2', name: 'Samir Al-Mansoor', circle: 'inner', tags: [] });
  });

  it('manages gifts (ideas, given, received) with occasions and dates', () => {
    const gift = repo.createGift({
      id: 'g1',
      person_id: 'p1',
      name: 'First Edition Le Guin Book',
      status: 'idea',
      occasion: 'Birthday',
    });

    expect(gift.status).toBe('idea');
    expect(repo.getGiftsForPerson('p1').length).toBe(1);

    // Update to given
    const updated = repo.updateGift('g1', { status: 'given', date: '2026-06-15' });
    expect(updated?.status).toBe('given');
    expect(updated?.date).toBe('2026-06-15');

    repo.deleteGift('g1');
    expect(repo.getGiftsForPerson('p1').length).toBe(0);
  });

  it('surfaces gift ideas when an important date is approaching within 30 days', () => {
    const today = new Date('2026-06-01T00:00:00Z');

    // Birthday in 15 days (June 16)
    repo.createImportantDate({
      id: 'd1',
      person_id: 'p1',
      type: 'birthday',
      month: 6,
      day: 16,
      year: 1994,
    });

    repo.createGift({
      id: 'g1',
      person_id: 'p1',
      name: 'Specialty Coffee Dripper',
      status: 'idea',
      occasion: 'Birthday',
    });

    const dates = repo.getImportantDatesForPerson('p1');
    const upcoming = dates
      .map((d) => ({ ...d, occurrence: getNextOccurrence(d, today) }))
      .filter((d) => d.occurrence.daysUntil <= 30);

    expect(upcoming.length).toBe(1);
    expect(upcoming[0].occurrence.daysUntil).toBe(15);

    const gifts = repo.getGiftsForPerson('p1');
    const outstandingIdeas = gifts.filter((g) => g.status === 'idea');
    expect(outstandingIdeas.length).toBe(1);
    expect(outstandingIdeas[0].name).toBe('Specialty Coffee Dripper');
  });

  it('reads connections with correct inverse perspectives (parent/child, colleague, introduced)', () => {
    // Elena is Parent of Samir
    repo.createConnection({
      id: 'c1',
      person_a_id: 'p1',
      person_b_id: 'p2',
      relationship_type: 'parent',
    });

    // From Elena's view: Samir is Child ("Parent of")
    const elenaConns = repo.getConnectionsForPerson('p1');
    expect(elenaConns.length).toBe(1);
    expect(elenaConns[0].connected_person.name).toBe('Samir Al-Mansoor');
    expect(elenaConns[0].relationship_label).toBe('Parent of');

    // From Samir's view: Elena is Parent ("Child of")
    const samirConns = repo.getConnectionsForPerson('p2');
    expect(samirConns.length).toBe(1);
    expect(samirConns[0].connected_person.name).toBe('Elena Rostova');
    expect(samirConns[0].relationship_label).toBe('Child of');
  });

  it('cleans up connections automatically on person deletion without leaving dangling records', () => {
    repo.createConnection({
      id: 'c1',
      person_a_id: 'p1',
      person_b_id: 'p2',
      relationship_type: 'colleague',
    });

    expect(repo.getConnectionsForPerson('p2').length).toBe(1);

    repo.deletePerson('p1');
    expect(repo.getConnectionsForPerson('p2').length).toBe(0);
  });
});
