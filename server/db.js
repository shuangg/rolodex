import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
const DB_PATH = process.env.DB_PATH || path.resolve(process.cwd(), 'rolodex.sqlite');
export function initDatabase(dbPath = DB_PATH) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    // Create tables
    db.exec(`
    CREATE TABLE IF NOT EXISTS people (
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

    CREATE TABLE IF NOT EXISTS interactions (
      id TEXT PRIMARY KEY,
      person_id TEXT NOT NULL,
      type TEXT NOT NULL,
      date TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS important_dates (
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

    CREATE TABLE IF NOT EXISTS facts (
      id TEXT PRIMARY KEY,
      person_id TEXT NOT NULL,
      fact TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS news (
      id TEXT PRIMARY KEY,
      person_id TEXT NOT NULL,
      content TEXT NOT NULL,
      date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      person_id TEXT NOT NULL,
      title TEXT NOT NULL,
      due_date TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS gifts (
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

    CREATE TABLE IF NOT EXISTS connections (
      id TEXT PRIMARY KEY,
      person_a_id TEXT NOT NULL,
      person_b_id TEXT NOT NULL,
      relationship_type TEXT NOT NULL,
      custom_label TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (person_a_id) REFERENCES people(id) ON DELETE CASCADE,
      FOREIGN KEY (person_b_id) REFERENCES people(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_interactions_person ON interactions(person_id);
    CREATE INDEX IF NOT EXISTS idx_interactions_date ON interactions(date);
    CREATE INDEX IF NOT EXISTS idx_important_dates_person ON important_dates(person_id);
    CREATE INDEX IF NOT EXISTS idx_facts_person ON facts(person_id);
    CREATE INDEX IF NOT EXISTS idx_news_person ON news(person_id);
    CREATE INDEX IF NOT EXISTS idx_reminders_person ON reminders(person_id);
    CREATE INDEX IF NOT EXISTS idx_gifts_person ON gifts(person_id);
    CREATE INDEX IF NOT EXISTS idx_connections_a ON connections(person_a_id);
    CREATE INDEX IF NOT EXISTS idx_connections_b ON connections(person_b_id);
  `);
    return db;
}
let defaultDb = null;
export function getDb() {
    if (!defaultDb) {
        defaultDb = initDatabase();
    }
    return defaultDb;
}
