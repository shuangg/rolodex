import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const SCHEMA = `
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS people (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  photo BLOB,
  photo_mime TEXT,
  email TEXT,
  phone TEXT,
  job_title TEXT,
  company TEXT,
  city TEXT,
  timezone TEXT,
  circle TEXT NOT NULL,
  cadence_override_days INTEGER,
  checkins_enabled INTEGER NOT NULL DEFAULT 1,
  snooze_until TEXT,
  how_met TEXT,
  where_met TEXT,
  when_met TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tags (
  person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  PRIMARY KEY (person_id, tag)
);
CREATE TABLE IF NOT EXISTS interactions (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  date TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS important_dates (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  label TEXT,
  month INTEGER NOT NULL,
  day INTEGER NOT NULL,
  year INTEGER
);
CREATE TABLE IF NOT EXISTS facts (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  content TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS news (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  date TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  due_date TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  done_at TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS connections (
  id TEXT PRIMARY KEY,
  from_person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  to_person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  label TEXT
);
CREATE TABLE IF NOT EXISTS gifts (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  status TEXT NOT NULL,
  occasion TEXT,
  date TEXT
);
`;

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!db) throw new Error("Database not initialised");
  return db;
}

export function initDb(filePath = path.resolve("data/rolodex.db")): DatabaseSync {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  db = new DatabaseSync(filePath);
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(SCHEMA);
  return db;
}

export function initMemoryDb(): DatabaseSync {
  db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(SCHEMA);
  return db;
}

export function closeDb(): void {
  db?.close();
  db = null;
}
