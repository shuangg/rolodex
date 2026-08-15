import { getDb } from "./db";
import { computeCheckin } from "../src/lib/cadence";
import type {
  CheckinInfo,
  Circle,
  Connection,
  ConnectionView,
  Fact,
  Gift,
  ImportantDate,
  ImportantDateKind,
  Interaction,
  InteractionType,
  NewsItem,
  Person,
  PersonSummary,
  PersonWithMeta,
  Reminder,
  TimelineEntry,
  TimelineEntryType,
} from "../src/types";

export type NewPerson = Omit<Person, "id" | "createdAt" | "updatedAt" | "hasPhoto">;

interface Row {
  [key: string]: unknown;
}

function now(): string {
  return new Date().toISOString();
}

function lastRowId(): number {
  return Number((getDb().prepare("SELECT last_insert_rowid() AS id").get() as Row).id);
}

function parseTags(tags: unknown): string[] {
  try {
    const parsed = JSON.parse(String(tags ?? "[]"));
    return Array.isArray(parsed) ? parsed.map((t: unknown) => String(t)) : [];
  } catch {
    return [];
  }
}

function parseBool(v: unknown): boolean {
  return v === 1 || v === true;
}

export function rowToPerson(r: Row): Person {
  return {
    id: Number(r.id),
    firstName: String(r.first_name),
    lastName: r.last_name != null ? String(r.last_name) : null,
    email: r.email != null ? String(r.email) : null,
    phone: r.phone != null ? String(r.phone) : null,
    jobTitle: r.job_title != null ? String(r.job_title) : null,
    company: r.company != null ? String(r.company) : null,
    city: r.city != null ? String(r.city) : null,
    timeZone: r.time_zone != null ? String(r.time_zone) : null,
    circle: String(r.circle) as Circle,
    cadenceOverrideDays: r.cadence_override_days != null ? Number(r.cadence_override_days) : null,
    checkinsOptedOut: parseBool(r.checkins_opted_out),
    snoozeUntil: r.snooze_until != null ? String(r.snooze_until) : null,
    howMet: r.how_met != null ? String(r.how_met) : null,
    whereMet: r.where_met != null ? String(r.where_met) : null,
    whenMet: r.when_met != null ? String(r.when_met) : null,
    notes: r.notes != null ? String(r.notes) : null,
    tags: parseTags(r.tags),
    hasPhoto: r.photo != null,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

function personSelect(): string {
  return `
    SELECT id, first_name, last_name, email, phone, job_title, company, city, time_zone,
           circle, cadence_override_days, checkins_opted_out, snooze_until, how_met,
           where_met, when_met, notes, tags, photo, created_at, updated_at
    FROM people
  `;
}

function summaryFromRow(r: Row): PersonSummary {
  return {
    id: Number(r.id),
    firstName: String(r.first_name),
    lastName: r.last_name != null ? String(r.last_name) : null,
    email: r.email != null ? String(r.email) : null,
    company: r.company != null ? String(r.company) : null,
    circle: String(r.circle) as Circle,
    hasPhoto: r.photo != null,
  };
}

export function personSummary(id: number): PersonSummary | null {
  const r = getDb()
    .prepare("SELECT id, first_name, last_name, email, company, circle, photo FROM people WHERE id = ?")
    .get(id) as Row | undefined;
  return r ? summaryFromRow(r) : null;
}

export function getPerson(id: number): Person | null {
  const r = getDb().prepare(`${personSelect()} WHERE id = ?`).get(id) as Row | undefined;
  return r ? rowToPerson(r) : null;
}

export function listPeople(): Person[] {
  const rows = getDb().prepare(personSelect()).all() as Row[];
  return rows.map(rowToPerson);
}

export function createPerson(input: Partial<NewPerson>): Person {
  const db = getDb();
  const ts = now();
  const tags = JSON.stringify(input.tags ?? []);
  db.prepare(`
    INSERT INTO people (
      first_name, last_name, email, phone, job_title, company, city, time_zone, circle,
      cadence_override_days, checkins_opted_out, snooze_until, how_met, where_met, when_met,
      notes, tags, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.firstName ?? "",
    input.lastName ?? null,
    input.email ?? null,
    input.phone ?? null,
    input.jobTitle ?? null,
    input.company ?? null,
    input.city ?? null,
    input.timeZone ?? null,
    input.circle ?? "wider",
    input.cadenceOverrideDays ?? null,
    input.checkinsOptedOut ? 1 : 0,
    input.snoozeUntil ?? null,
    input.howMet ?? null,
    input.whereMet ?? null,
    input.whenMet ?? null,
    input.notes ?? null,
    tags,
    ts,
    ts,
  );
  const id = lastRowId();
  return getPerson(id)!;
}

export function updatePerson(id: number, input: Partial<NewPerson>): Person | null {
  const existing = getPerson(id);
  if (!existing) return null;
  const merged: Partial<NewPerson> = {
    ...existing,
    ...input,
    tags: input.tags ?? existing.tags,
  };
  const db = getDb();
  db.prepare(`
    UPDATE people SET
      first_name = ?, last_name = ?, email = ?, phone = ?, job_title = ?, company = ?,
      city = ?, time_zone = ?, circle = ?, cadence_override_days = ?, checkins_opted_out = ?,
      snooze_until = ?, how_met = ?, where_met = ?, when_met = ?, notes = ?, tags = ?,
      updated_at = ?
    WHERE id = ?
  `).run(
    merged.firstName ?? "",
    merged.lastName ?? null,
    merged.email ?? null,
    merged.phone ?? null,
    merged.jobTitle ?? null,
    merged.company ?? null,
    merged.city ?? null,
    merged.timeZone ?? null,
    merged.circle ?? "wider",
    merged.cadenceOverrideDays ?? null,
    merged.checkinsOptedOut ? 1 : 0,
    merged.snoozeUntil ?? null,
    merged.howMet ?? null,
    merged.whereMet ?? null,
    merged.whenMet ?? null,
    merged.notes ?? null,
    JSON.stringify(merged.tags ?? []),
    now(),
    id,
  );
  return getPerson(id);
}

export function deletePerson(id: number): boolean {
  const db = getDb();
  const info = db.prepare("DELETE FROM people WHERE id = ?").run(id);
  return Number(info.changes) > 0;
}

export function setPersonPhoto(id: number, data: Buffer, mime: string): boolean {
  const db = getDb();
  const info = db
    .prepare("UPDATE people SET photo = ?, photo_mime = ?, updated_at = ? WHERE id = ?")
    .run(data, mime, now(), id);
  return Number(info.changes) > 0;
}

export function getPersonPhoto(id: number): { data: Buffer; mime: string } | null {
  const r = getDb()
    .prepare("SELECT photo, photo_mime FROM people WHERE id = ?")
    .get(id) as Row | undefined;
  if (!r || r.photo == null) return null;
  return { data: Buffer.from(r.photo as Uint8Array), mime: String(r.photo_mime ?? "image/png") };
}

export function getLastContacted(personId: number): string | null {
  const r = getDb()
    .prepare("SELECT MAX(occurred_on) AS last FROM interactions WHERE person_id = ?")
    .get(personId) as Row | undefined;
  return r && r.last != null ? String(r.last) : null;
}

export function getLatestNews(personId: number): string | null {
  const r = getDb()
    .prepare("SELECT text FROM news WHERE person_id = ? ORDER BY created_at DESC LIMIT 1")
    .get(personId) as Row | undefined;
  return r && r.text != null ? String(r.text) : null;
}

export function checkinFor(person: Person): CheckinInfo {
  const lastContacted = getLastContacted(person.id);
  return computeCheckin(
    {
      circle: person.circle,
      cadenceOverrideDays: person.cadenceOverrideDays,
      checkinsOptedOut: person.checkinsOptedOut,
      snoozeUntil: person.snoozeUntil,
      lastContacted,
    },
    new Date(),
  );
}

export function withMeta(person: Person): PersonWithMeta {
  return {
    ...person,
    lastContacted: getLastContacted(person.id),
    latestNews: getLatestNews(person.id),
    checkin: checkinFor(person),
  };
}

export function listPeopleWithMeta(): PersonWithMeta[] {
  return listPeople().map(withMeta);
}

export function getPersonWithMeta(id: number): PersonWithMeta | null {
  const person = getPerson(id);
  return person ? withMeta(person) : null;
}

// ---- Interactions ---------------------------------------------------------

function rowToInteraction(r: Row): Interaction {
  return {
    id: Number(r.id),
    personId: Number(r.person_id),
    type: String(r.type) as InteractionType,
    occurredOn: String(r.occurred_on),
    notes: r.notes != null ? String(r.notes) : null,
    createdAt: String(r.created_at),
  };
}

export function listInteractions(personId: number): Interaction[] {
  const rows = getDb()
    .prepare(
      "SELECT * FROM interactions WHERE person_id = ? ORDER BY occurred_on DESC, created_at DESC",
    )
    .all(personId) as Row[];
  return rows.map(rowToInteraction);
}

export function createInteraction(input: {
  personId: number;
  type: InteractionType;
  occurredOn: string;
  notes?: string | null;
}): Interaction | null {
  if (!getPerson(input.personId)) return null;
  const db = getDb();
  db.prepare(
    "INSERT INTO interactions (person_id, type, occurred_on, notes, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run(input.personId, input.type, input.occurredOn, input.notes ?? null, now());
  const id = lastRowId();
  return listInteractions(input.personId).find((i) => i.id === id) ?? null;
}

export function updateInteraction(
  id: number,
  input: { type?: InteractionType; occurredOn?: string; notes?: string | null },
): Interaction | null {
  const existing = getDb().prepare("SELECT * FROM interactions WHERE id = ?").get(id) as Row | undefined;
  if (!existing) return null;
  const type = (input.type ?? existing.type) as InteractionType;
  const occurredOn = input.occurredOn ?? String(existing.occurred_on);
  const notes = input.notes !== undefined ? input.notes : (existing.notes as string | null);
  getDb()
    .prepare("UPDATE interactions SET type = ?, occurred_on = ?, notes = ? WHERE id = ?")
    .run(type, occurredOn, notes, id);
  const r = getDb().prepare("SELECT * FROM interactions WHERE id = ?").get(id) as Row;
  return rowToInteraction(r);
}

export function deleteInteraction(id: number): boolean {
  return Number(getDb().prepare("DELETE FROM interactions WHERE id = ?").run(id).changes) > 0;
}

// ---- Important dates ------------------------------------------------------

function rowToImportantDate(r: Row): ImportantDate {
  return {
    id: Number(r.id),
    personId: Number(r.person_id),
    kind: String(r.kind) as ImportantDateKind,
    label: r.label != null ? String(r.label) : null,
    month: Number(r.month),
    day: Number(r.day),
    year: r.year != null ? Number(r.year) : null,
    createdAt: String(r.created_at),
  };
}

export function listImportantDates(personId: number): ImportantDate[] {
  const rows = getDb()
    .prepare("SELECT * FROM important_dates WHERE person_id = ? ORDER BY month, day")
    .all(personId) as Row[];
  return rows.map(rowToImportantDate);
}

export interface DateWithPerson {
  date: ImportantDate;
  person: PersonSummary;
}

export function listAllDates(): DateWithPerson[] {
  const rows = getDb()
    .prepare(
      `SELECT d.*, p.id AS _pid, p.first_name, p.last_name, p.email, p.company, p.circle, p.photo
       FROM important_dates d JOIN people p ON p.id = d.person_id
       ORDER BY d.month, d.day`,
    )
    .all() as Row[];
  return rows.map((r) => ({
    date: {
      id: Number(r.id),
      personId: Number(r.person_id),
      kind: String(r.kind) as ImportantDateKind,
      label: r.label != null ? String(r.label) : null,
      month: Number(r.month),
      day: Number(r.day),
      year: r.year != null ? Number(r.year) : null,
      createdAt: String(r.created_at),
    },
    person: { ...summaryFromRow(r), id: Number(r._pid) },
  }));
}

export function createImportantDate(input: {
  personId: number;
  kind: ImportantDateKind;
  label?: string | null;
  month: number;
  day: number;
  year?: number | null;
}): ImportantDate | null {
  if (!getPerson(input.personId)) return null;
  const db = getDb();
  db.prepare(
    "INSERT INTO important_dates (person_id, kind, label, month, day, year, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run(input.personId, input.kind, input.label ?? null, input.month, input.day, input.year ?? null, now());
  const id = lastRowId();
  return listImportantDates(input.personId).find((d) => d.id === id) ?? null;
}

export function updateImportantDate(
  id: number,
  input: Partial<{ kind: ImportantDateKind; label: string | null; month: number; day: number; year: number | null }>,
): ImportantDate | null {
  const existing = getDb().prepare("SELECT * FROM important_dates WHERE id = ?").get(id) as Row | undefined;
  if (!existing) return null;
  const kind = (input.kind ?? existing.kind) as ImportantDateKind;
  const label = input.label !== undefined ? input.label : (existing.label as string | null);
  const month = (input.month ?? existing.month) as number;
  const day = (input.day ?? existing.day) as number;
  const year = input.year !== undefined ? input.year : (existing.year as number | null);
  getDb()
    .prepare(
      "UPDATE important_dates SET kind = ?, label = ?, month = ?, day = ?, year = ? WHERE id = ?",
    )
    .run(kind, label, month, day, year, id);
  const r = getDb().prepare("SELECT * FROM important_dates WHERE id = ?").get(id) as Row;
  return rowToImportantDate(r);
}

export function deleteImportantDate(id: number): boolean {
  return Number(getDb().prepare("DELETE FROM important_dates WHERE id = ?").run(id).changes) > 0;
}

// ---- Facts ----------------------------------------------------------------

function rowToFact(r: Row): Fact {
  return {
    id: Number(r.id),
    personId: Number(r.person_id),
    text: String(r.text),
    createdAt: String(r.created_at),
  };
}

export function listFacts(personId: number): Fact[] {
  const rows = getDb()
    .prepare("SELECT * FROM facts WHERE person_id = ? ORDER BY created_at DESC")
    .all(personId) as Row[];
  return rows.map(rowToFact);
}

export function createFact(personId: number, text: string): Fact | null {
  if (!getPerson(personId) || !text.trim()) return null;
  const db = getDb();
  db.prepare("INSERT INTO facts (person_id, text, created_at) VALUES (?, ?, ?)").run(
    personId,
    text.trim(),
    now(),
  );
  const id = lastRowId();
  const r = getDb().prepare("SELECT * FROM facts WHERE id = ?").get(id) as Row;
  return rowToFact(r);
}

export function deleteFact(id: number): boolean {
  return Number(getDb().prepare("DELETE FROM facts WHERE id = ?").run(id).changes) > 0;
}

// ---- News -----------------------------------------------------------------

function rowToNews(r: Row): NewsItem {
  return {
    id: Number(r.id),
    personId: Number(r.person_id),
    text: String(r.text),
    happenedOn: r.happened_on != null ? String(r.happened_on) : null,
    createdAt: String(r.created_at),
  };
}

export function listNews(personId: number): NewsItem[] {
  const rows = getDb()
    .prepare("SELECT * FROM news WHERE person_id = ? ORDER BY created_at DESC")
    .all(personId) as Row[];
  return rows.map(rowToNews);
}

export function createNews(
  personId: number,
  text: string,
  happenedOn?: string | null,
): NewsItem | null {
  if (!getPerson(personId) || !text.trim()) return null;
  const db = getDb();
  db.prepare("INSERT INTO news (person_id, text, happened_on, created_at) VALUES (?, ?, ?, ?)").run(
    personId,
    text.trim(),
    happenedOn ?? null,
    now(),
  );
  const id = lastRowId();
  const r = getDb().prepare("SELECT * FROM news WHERE id = ?").get(id) as Row;
  return rowToNews(r);
}

export function deleteNews(id: number): boolean {
  return Number(getDb().prepare("DELETE FROM news WHERE id = ?").run(id).changes) > 0;
}

// ---- Reminders ------------------------------------------------------------

function rowToReminder(r: Row): Reminder {
  return {
    id: Number(r.id),
    personId: Number(r.person_id),
    title: String(r.title),
    dueOn: String(r.due_on),
    done: parseBool(r.done),
    doneAt: r.done_at != null ? String(r.done_at) : null,
    createdAt: String(r.created_at),
  };
}

export function listReminders(personId: number): Reminder[] {
  const rows = getDb()
    .prepare("SELECT * FROM reminders WHERE person_id = ? ORDER BY done ASC, due_on ASC")
    .all(personId) as Row[];
  return rows.map(rowToReminder);
}

export function createReminder(input: {
  personId: number;
  title: string;
  dueOn: string;
}): Reminder | null {
  if (!getPerson(input.personId) || !input.title.trim()) return null;
  const db = getDb();
  db.prepare("INSERT INTO reminders (person_id, title, due_on, created_at) VALUES (?, ?, ?, ?)").run(
    input.personId,
    input.title.trim(),
    input.dueOn,
    now(),
  );
  const id = lastRowId();
  const r = getDb().prepare("SELECT * FROM reminders WHERE id = ?").get(id) as Row;
  return rowToReminder(r);
}

export function toggleReminder(id: number, done: boolean): Reminder | null {
  const existing = getDb().prepare("SELECT * FROM reminders WHERE id = ?").get(id) as Row | undefined;
  if (!existing) return null;
  const doneAt = done ? now() : null;
  getDb().prepare("UPDATE reminders SET done = ?, done_at = ? WHERE id = ?").run(done ? 1 : 0, doneAt, id);
  const r = getDb().prepare("SELECT * FROM reminders WHERE id = ?").get(id) as Row;
  return rowToReminder(r);
}

export function deleteReminder(id: number): boolean {
  return Number(getDb().prepare("DELETE FROM reminders WHERE id = ?").run(id).changes) > 0;
}

export function listOpenReminders(): Reminder[] {
  const rows = getDb()
    .prepare("SELECT * FROM reminders WHERE done = 0 ORDER BY due_on ASC")
    .all() as Row[];
  return rows.map(rowToReminder);
}

// ---- Connections ----------------------------------------------------------

const RECIPROCAL: Record<string, string> = {
  parent: "child",
  child: "parent",
  partner: "partner",
  sibling: "sibling",
  colleague: "colleague",
};

export function reciprocalLabel(label: string): string {
  return RECIPROCAL[label.toLowerCase()] ?? "connection";
}

function rowToConnection(r: Row): Connection {
  return {
    id: Number(r.id),
    personAId: Number(r.person_a_id),
    personBId: Number(r.person_b_id),
    label: String(r.label),
    createdAt: String(r.created_at),
  };
}

export function listConnections(personId: number): ConnectionView[] {
  const rows = getDb()
    .prepare(
      `SELECT c.*, p.id AS _pid, p.first_name, p.last_name, p.email, p.company, p.circle, p.photo
       FROM connections c
       JOIN people p ON p.id = CASE WHEN c.person_a_id = ? THEN c.person_b_id ELSE c.person_a_id END
       WHERE c.person_a_id = ? OR c.person_b_id = ?
       ORDER BY p.first_name`,
    )
    .all(personId, personId, personId) as Row[];
  return rows.map((r) => {
    const viewPerson = { ...summaryFromRow(r), id: Number(r._pid) };
    const aIsPerson = Number(r.person_a_id) === personId;
    const label = aIsPerson ? reciprocalLabel(String(r.label)) : String(r.label);
    return { id: Number(r.id), person: viewPerson, label };
  });
}

export function createConnection(input: {
  personAId: number;
  personBId: number;
  label: string;
}): Connection | null {
  if (input.personAId === input.personBId) return null;
  if (!getPerson(input.personAId) || !getPerson(input.personBId)) return null;
  const db = getDb();
  const existing = db
    .prepare(
      `SELECT id FROM connections
       WHERE (person_a_id = ? AND person_b_id = ?) OR (person_a_id = ? AND person_b_id = ?)`,
    )
    .get(input.personAId, input.personBId, input.personBId, input.personAId) as Row | undefined;
  if (existing) {
    db.prepare("UPDATE connections SET label = ? WHERE id = ?").run(input.label, Number(existing.id));
    return rowToConnection(db.prepare("SELECT * FROM connections WHERE id = ?").get(Number(existing.id)) as Row);
  }
  db.prepare(
    "INSERT INTO connections (person_a_id, person_b_id, label, created_at) VALUES (?, ?, ?, ?)",
  ).run(input.personAId, input.personBId, input.label, now());
  const id = lastRowId();
  const r = db.prepare("SELECT * FROM connections WHERE id = ?").get(id) as Row;
  return rowToConnection(r);
}

export function deleteConnection(id: number): boolean {
  return Number(getDb().prepare("DELETE FROM connections WHERE id = ?").run(id).changes) > 0;
}

// ---- Gifts ----------------------------------------------------------------

function rowToGift(r: Row): Gift {
  return {
    id: Number(r.id),
    personId: Number(r.person_id),
    text: String(r.text),
    status: String(r.status) as Gift["status"],
    occasion: r.occasion != null ? String(r.occasion) : null,
    date: r.date != null ? String(r.date) : null,
    createdAt: String(r.created_at),
  };
}

export function listGifts(personId: number): Gift[] {
  const rows = getDb()
    .prepare("SELECT * FROM gifts WHERE person_id = ? ORDER BY created_at DESC")
    .all(personId) as Row[];
  return rows.map(rowToGift);
}

export function createGift(input: {
  personId: number;
  text: string;
  status?: Gift["status"];
  occasion?: string | null;
  date?: string | null;
}): Gift | null {
  if (!getPerson(input.personId) || !input.text.trim()) return null;
  const db = getDb();
  db.prepare(
    "INSERT INTO gifts (person_id, text, status, occasion, date, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(
    input.personId,
    input.text.trim(),
    input.status ?? "idea",
    input.occasion ?? null,
    input.date ?? null,
    now(),
  );
  const id = lastRowId();
  const r = db.prepare("SELECT * FROM gifts WHERE id = ?").get(id) as Row;
  return rowToGift(r);
}

export function updateGiftStatus(id: number, status: Gift["status"]): Gift | null {
  const existing = getDb().prepare("SELECT * FROM gifts WHERE id = ?").get(id) as Row | undefined;
  if (!existing) return null;
  getDb().prepare("UPDATE gifts SET status = ? WHERE id = ?").run(status, id);
  const r = getDb().prepare("SELECT * FROM gifts WHERE id = ?").get(id) as Row;
  return rowToGift(r);
}

export function deleteGift(id: number): boolean {
  return Number(getDb().prepare("DELETE FROM gifts WHERE id = ?").run(id).changes) > 0;
}

// ---- Timeline -------------------------------------------------------------

export function buildTimeline(personId?: number, type?: string): TimelineEntry[] {
  const db = getDb();
  const entries: TimelineEntry[] = [];
  const personWhere = personId ? "WHERE person_id = ?" : "";
  const personParams: (number | string)[] = personId ? [personId] : [];
  const personAnd = personId ? "AND r.person_id = ?" : "";

  const addEntry = (
    date: string,
    entryType: TimelineEntryType,
    person: PersonSummary,
    description: string,
    details: string | null,
  ) => {
    entries.push({
      id: `${entryType}-${date}-${entries.length}`,
      date,
      type: entryType,
      person,
      description,
      details,
    });
  };

  const personFromJoin = (r: Row): PersonSummary => ({
    ...summaryFromRow(r),
    id: Number(r.person_id),
  });

  const interactions = db
    .prepare(
      `SELECT i.*, p.first_name, p.last_name, p.email, p.company, p.circle, p.photo
       FROM interactions i JOIN people p ON p.id = i.person_id ${personWhere}
       ORDER BY i.occurred_on DESC, i.created_at DESC`,
    )
    .all(...personParams) as Row[];
  const TYPE_LABEL: Record<string, string> = {
    call: "Call",
    message: "Message",
    email: "Email",
    meetup: "Met up",
    other: "Other",
  };
  for (const r of interactions) {
    addEntry(String(r.occurred_on), "interaction", personFromJoin(r), TYPE_LABEL[String(r.type)] ?? "Interaction", String(r.notes ?? ""));
  }

  const news = db
    .prepare(
      `SELECT n.*, p.first_name, p.last_name, p.email, p.company, p.circle, p.photo
       FROM news n JOIN people p ON p.id = n.person_id ${personWhere}
       ORDER BY n.created_at DESC`,
    )
    .all(...personParams) as Row[];
  for (const r of news) {
    addEntry(String(r.created_at), "news", personFromJoin(r), "News", String(r.text));
  }

  const remindersDone = db
    .prepare(
      `SELECT r.*, p.first_name, p.last_name, p.email, p.company, p.circle, p.photo
       FROM reminders r JOIN people p ON p.id = r.person_id
       WHERE r.done = 1 ${personAnd}
       ORDER BY r.done_at DESC`,
    )
    .all(...personParams) as Row[];
  for (const r of remindersDone) {
    addEntry(String(r.done_at ?? r.due_on), "reminder_done", personFromJoin(r), "Reminder completed", String(r.title));
  }

  if (personId) {
    const facts = listFacts(personId);
    const person = personSummary(personId);
    if (person) {
      for (const f of facts) {
        addEntry(f.createdAt, "fact", person, "Fact recorded", f.text);
      }
    }
  }

  const gifts = db
    .prepare(
      `SELECT g.*, p.first_name, p.last_name, p.email, p.company, p.circle, p.photo
       FROM gifts g JOIN people p ON p.id = g.person_id ${personWhere}
       ORDER BY g.created_at DESC`,
    )
    .all(...personParams) as Row[];
  for (const r of gifts) {
    const status = String(r.status);
    const label = status === "given" ? "Gift given" : status === "received" ? "Gift received" : "Gift idea";
    addEntry(String(r.created_at), "gift", personFromJoin(r), label, String(r.text));
  }

  const datesAdded = db
    .prepare(
      `SELECT d.*, p.first_name, p.last_name, p.email, p.company, p.circle, p.photo
       FROM important_dates d JOIN people p ON p.id = d.person_id ${personWhere}
       ORDER BY d.created_at DESC`,
    )
    .all(...personParams) as Row[];
  for (const r of datesAdded) {
    const kindLabel = String(r.kind).replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const detail = r.label != null ? String(r.label) : `${kindLabel} · ${r.month}/${r.day}`;
    addEntry(String(r.created_at), "important_date", personFromJoin(r), "Added an important date", detail);
  }

  if (personId) {
    const me = personSummary(personId);
    if (me) {
      const relations = db
        .prepare(
          `SELECT c.*, p.id AS _pid, p.first_name, p.last_name, p.email, p.company, p.circle, p.photo
           FROM connections c
           JOIN people p ON p.id = CASE WHEN c.person_a_id = ? THEN c.person_b_id ELSE c.person_a_id END
           WHERE c.person_a_id = ? OR c.person_b_id = ?
           ORDER BY c.created_at DESC`,
        )
        .all(personId, personId, personId) as Row[];
      for (const r of relations) {
        const other = { ...summaryFromRow(r), id: Number(r._pid) };
        addEntry(String(r.created_at), "connection", me, "Added a connection", `${other.firstName} ${other.lastName ?? ""}`.trim());
      }
    }
  } else {
    const relations = db
      .prepare(
        `SELECT c.*, pa.id AS _pid, pa.first_name, pa.last_name, pa.email, pa.company, pa.circle, pa.photo,
                pb.first_name AS b_fn, pb.last_name AS b_ln
         FROM connections c
         JOIN people pa ON pa.id = c.person_a_id
         JOIN people pb ON pb.id = c.person_b_id
         ORDER BY c.created_at DESC`,
      )
      .all() as Row[];
    for (const r of relations) {
      addEntry(String(r.created_at), "connection", { ...summaryFromRow(r), id: Number(r._pid) }, "Added a connection",
        `${String(r.label)} · ${String(r.b_fn)} ${r.b_ln != null ? String(r.b_ln) : ""}`.trim());
    }
  }

  const addedPeople = personId
    ? (db.prepare(`${personSelect()} WHERE id = ?`).all(personId) as Row[])
    : (db.prepare(personSelect()).all() as Row[]);
  for (const r of addedPeople) {
    const detail = r.job_title != null ? String(r.job_title) : r.company != null ? String(r.company) : "";
    addEntry(String(r.created_at), "person_added", summaryFromRow(r), "Added a person", detail || null);
  }

  const filtered = type
    ? entries.filter((e) => e.type === type)
    : entries;
  filtered.sort((a, b) => b.date.localeCompare(a.date));
  return filtered;
}
