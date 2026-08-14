import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { RolodexRepo } from '../server/repo';

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
    CREATE TABLE facts (
      id TEXT PRIMARY KEY,
      person_id TEXT NOT NULL,
      fact TEXT NOT NULL,
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
  `);
  return db;
}

describe('Phase 4: Interactions, News, Facts, Reminders and Timeline', () => {
  let db: Database.Database;
  let repo: RolodexRepo;

  beforeEach(() => {
    db = createTestDb();
    repo = new RolodexRepo(db);
    repo.createPerson({
      id: 'p1',
      name: 'Elena Rostova',
      circle: 'inner',
      tags: [],
    });
  });

  it('logs an interaction and recalculates last contacted date and check-in status', () => {
    let p = repo.getPersonById('p1');
    expect(p?.last_contacted).toBeNull();
    expect(p?.status).toBe('overdue');

    const todayStr = new Date().toISOString().slice(0, 10);
    repo.createInteraction({
      id: 'i1',
      person_id: 'p1',
      type: 'call',
      date: todayStr,
      notes: 'Quick check-in call',
    });

    p = repo.getPersonById('p1');
    expect(p?.last_contacted).toBe(todayStr);
    expect(p?.status).toBe('in_touch');
    expect(p?.days_until_due).toBe(30);
  });

  it('tracks news and surfaces the newest news as latest_news', () => {
    repo.createNews({
      id: 'n1',
      person_id: 'p1',
      content: 'Started at Figma',
      date: '2026-01-15',
    });

    let p = repo.getPersonById('p1');
    expect(p?.latest_news?.content).toBe('Started at Figma');

    repo.createNews({
      id: 'n2',
      person_id: 'p1',
      content: 'Promoted to Staff Designer',
      date: '2026-03-01',
    });

    p = repo.getPersonById('p1');
    expect(p?.latest_news?.content).toBe('Promoted to Staff Designer');
  });

  it('manages facts list cleanly', () => {
    repo.createFact({ id: 'f1', person_id: 'p1', fact: 'Allergic to shellfish' });
    repo.createFact({ id: 'f2', person_id: 'p1', fact: 'Supports Arsenal' });

    const facts = repo.getFactsForPerson('p1');
    expect(facts.length).toBe(2);
    expect(facts[0].fact).toBe('Allergic to shellfish');
    expect(facts[1].fact).toBe('Supports Arsenal');

    repo.deleteFact('f1');
    expect(repo.getFactsForPerson('p1').length).toBe(1);
  });

  it('toggles reminders and records completion timestamp', () => {
    const rem = repo.createReminder({
      id: 'r1',
      person_id: 'p1',
      title: 'Send feedback on design system draft',
      due_date: '2026-05-10',
      completed: false,
    });

    expect(rem.completed).toBe(false);

    const completed = repo.updateReminder('r1', { completed: true });
    expect(completed?.completed).toBe(true);
    expect(completed?.completed_at).toBeDefined();

    const timeline = repo.getGlobalTimeline({ type: 'reminder_completed' });
    expect(timeline.length).toBe(1);
    expect(timeline[0].title).toContain('Completed reminder');
  });

  it('aggregates and filters the global timeline by person and activity type', () => {
    repo.createPerson({ id: 'p2', name: 'Marcus Vance', circle: 'close', tags: [] });

    repo.createInteraction({ id: 'i1', person_id: 'p1', type: 'call', date: '2026-02-01' });
    repo.createNews({ id: 'n1', person_id: 'p2', content: 'Moved to San Francisco', date: '2026-02-10' });
    repo.createReminder({ id: 'r1', person_id: 'p1', title: 'Call Sarah', due_date: '2026-02-05', completed: true });

    // Global timeline (all items, newest first)
    const all = repo.getGlobalTimeline();
    expect(all.length).toBe(3);
    expect(all[0].date).toBe('2026-02-10'); // newest first

    // Filter by person
    const p2Only = repo.getGlobalTimeline({ person_id: 'p2' });
    expect(p2Only.length).toBe(1);
    expect(p2Only[0].person_name).toBe('Marcus Vance');

    // Filter by type
    const newsOnly = repo.getGlobalTimeline({ type: 'news' });
    expect(newsOnly.length).toBe(1);
    expect(newsOnly[0].title).toBe('Moved to San Francisco');
  });
});
