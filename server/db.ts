import { DatabaseSync, type SQLInputValue } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'
import {
  computeStatus,
  type StatusResult,
} from './lib/cadence'
import { todayISO, nowISO } from './lib/dateUtils'
import type {
  Circle,
  Connection,
  ConnectionKind,
  ConnectionView,
  Fact,
  Gift,
  GiftKind,
  ImportantDate,
  ImportantDateType,
  Interaction,
  InteractionType,
  NewsItem,
  Person,
  PersonComputed,
  PersonInput,
  Reminder,
  TimelineEntry,
} from './lib/types'

const SCHEMA = `
CREATE TABLE IF NOT EXISTS people (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  job_title TEXT,
  company TEXT,
  city TEXT,
  timezone TEXT,
  circle TEXT NOT NULL DEFAULT 'close',
  cadence_override_days INTEGER,
  checkins_off INTEGER NOT NULL DEFAULT 0,
  snoozed_until TEXT,
  how_met TEXT,
  met_where TEXT,
  met_on TEXT,
  notes TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  photo TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS interactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  date TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS important_dates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  label TEXT,
  month INTEGER NOT NULL,
  day INTEGER NOT NULL,
  year INTEGER,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS facts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS news (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  date TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  due_date TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  done_at TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS gifts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  occasion TEXT,
  date TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  person_a INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  person_b INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  a_is_parent INTEGER NOT NULL DEFAULT 0,
  label TEXT,
  inverse_label TEXT,
  note TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_interactions_person ON interactions(person_id, date);
CREATE INDEX IF NOT EXISTS idx_news_person ON news(person_id, date);
CREATE INDEX IF NOT EXISTS idx_reminders_person ON reminders(person_id);
CREATE INDEX IF NOT EXISTS idx_connections_a ON connections(person_a);
CREATE INDEX IF NOT EXISTS idx_connections_b ON connections(person_b);
`

type Row = Record<string, unknown>

function rowToPerson(r: Row): Person {
  return {
    id: r.id as number,
    name: r.name as string,
    email: (r.email as string) ?? null,
    phone: (r.phone as string) ?? null,
    job_title: (r.job_title as string) ?? null,
    company: (r.company as string) ?? null,
    city: (r.city as string) ?? null,
    timezone: (r.timezone as string) ?? null,
    circle: r.circle as Circle,
    cadence_override_days: (r.cadence_override_days as number | null) ?? null,
    checkins_off: !!r.checkins_off,
    snoozed_until: (r.snoozed_until as string | null) ?? null,
    how_met: (r.how_met as string) ?? null,
    met_where: (r.met_where as string) ?? null,
    met_on: (r.met_on as string) ?? null,
    notes: (r.notes as string) ?? null,
    tags: JSON.parse((r.tags as string) ?? '[]'),
    photo: (r.photo as string) ?? null,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  }
}

export interface NewPerson extends Partial<PersonInput> {
  name: string
}

export interface Repo {
  db: DatabaseSync
  close(): void
  // people
  listPeople(): PersonComputed[]
  getPerson(id: number): PersonComputed | null
  createPerson(input: NewPerson): Person
  updatePerson(id: number, patch: Partial<PersonInput>): Person | null
  deletePerson(id: number): boolean
  personCount(): number
  // interactions
  listInteractions(personId: number): Interaction[]
  createInteraction(personId: number, type: InteractionType, date: string, notes: string | null): Interaction
  deleteInteraction(id: number): boolean
  lastContacted(personId: number): string | null
  // important dates
  listDates(personId: number): ImportantDate[]
  listAllDates(): (ImportantDate & { person_name: string })[]
  createDate(personId: number, type: ImportantDateType, label: string | null, month: number, day: number, year: number | null): ImportantDate
  deleteDate(id: number): boolean
  // facts
  listFacts(personId: number): Fact[]
  createFact(personId: number, text: string): Fact
  deleteFact(id: number): boolean
  // news
  listNews(personId: number): NewsItem[]
  createNews(personId: number, text: string, date: string): NewsItem
  deleteNews(id: number): boolean
  // reminders
  listReminders(personId: number): Reminder[]
  listOpenReminders(): (Reminder & { person_name: string })[]
  createReminder(personId: number, text: string, dueDate: string): Reminder
  setReminderDone(id: number, done: boolean): Reminder | null
  deleteReminder(id: number): boolean
  // gifts
  listGifts(personId: number): Gift[]
  createGift(personId: number, name: string, kind: GiftKind, occasion: string | null, date: string): Gift
  updateGift(id: number, patch: Partial<Pick<Gift, 'kind' | 'occasion' | 'date'>>): Gift | null
  deleteGift(id: number): boolean
  // connections
  listConnections(personId: number): ConnectionView[]
  createConnection(a: number, b: number, kind: ConnectionKind, aIsParent: boolean, label: string | null, inverseLabel: string | null, note: string | null): Connection | null
  deleteConnection(id: number): boolean
  // global
  timeline(personId: number | null, kind: string | null): TimelineEntry[]
  allTags(): string[]
}

export function describeConnection(personId: number, c: Connection, otherName: string): string {
  switch (c.kind) {
    case 'partner':
      return `Partner of ${otherName}`
    case 'sibling':
      return `Sibling of ${otherName}`
    case 'colleague':
      return c.note ? `Colleague of ${otherName} — ${c.note}` : `Colleague of ${otherName}`
    case 'parent_child':
      if (c.a_is_parent) {
        return personId === c.person_a ? `Parent of ${otherName}` : `Child of ${otherName}`
      }
      return personId === c.person_a ? `Child of ${otherName}` : `Parent of ${otherName}`
    case 'other':
      return personId === c.person_a ? c.label || `Connected to ${otherName}` : c.inverse_label || `Connected to ${otherName}`
  }
}

export function createRepo(db: DatabaseSync): Repo {
  db.exec(SCHEMA)

  const run = (sql: string, params: SQLInputValue[] = []) => db.prepare(sql).run(...params)

  function personComputed(p: Person): PersonComputed {
    const last = db
      .prepare('SELECT MAX(date) AS last FROM interactions WHERE person_id = ?')
      .get(p.id) as Row
    const lastContacted = (last.last as string | null) ?? null
    const newsRow = db
      .prepare('SELECT id, text, date FROM news WHERE person_id = ? ORDER BY date DESC, id DESC LIMIT 1')
      .get(p.id) as Row | undefined
    const status: StatusResult = computeStatus(p, lastContacted)
    return {
      ...p,
      last_contacted: lastContacted,
      next_due: status.nextDue,
      status: status.status,
      latest_news: newsRow ? { id: newsRow.id as number, text: newsRow.text as string, date: newsRow.date as string } : null,
    }
  }

  function insertPersonCols(input: NewPerson): Person {
    const now = nowISO()
    const tags = JSON.stringify(input.tags ?? [])
    const result = run(
      `INSERT INTO people (name, email, phone, job_title, company, city, timezone, circle,
        cadence_override_days, checkins_off, snoozed_until, how_met, met_where, met_on, notes, tags, photo, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.name,
        input.email ?? null,
        input.phone ?? null,
        input.job_title ?? null,
        input.company ?? null,
        input.city ?? null,
        input.timezone ?? null,
        input.circle ?? 'close',
        input.cadence_override_days ?? null,
        input.checkins_off ? 1 : 0,
        input.snoozed_until ?? null,
        input.how_met ?? null,
        input.met_where ?? null,
        input.met_on ?? null,
        input.notes ?? null,
        tags,
        input.photo ?? null,
        now,
        now,
      ]
    )
    return getPersonRow(Number(result.lastInsertRowid))
  }

  function getPersonRow(id: number): Person {
    const row = db.prepare('SELECT * FROM people WHERE id = ?').get(id) as Row | undefined
    if (!row) throw new Error(`Person ${id} not found`)
    return rowToPerson(row)
  }

  const repo: Repo = {
    db,
    close: () => db.close(),

    listPeople: () => {
      const rows = db.prepare('SELECT * FROM people ORDER BY name COLLATE NOCASE').all() as Row[]
      return rows.map((r) => personComputed(rowToPerson(r)))
    },

    getPerson: (id) => {
      const row = db.prepare('SELECT * FROM people WHERE id = ?').get(id) as Row | undefined
      return row ? personComputed(rowToPerson(row)) : null
    },

    createPerson: (input) => insertPersonCols(input),

    updatePerson: (id, patch) => {
      const existing = getPersonRow(id)
      const merged = { ...existing, ...patch } as Person
      const now = nowISO()
      run(
        `UPDATE people SET name=?, email=?, phone=?, job_title=?, company=?, city=?, timezone=?, circle=?,
          cadence_override_days=?, checkins_off=?, snoozed_until=?, how_met=?, met_where=?, met_on=?, notes=?, tags=?, photo=?, updated_at=?
         WHERE id=?`,
        [
          merged.name,
          merged.email,
          merged.phone,
          merged.job_title,
          merged.company,
          merged.city,
          merged.timezone,
          merged.circle,
          merged.cadence_override_days,
          merged.checkins_off ? 1 : 0,
          merged.snoozed_until,
          merged.how_met,
          merged.met_where,
          merged.met_on,
          merged.notes,
          JSON.stringify(merged.tags ?? []),
          merged.photo,
          now,
          id,
        ]
      )
      return getPersonRow(id)
    },

    deletePerson: (id) => {
      const result = run('DELETE FROM people WHERE id = ?', [id])
      return Number(result.changes) > 0
    },

    personCount: () => {
      const row = db.prepare('SELECT COUNT(*) AS n FROM people').get() as Row
      return row.n as number
    },

    listInteractions: (personId) =>
      (
        db
          .prepare('SELECT * FROM interactions WHERE person_id = ? ORDER BY date DESC, id DESC')
          .all(personId) as Row[]
      ).map(interactionFromRow),

    createInteraction: (personId, type, date, notes) => {
      const now = nowISO()
      const res = run('INSERT INTO interactions (person_id, type, date, notes, created_at) VALUES (?, ?, ?, ?, ?)', [
        personId,
        type,
        date,
        notes,
        now,
      ])
      return interactionFromRow(
        db.prepare('SELECT * FROM interactions WHERE id = ?').get(Number(res.lastInsertRowid)) as Row
      )
    },

    deleteInteraction: (id) => Number(run('DELETE FROM interactions WHERE id = ?', [id]).changes) > 0,

    lastContacted: (personId) => {
      const row = db.prepare('SELECT MAX(date) AS last FROM interactions WHERE person_id = ?').get(personId) as Row
      return (row.last as string | null) ?? null
    },

    listDates: (personId) =>
      (db.prepare('SELECT * FROM important_dates WHERE person_id = ? ORDER BY month, day').all(personId) as Row[]).map(
        dateFromRow
      ),

    listAllDates: () =>
      (
        db
          .prepare(
            `SELECT d.*, p.name AS person_name FROM important_dates d JOIN people p ON p.id = d.person_id ORDER BY d.month, d.day`
          )
          .all() as Row[]
      ).map((r) => ({ ...dateFromRow(r), person_name: r.person_name as string })),

    createDate: (personId, type, label, month, day, year) => {
      const now = nowISO()
      const res = run(
        'INSERT INTO important_dates (person_id, type, label, month, day, year, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [personId, type, label, month, day, year, now]
      )
      return dateFromRow(db.prepare('SELECT * FROM important_dates WHERE id = ?').get(Number(res.lastInsertRowid)) as Row)
    },

    deleteDate: (id) => Number(run('DELETE FROM important_dates WHERE id = ?', [id]).changes) > 0,

    listFacts: (personId) =>
      (db.prepare('SELECT * FROM facts WHERE person_id = ? ORDER BY created_at, id').all(personId) as Row[]).map(
        factFromRow
      ),

    createFact: (personId, text) => {
      const now = nowISO()
      const res = run('INSERT INTO facts (person_id, text, created_at) VALUES (?, ?, ?)', [personId, text, now])
      return factFromRow(db.prepare('SELECT * FROM facts WHERE id = ?').get(Number(res.lastInsertRowid)) as Row)
    },

    deleteFact: (id) => Number(run('DELETE FROM facts WHERE id = ?', [id]).changes) > 0,

    listNews: (personId) =>
      (db.prepare('SELECT * FROM news WHERE person_id = ? ORDER BY date DESC, id DESC').all(personId) as Row[]).map(
        newsFromRow
      ),

    createNews: (personId, text, date) => {
      const now = nowISO()
      const res = run('INSERT INTO news (person_id, text, date, created_at) VALUES (?, ?, ?, ?)', [
        personId,
        text,
        date,
        now,
      ])
      return newsFromRow(db.prepare('SELECT * FROM news WHERE id = ?').get(Number(res.lastInsertRowid)) as Row)
    },

    deleteNews: (id) => Number(run('DELETE FROM news WHERE id = ?', [id]).changes) > 0,

    listReminders: (personId) =>
      (db.prepare('SELECT * FROM reminders WHERE person_id = ? ORDER BY due_date').all(personId) as Row[]).map(
        reminderFromRow
      ),

    listOpenReminders: () =>
      (
        db
          .prepare(
            `SELECT r.*, p.name AS person_name FROM reminders r JOIN people p ON p.id = r.person_id
             WHERE r.done = 0 ORDER BY r.due_date`
          )
          .all() as Row[]
      ).map((r) => ({ ...reminderFromRow(r), person_name: r.person_name as string })),

    createReminder: (personId, text, dueDate) => {
      const now = nowISO()
      const res = run('INSERT INTO reminders (person_id, text, due_date, done, created_at) VALUES (?, ?, ?, 0, ?)', [
        personId,
        text,
        dueDate,
        now,
      ])
      return reminderFromRow(db.prepare('SELECT * FROM reminders WHERE id = ?').get(Number(res.lastInsertRowid)) as Row)
    },

    setReminderDone: (id, done) => {
      const now = nowISO()
      run('UPDATE reminders SET done = ?, done_at = ? WHERE id = ?', [done ? 1 : 0, done ? now : null, id])
      const row = db.prepare('SELECT * FROM reminders WHERE id = ?').get(id) as Row | undefined
      return row ? reminderFromRow(row) : null
    },

    deleteReminder: (id) => Number(run('DELETE FROM reminders WHERE id = ?', [id]).changes) > 0,

    listGifts: (personId) =>
      (db.prepare('SELECT * FROM gifts WHERE person_id = ? ORDER BY date DESC, id DESC').all(personId) as Row[]).map(
        giftFromRow
      ),

    createGift: (personId, name, kind, occasion, date) => {
      const now = nowISO()
      const res = run('INSERT INTO gifts (person_id, name, kind, occasion, date, created_at) VALUES (?, ?, ?, ?, ?, ?)', [
        personId,
        name,
        kind,
        occasion,
        date,
        now,
      ])
      return giftFromRow(db.prepare('SELECT * FROM gifts WHERE id = ?').get(Number(res.lastInsertRowid)) as Row)
    },

    updateGift: (id, patch) => {
      const row = db.prepare('SELECT * FROM gifts WHERE id = ?').get(id) as Row | undefined
      if (!row) return null
      const current = giftFromRow(row)
      const merged = { ...current, ...patch }
      run('UPDATE gifts SET name=?, kind=?, occasion=?, date=? WHERE id=?', [
        merged.name,
        merged.kind,
        merged.occasion,
        merged.date,
        id,
      ])
      return giftFromRow(db.prepare('SELECT * FROM gifts WHERE id = ?').get(id) as Row)
    },

    deleteGift: (id) => Number(run('DELETE FROM gifts WHERE id = ?', [id]).changes) > 0,

    listConnections: (personId) => {
      const rows = db
        .prepare(
          `SELECT c.*, pa.name AS a_name, pb.name AS b_name
           FROM connections c
           JOIN people pa ON pa.id = c.person_a
           JOIN people pb ON pb.id = c.person_b
           WHERE c.person_a = ? OR c.person_b = ?`
        )
        .all(personId, personId) as Row[]
      return rows.map((r) => {
        const conn = connectionFromRow(r)
        const otherId = conn.person_a === personId ? conn.person_b : conn.person_a
        const otherName = conn.person_a === personId ? (r.b_name as string) : (r.a_name as string)
        return {
          id: conn.id,
          other_id: otherId,
          other_name: otherName,
          kind: conn.kind,
          description: describeConnection(personId, conn, otherName),
          note: conn.note,
        }
      })
    },

    createConnection: (a, b, kind, aIsParent, label, inverseLabel, note) => {
      const now = nowISO()
      const res = run(
        'INSERT INTO connections (person_a, person_b, kind, a_is_parent, label, inverse_label, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [a, b, kind, aIsParent ? 1 : 0, label, inverseLabel, note, now]
      )
      const row = db.prepare('SELECT * FROM connections WHERE id = ?').get(Number(res.lastInsertRowid)) as Row | undefined
      return row ? connectionFromRow(row) : null
    },

    deleteConnection: (id) => Number(run('DELETE FROM connections WHERE id = ?', [id]).changes) > 0,

    timeline: (personId, kind) => {
      const entries: TimelineEntry[] = []
      const params: SQLInputValue[] = []
      let personFilter = ''
      if (personId != null) {
        personFilter = ' AND i.person_id = ? '
        params.push(personId)
      }
      const interactions = db
        .prepare(
          `SELECT i.*, p.name AS person_name FROM interactions i JOIN people p ON p.id = i.person_id WHERE 1=1 ${personFilter}`
        )
        .all(...params) as Row[]
      if (kind == null || kind === 'interaction' || kind.startsWith('interaction_')) {
        const sub = kind && kind.startsWith('interaction_') ? kind.slice('interaction_'.length) : null
        for (const r of interactions) {
          const i = interactionFromRow(r)
          if (sub && i.type !== sub) continue
          entries.push({
            id: `interaction-${i.id}`,
            person_id: i.person_id,
            person_name: r.person_name as string,
            kind: 'interaction',
            interaction_type: i.type,
            date: i.date,
            text: i.notes ?? '',
          })
        }
      }

      if (kind == null || kind === 'news') {
        const newsParams: SQLInputValue[] = []
        let newsFilter = ''
        if (personId != null) {
          newsFilter = ' AND n.person_id = ? '
          newsParams.push(personId)
        }
        const newsRows = db
          .prepare(
            `SELECT n.*, p.name AS person_name FROM news n JOIN people p ON p.id = n.person_id WHERE 1=1 ${newsFilter}`
          )
          .all(...newsParams) as Row[]
        for (const r of newsRows) {
          entries.push({
            id: `news-${r.id}`,
            person_id: r.person_id as number,
            person_name: r.person_name as string,
            kind: 'news',
            interaction_type: null,
            date: r.date as string,
            text: r.text as string,
          })
        }
      }

      if (kind == null || kind === 'reminder_done') {
        const remParams: SQLInputValue[] = []
        let remFilter = ''
        if (personId != null) {
          remFilter = ' AND r.person_id = ? '
          remParams.push(personId)
        }
        const remRows = db
          .prepare(
            `SELECT r.*, p.name AS person_name FROM reminders r JOIN people p ON p.id = r.person_id
             WHERE r.done = 1 ${remFilter}`
          )
          .all(...remParams) as Row[]
        for (const r of remRows) {
          entries.push({
            id: `reminder-${r.id}`,
            person_id: r.person_id as number,
            person_name: r.person_name as string,
            kind: 'reminder_done',
            interaction_type: null,
            date: (r.done_at as string | null)?.slice(0, 10) ?? (r.due_date as string),
            text: r.text as string,
          })
        }
      }

      return entries.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    },

    allTags: () => {
      const rows = db.prepare('SELECT tags FROM people').all() as Row[]
      const set = new Set<string>()
      for (const r of rows) {
        for (const t of JSON.parse((r.tags as string) ?? '[]') as string[]) set.add(t)
      }
      return [...set].sort((a, b) => a.localeCompare(b))
    },
  }

  return repo
}

function interactionFromRow(r: Row): Interaction {
  return {
    id: r.id as number,
    person_id: r.person_id as number,
    type: r.type as InteractionType,
    date: r.date as string,
    notes: (r.notes as string | null) ?? null,
    created_at: r.created_at as string,
  }
}

function dateFromRow(r: Row): ImportantDate {
  return {
    id: r.id as number,
    person_id: r.person_id as number,
    type: r.type as ImportantDateType,
    label: (r.label as string | null) ?? null,
    month: r.month as number,
    day: r.day as number,
    year: (r.year as number | null) ?? null,
    created_at: r.created_at as string,
  }
}

function factFromRow(r: Row): Fact {
  return {
    id: r.id as number,
    person_id: r.person_id as number,
    text: r.text as string,
    created_at: r.created_at as string,
  }
}

function newsFromRow(r: Row): NewsItem {
  return {
    id: r.id as number,
    person_id: r.person_id as number,
    text: r.text as string,
    date: r.date as string,
    created_at: r.created_at as string,
  }
}

function reminderFromRow(r: Row): Reminder {
  return {
    id: r.id as number,
    person_id: r.person_id as number,
    text: r.text as string,
    due_date: r.due_date as string,
    done: !!r.done,
    done_at: (r.done_at as string | null) ?? null,
    created_at: r.created_at as string,
  }
}

function giftFromRow(r: Row): Gift {
  return {
    id: r.id as number,
    person_id: r.person_id as number,
    name: r.name as string,
    kind: r.kind as GiftKind,
    occasion: (r.occasion as string | null) ?? null,
    date: r.date as string,
    created_at: r.created_at as string,
  }
}

function connectionFromRow(r: Row): Connection {
  return {
    id: r.id as number,
    person_a: r.person_a as number,
    person_b: r.person_b as number,
    kind: r.kind as ConnectionKind,
    a_is_parent: !!r.a_is_parent,
    label: (r.label as string | null) ?? null,
    inverse_label: (r.inverse_label as string | null) ?? null,
    note: (r.note as string | null) ?? null,
    created_at: r.created_at as string,
  }
}

export function openDatabase(dataDir: string, filename = 'rolodex.sqlite'): Repo {
  fs.mkdirSync(dataDir, { recursive: true })
  const dbPath = path.join(dataDir, filename)
  const db = new DatabaseSync(dbPath)
  db.exec('PRAGMA journal_mode = WAL')
  db.exec('PRAGMA foreign_keys = ON')
  return createRepo(db)
}
