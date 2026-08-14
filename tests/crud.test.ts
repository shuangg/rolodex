import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { RolodexRepo } from '../server/repo';
import { seedDatabase } from '../server/seed';
import { computeCheckInStatus, addDays, formatDateISO } from '../shared/cadence';
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

describe('Phase 1: Seed data and CRUD operations', () => {
  let db: Database.Database;
  let repo: RolodexRepo;

  beforeEach(() => {
    db = createTestDb();
    repo = new RolodexRepo(db);
  });

  it('verifies seed data meets all Phase 1 criteria', () => {
    seedDatabase(db, true);
    const people = repo.getAllPeople();

    // 1. At least 30 people
    expect(people.length).toBeGreaterThanOrEqual(30);

    // 2. No circle empty
    const circles = new Set(people.map((p) => p.circle));
    expect(circles.has('inner')).toBe(true);
    expect(circles.has('close')).toBe(true);
    expect(circles.has('wider')).toBe(true);
    expect(circles.has('distant')).toBe(true);

    // 3. Every person has photo or initials fallback capability
    for (const p of people) {
      expect(p.name).toBeDefined();
      expect(p.name.length).toBeGreaterThan(0);
    }
    const hasPhotos = people.some((p) => p.photo_url !== null);
    const hasInitials = people.some((p) => p.photo_url === null);
    expect(hasPhotos).toBe(true);
    expect(hasInitials).toBe(true);

    // 4. At least one birthday falling in each of the next three months
    const allDates = repo.getAllImportantDates();
    const birthdays = allDates.filter((d) => d.type === 'birthday');
    expect(birthdays.length).toBeGreaterThanOrEqual(3);

    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const m1 = (currentMonth % 12) + 1;
    const m2 = ((currentMonth + 1) % 12) + 1;
    const m3 = ((currentMonth + 2) % 12) + 1;

    const hasM1 = birthdays.some((b) => b.month === m1);
    const hasM2 = birthdays.some((b) => b.month === m2);
    const hasM3 = birthdays.some((b) => b.month === m3);
    expect(hasM1).toBe(true);
    expect(hasM2).toBe(true);
    expect(hasM3).toBe(true);

    // 5. Interactions going back at least a year
    const timeline = repo.getGlobalTimeline({ type: 'interaction' });
    expect(timeline.length).toBeGreaterThan(5);
    const oneYearAgo = formatDateISO(addDays(today, -365));
    const hasOldInteractions = timeline.some((t) => t.date <= oneYearAgo);
    expect(hasOldInteractions).toBe(true);

    // 6. At least one of every other thing
    expect(repo.getFactsForPerson('p1').length).toBeGreaterThan(0);
    expect(repo.getNewsForPerson('p1').length).toBeGreaterThan(0);
    expect(repo.getAllReminders().length).toBeGreaterThan(0);
    expect(repo.getGiftsForPerson('p1').length).toBeGreaterThan(0);
    expect(repo.getConnectionsForPerson('p5').length).toBeGreaterThan(0);
  });

  it('creates, reads, updates and deletes people', () => {
    const created = repo.createPerson({
      id: 'test_p1',
      name: 'Alice Johnson',
      email: 'alice@example.com',
      phone: '+1 555-1234',
      job_title: 'Software Engineer',
      company: 'Acme Corp',
      city: 'Seattle',
      time_zone: 'America/Los_Angeles',
      circle: 'inner',
      tags: ['friend', 'tech'],
      check_ins_enabled: true,
    });

    expect(created.id).toBe('test_p1');
    expect(created.name).toBe('Alice Johnson');
    expect(created.tags).toEqual(['friend', 'tech']);

    // Read
    const fetched = repo.getPersonById('test_p1');
    expect(fetched).not.toBeNull();
    expect(fetched?.email).toBe('alice@example.com');

    // Update
    const updated = repo.updatePerson('test_p1', {
      name: 'Alice Smith',
      circle: 'close',
      cadence_override_days: 45,
    });
    expect(updated?.name).toBe('Alice Smith');
    expect(updated?.circle).toBe('close');
    expect(updated?.cadence_override_days).toBe(45);

    // Delete
    const deleted = repo.deletePerson('test_p1');
    expect(deleted).toBe(true);
    expect(repo.getPersonById('test_p1')).toBeNull();
  });

  it('creates, reads, and deletes interactions and checks last_contacted update', () => {
    repo.createPerson({
      id: 'test_p2',
      name: 'Bob Miller',
      circle: 'inner',
      check_ins_enabled: true,
      tags: [],
    });

    const inter1 = repo.createInteraction({
      id: 'inter_1',
      person_id: 'test_p2',
      type: 'call',
      date: '2026-01-10',
      notes: 'Initial intro call',
    });
    expect(inter1.id).toBe('inter_1');

    let person = repo.getPersonById('test_p2');
    expect(person?.last_contacted).toBe('2026-01-10');

    // Add newer interaction
    repo.createInteraction({
      id: 'inter_2',
      person_id: 'test_p2',
      type: 'meetup',
      date: '2026-02-15',
      notes: 'Coffee chat in person',
    });

    person = repo.getPersonById('test_p2');
    expect(person?.last_contacted).toBe('2026-02-15');

    const list = repo.getInteractionsForPerson('test_p2');
    expect(list.length).toBe(2);
    expect(list[0].id).toBe('inter_2'); // Newest first

    repo.deleteInteraction('inter_2');
    person = repo.getPersonById('test_p2');
    expect(person?.last_contacted).toBe('2026-01-10');
  });

  it('creates, reads, and deletes important dates', () => {
    repo.createPerson({
      id: 'test_p3',
      name: 'Charlie Brown',
      circle: 'close',
      check_ins_enabled: true,
      tags: [],
    });

    const dateItem = repo.createImportantDate({
      id: 'date_1',
      person_id: 'test_p3',
      type: 'birthday',
      month: 7,
      day: 14,
      year: 1990,
      title: 'Charlie Birthday',
    });

    expect(dateItem.id).toBe('date_1');
    const dates = repo.getImportantDatesForPerson('test_p3');
    expect(dates.length).toBe(1);
    expect(dates[0].month).toBe(7);
    expect(dates[0].day).toBe(14);

    repo.deleteImportantDate('date_1');
    expect(repo.getImportantDatesForPerson('test_p3').length).toBe(0);
  });

  it('creates, reads, and deletes facts and news', () => {
    repo.createPerson({
      id: 'test_p4',
      name: 'Diana Prince',
      circle: 'inner',
      check_ins_enabled: true,
      tags: [],
    });

    // Fact
    const fact = repo.createFact({
      id: 'fact_1',
      person_id: 'test_p4',
      fact: 'Allergic to peanuts',
    });
    expect(repo.getFactsForPerson('test_p4').length).toBe(1);
    repo.deleteFact('fact_1');
    expect(repo.getFactsForPerson('test_p4').length).toBe(0);

    // News
    repo.createNews({
      id: 'news_1',
      person_id: 'test_p4',
      content: 'Promoted to Director',
      date: '2026-01-01',
    });
    repo.createNews({
      id: 'news_2',
      person_id: 'test_p4',
      content: 'Started at Google',
      date: '2026-02-01',
    });

    const person = repo.getPersonById('test_p4');
    expect(person?.latest_news?.content).toBe('Started at Google');

    repo.deleteNews('news_2');
    const personAfter = repo.getPersonById('test_p4');
    expect(personAfter?.latest_news?.content).toBe('Promoted to Director');
  });

  it('creates, updates, and deletes reminders', () => {
    repo.createPerson({
      id: 'test_p5',
      name: 'Edward Norton',
      circle: 'wider',
      check_ins_enabled: true,
      tags: [],
    });

    const rem = repo.createReminder({
      id: 'rem_1',
      person_id: 'test_p5',
      title: 'Send portfolio review',
      due_date: '2026-05-01',
      completed: false,
    });

    expect(rem.completed).toBe(false);

    // Toggle complete
    const updated = repo.updateReminder('rem_1', { completed: true });
    expect(updated?.completed).toBe(true);
    expect(updated?.completed_at).toBeDefined();

    repo.deleteReminder('rem_1');
    expect(repo.getRemindersForPerson('test_p5').length).toBe(0);
  });

  it('creates, updates, and deletes gifts', () => {
    repo.createPerson({
      id: 'test_p6',
      name: 'Fiona Gallagher',
      circle: 'close',
      check_ins_enabled: true,
      tags: [],
    });

    const gift = repo.createGift({
      id: 'gift_1',
      person_id: 'test_p6',
      name: 'Ceramic coffee cup',
      status: 'idea',
      occasion: 'Birthday',
    });

    expect(gift.status).toBe('idea');

    const updated = repo.updateGift('gift_1', { status: 'given', date: '2026-03-01' });
    expect(updated?.status).toBe('given');
    expect(updated?.date).toBe('2026-03-01');

    repo.deleteGift('gift_1');
    expect(repo.getGiftsForPerson('test_p6').length).toBe(0);
  });

  it('creates bidirectional connections and cleans up on person delete', () => {
    repo.createPerson({ id: 'p_sam', name: 'Sam', circle: 'inner', check_ins_enabled: true, tags: [] });
    repo.createPerson({ id: 'p_kate', name: 'Kate', circle: 'inner', check_ins_enabled: true, tags: [] });

    // Sam is Parent of Kate
    repo.createConnection({
      id: 'conn_1',
      person_a_id: 'p_sam',
      person_b_id: 'p_kate',
      relationship_type: 'parent',
    });

    // From Sam's page: shows Kate with "Parent of"
    const samConns = repo.getConnectionsForPerson('p_sam');
    expect(samConns.length).toBe(1);
    expect(samConns[0].connected_person.name).toBe('Kate');
    expect(samConns[0].relationship_label).toBe('Parent of');

    // From Kate's page: shows Sam with inverse "Child of"
    const kateConns = repo.getConnectionsForPerson('p_kate');
    expect(kateConns.length).toBe(1);
    expect(kateConns[0].connected_person.name).toBe('Sam');
    expect(kateConns[0].relationship_label).toBe('Child of');

    // Deleting Sam should remove connection from Kate's page cleanly
    repo.deletePerson('p_sam');
    const kateConnsAfter = repo.getConnectionsForPerson('p_kate');
    expect(kateConnsAfter.length).toBe(0);
  });
});
