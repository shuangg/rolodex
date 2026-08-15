import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "..", "data");
const DB_PATH = process.env.ROLODEX_DB || path.join(DATA_DIR, "rolodex.db");

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (db) return db;
  if (DB_PATH !== ":memory:") {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  }
  db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA busy_timeout = 5000;");
  migrate(db);
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export function resetDb(): void {
  closeDb();
  if (DB_PATH !== ":memory:") {
    fs.rmSync(DB_PATH, { force: true });
    fs.rmSync(`${DB_PATH}-wal`, { force: true });
    fs.rmSync(`${DB_PATH}-shm`, { force: true });
  }
}

export function migrate(database: DatabaseSync): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS people (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT,
      email TEXT,
      phone TEXT,
      job_title TEXT,
      company TEXT,
      city TEXT,
      time_zone TEXT,
      circle TEXT NOT NULL DEFAULT 'wider',
      cadence_override_days INTEGER,
      checkins_opted_out INTEGER NOT NULL DEFAULT 0,
      snooze_until TEXT,
      how_met TEXT,
      where_met TEXT,
      when_met TEXT,
      notes TEXT,
      tags TEXT NOT NULL DEFAULT '[]',
      photo BLOB,
      photo_mime TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS interactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      occurred_on TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_interactions_person ON interactions(person_id, occurred_on);
    CREATE TABLE IF NOT EXISTS important_dates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      label TEXT,
      month INTEGER NOT NULL,
      day INTEGER NOT NULL,
      year INTEGER,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_dates_person ON important_dates(person_id);
    CREATE TABLE IF NOT EXISTS facts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_facts_person ON facts(person_id);
    CREATE TABLE IF NOT EXISTS news (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      happened_on TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_news_person ON news(person_id, created_at);
    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      due_on TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 0,
      done_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_reminders_person ON reminders(person_id, due_on);
    CREATE TABLE IF NOT EXISTS connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      person_a_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      person_b_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_connections_a ON connections(person_a_id);
    CREATE INDEX IF NOT EXISTS idx_connections_b ON connections(person_b_id);
    CREATE TABLE IF NOT EXISTS gifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'idea',
      occasion TEXT,
      date TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_gifts_person ON gifts(person_id);
  `);
}
