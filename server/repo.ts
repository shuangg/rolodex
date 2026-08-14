import { randomUUID } from "node:crypto";
import { format, parseISO, subMonths } from "date-fns";
import { getDb } from "./db.ts";
import { checkInStatus, daysUntilDue, dueDateFor } from "../shared/checkin.ts";
import { displayLabel } from "../shared/connections.ts";
import { daysUntilNext, isMilestoneAge, nextOccurrence } from "../shared/dates.ts";
import type {
  Circle,
  Connection,
  ConnectionType,
  ConnectionView,
  DateType,
  Fact,
  Gift,
  GiftStatus,
  ImportantDate,
  Interaction,
  InteractionType,
  NewsItem,
  Person,
  PersonInput,
  PersonListItem,
  Reminder,
  TimelineItem,
  TimelineKind,
} from "../shared/types.ts";

function nowIso(): string {
  return new Date().toISOString();
}

function emptyToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
}

function rowTags(personId: string): string[] {
  const rows = getDb()
    .prepare("SELECT tag FROM tags WHERE person_id = ? ORDER BY tag")
    .all(personId) as { tag: string }[];
  return rows.map((r) => r.tag);
}

function replaceTags(personId: string, tags: string[] | undefined): void {
  const db = getDb();
  db.prepare("DELETE FROM tags WHERE person_id = ?").run(personId);
  if (!tags) return;
  const insert = db.prepare("INSERT INTO tags (person_id, tag) VALUES (?, ?)");
  const seen = new Set<string>();
  for (const raw of tags) {
    const tag = raw.trim().toLowerCase();
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    insert.run(personId, tag);
  }
}

interface PersonRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  company: string | null;
  city: string | null;
  timezone: string | null;
  circle: Circle;
  cadence_override_days: number | null;
  checkins_enabled: number;
  snooze_until: string | null;
  how_met: string | null;
  where_met: string | null;
  when_met: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  has_photo?: number;
  last_contacted?: string | null;
  latest_news?: string | null;
}

function mapPerson(row: PersonRow, tags: string[]): Person {
  return {
    id: row.id,
    name: row.name,
    hasPhoto: Boolean(row.has_photo),
    email: row.email,
    phone: row.phone,
    jobTitle: row.job_title,
    company: row.company,
    city: row.city,
    timezone: row.timezone,
    circle: row.circle,
    cadenceOverrideDays: row.cadence_override_days,
    checkinsEnabled: Boolean(row.checkins_enabled),
    snoozeUntil: row.snooze_until,
    howMet: row.how_met,
    whereMet: row.where_met,
    whenMet: row.when_met,
    notes: row.notes,
    tags,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function withStatus(person: Person, lastContacted: string | null, latestNews: string | null): PersonListItem {
  return {
    ...person,
    lastContacted,
    latestNews,
    checkInStatus: checkInStatus(person, lastContacted),
    dueOn: dueDateFor(person, lastContacted),
    daysUntilDue: daysUntilDue(person, lastContacted),
  };
}

const PERSON_SELECT = `
  SELECT id, name, email, phone, job_title, company, city, timezone,
    circle, cadence_override_days, checkins_enabled, snooze_until,
    how_met, where_met, when_met, notes, created_at, updated_at,
    (photo IS NOT NULL) AS has_photo,
    (SELECT MAX(date) FROM interactions i WHERE i.person_id = people.id) AS last_contacted,
    (SELECT content FROM news n WHERE n.person_id = people.id ORDER BY n.date DESC, n.created_at DESC LIMIT 1) AS latest_news
  FROM people
`;

export function createPerson(input: PersonInput): PersonListItem {
  const id = randomUUID();
  const ts = nowIso();
  getDb()
    .prepare(
      `INSERT INTO people (
        id, name, email, phone, job_title, company, city, timezone, circle,
        cadence_override_days, checkins_enabled, snooze_until, how_met, where_met, when_met,
        notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.name.trim(),
      emptyToNull(input.email),
      emptyToNull(input.phone),
      emptyToNull(input.jobTitle),
      emptyToNull(input.company),
      emptyToNull(input.city),
      emptyToNull(input.timezone),
      input.circle,
      input.cadenceOverrideDays ?? null,
      input.checkinsEnabled === false ? 0 : 1,
      emptyToNull(input.snoozeUntil),
      emptyToNull(input.howMet),
      emptyToNull(input.whereMet),
      emptyToNull(input.whenMet),
      emptyToNull(input.notes),
      ts,
      ts,
    );
  replaceTags(id, input.tags);
  return getPerson(id)!;
}

export function getPerson(id: string): PersonListItem | null {
  const row = getDb().prepare(`${PERSON_SELECT} WHERE id = ?`).get(id) as PersonRow | undefined;
  if (!row) return null;
  return withStatus(mapPerson(row, rowTags(id)), row.last_contacted ?? null, row.latest_news ?? null);
}

export function updatePerson(id: string, input: Partial<PersonInput>): PersonListItem {
  const current = getPerson(id);
  if (!current) throw Object.assign(new Error("Person not found"), { status: 404 });
  const next = {
    name: input.name ?? current.name,
    email: input.email === undefined ? current.email : input.email,
    phone: input.phone === undefined ? current.phone : input.phone,
    jobTitle: input.jobTitle === undefined ? current.jobTitle : input.jobTitle,
    company: input.company === undefined ? current.company : input.company,
    city: input.city === undefined ? current.city : input.city,
    timezone: input.timezone === undefined ? current.timezone : input.timezone,
    circle: input.circle ?? current.circle,
    cadenceOverrideDays:
      input.cadenceOverrideDays === undefined ? current.cadenceOverrideDays : input.cadenceOverrideDays,
    checkinsEnabled: input.checkinsEnabled === undefined ? current.checkinsEnabled : input.checkinsEnabled,
    snoozeUntil: input.snoozeUntil === undefined ? current.snoozeUntil : input.snoozeUntil,
    howMet: input.howMet === undefined ? current.howMet : input.howMet,
    whereMet: input.whereMet === undefined ? current.whereMet : input.whereMet,
    whenMet: input.whenMet === undefined ? current.whenMet : input.whenMet,
    notes: input.notes === undefined ? current.notes : input.notes,
  };
  getDb()
    .prepare(
      `UPDATE people SET name=?, email=?, phone=?, job_title=?, company=?, city=?, timezone=?,
        circle=?, cadence_override_days=?, checkins_enabled=?, snooze_until=?, how_met=?,
        where_met=?, when_met=?, notes=?, updated_at=? WHERE id=?`,
    )
    .run(
      next.name.trim(),
      emptyToNull(next.email),
      emptyToNull(next.phone),
      emptyToNull(next.jobTitle),
      emptyToNull(next.company),
      emptyToNull(next.city),
      emptyToNull(next.timezone),
      next.circle,
      next.cadenceOverrideDays,
      next.checkinsEnabled ? 1 : 0,
      emptyToNull(next.snoozeUntil),
      emptyToNull(next.howMet),
      emptyToNull(next.whereMet),
      emptyToNull(next.whenMet),
      emptyToNull(next.notes),
      nowIso(),
      id,
    );
  if (input.tags) replaceTags(id, input.tags);
  return getPerson(id)!;
}

export function deletePerson(id: string): void {
  const result = getDb().prepare("DELETE FROM people WHERE id = ?").run(id);
  if (result.changes === 0) throw Object.assign(new Error("Person not found"), { status: 404 });
}

export function listPeople(filters: { search?: string; circle?: Circle; tag?: string } = {}): PersonListItem[] {
  const clauses: string[] = [];
  const params: (string | number)[] = [];
  if (filters.search?.trim()) {
    const q = `%${filters.search.trim().toLowerCase()}%`;
    clauses.push(
      "(lower(name) LIKE ? OR lower(IFNULL(company,'')) LIKE ? OR lower(IFNULL(email,'')) LIKE ?)",
    );
    params.push(q, q, q);
  }
  if (filters.circle) {
    clauses.push("circle = ?");
    params.push(filters.circle);
  }
  if (filters.tag) {
    clauses.push("id IN (SELECT person_id FROM tags WHERE tag = ?)");
    params.push(filters.tag.trim().toLowerCase());
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = getDb().prepare(`${PERSON_SELECT} ${where} ORDER BY name COLLATE NOCASE`).all(...params) as unknown as PersonRow[];
  return rows.map((row) =>
    withStatus(mapPerson(row, rowTags(row.id)), row.last_contacted ?? null, row.latest_news ?? null),
  );
}

export function listTags(): string[] {
  const rows = getDb().prepare("SELECT DISTINCT tag FROM tags ORDER BY tag").all() as { tag: string }[];
  return rows.map((r) => r.tag);
}

export function setPhoto(personId: string, data: Uint8Array, mime: string): void {
  if (!getPerson(personId)) throw Object.assign(new Error("Person not found"), { status: 404 });
  getDb()
    .prepare("UPDATE people SET photo = ?, photo_mime = ?, updated_at = ? WHERE id = ?")
    .run(data, mime, nowIso(), personId);
}

export function getPhoto(personId: string): { data: Uint8Array; mime: string } | null {
  const row = getDb().prepare("SELECT photo, photo_mime FROM people WHERE id = ?").get(personId) as
    | { photo: Uint8Array | null; photo_mime: string | null }
    | undefined;
  if (!row?.photo) return null;
  return { data: row.photo, mime: row.photo_mime || "image/png" };
}

export function createInteraction(input: {
  personId: string;
  type: InteractionType;
  date: string;
  notes?: string | null;
}): Interaction {
  if (!getPerson(input.personId)) throw Object.assign(new Error("Person not found"), { status: 404 });
  const id = randomUUID();
  const createdAt = nowIso();
  getDb()
    .prepare("INSERT INTO interactions (id, person_id, type, date, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(id, input.personId, input.type, input.date, emptyToNull(input.notes), createdAt);
  return getInteraction(id)!;
}

export function getInteraction(id: string): Interaction | null {
  const row = getDb().prepare("SELECT * FROM interactions WHERE id = ?").get(id) as
    | {
        id: string;
        person_id: string;
        type: InteractionType;
        date: string;
        notes: string | null;
        created_at: string;
      }
    | undefined;
  if (!row) return null;
  return {
    id: row.id,
    personId: row.person_id,
    type: row.type,
    date: row.date,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export function updateInteraction(
  id: string,
  input: Partial<{ type: InteractionType; date: string; notes: string | null }>,
): Interaction {
  const current = getInteraction(id);
  if (!current) throw Object.assign(new Error("Interaction not found"), { status: 404 });
  getDb()
    .prepare("UPDATE interactions SET type=?, date=?, notes=? WHERE id=?")
    .run(input.type ?? current.type, input.date ?? current.date, input.notes === undefined ? current.notes : emptyToNull(input.notes), id);
  return getInteraction(id)!;
}

export function deleteInteraction(id: string): void {
  const result = getDb().prepare("DELETE FROM interactions WHERE id = ?").run(id);
  if (result.changes === 0) throw Object.assign(new Error("Interaction not found"), { status: 404 });
}

export function listInteractions(personId?: string): Interaction[] {
  const rows = (
    personId
      ? getDb().prepare("SELECT * FROM interactions WHERE person_id = ? ORDER BY date DESC, created_at DESC").all(personId)
      : getDb().prepare("SELECT * FROM interactions ORDER BY date DESC, created_at DESC").all()
  ) as {
    id: string;
    person_id: string;
    type: InteractionType;
    date: string;
    notes: string | null;
    created_at: string;
  }[];
  return rows.map((row) => ({
    id: row.id,
    personId: row.person_id,
    type: row.type,
    date: row.date,
    notes: row.notes,
    createdAt: row.created_at,
  }));
}

export function createFact(input: { personId: string; content: string }): Fact {
  if (!getPerson(input.personId)) throw Object.assign(new Error("Person not found"), { status: 404 });
  const id = randomUUID();
  getDb().prepare("INSERT INTO facts (id, person_id, content) VALUES (?, ?, ?)").run(id, input.personId, input.content.trim());
  return getFact(id)!;
}

export function getFact(id: string): Fact | null {
  const row = getDb().prepare("SELECT * FROM facts WHERE id = ?").get(id) as
    | { id: string; person_id: string; content: string }
    | undefined;
  if (!row) return null;
  return { id: row.id, personId: row.person_id, content: row.content };
}

export function updateFact(id: string, input: { content: string }): Fact {
  if (!getFact(id)) throw Object.assign(new Error("Fact not found"), { status: 404 });
  getDb().prepare("UPDATE facts SET content = ? WHERE id = ?").run(input.content.trim(), id);
  return getFact(id)!;
}

export function deleteFact(id: string): void {
  const result = getDb().prepare("DELETE FROM facts WHERE id = ?").run(id);
  if (result.changes === 0) throw Object.assign(new Error("Fact not found"), { status: 404 });
}

export function listFacts(personId?: string): Fact[] {
  const rows = (
    personId
      ? getDb().prepare("SELECT * FROM facts WHERE person_id = ?").all(personId)
      : getDb().prepare("SELECT * FROM facts").all()
  ) as { id: string; person_id: string; content: string }[];
  return rows.map((row) => ({ id: row.id, personId: row.person_id, content: row.content }));
}

export function createNews(input: { personId: string; content: string; date: string }): NewsItem {
  if (!getPerson(input.personId)) throw Object.assign(new Error("Person not found"), { status: 404 });
  const id = randomUUID();
  const createdAt = nowIso();
  getDb()
    .prepare("INSERT INTO news (id, person_id, content, date, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(id, input.personId, input.content.trim(), input.date, createdAt);
  return getNews(id)!;
}

export function getNews(id: string): NewsItem | null {
  const row = getDb().prepare("SELECT * FROM news WHERE id = ?").get(id) as
    | { id: string; person_id: string; content: string; date: string; created_at: string }
    | undefined;
  if (!row) return null;
  return { id: row.id, personId: row.person_id, content: row.content, date: row.date, createdAt: row.created_at };
}

export function updateNews(id: string, input: Partial<{ content: string; date: string }>): NewsItem {
  const current = getNews(id);
  if (!current) throw Object.assign(new Error("News not found"), { status: 404 });
  getDb()
    .prepare("UPDATE news SET content=?, date=? WHERE id=?")
    .run(input.content?.trim() ?? current.content, input.date ?? current.date, id);
  return getNews(id)!;
}

export function deleteNews(id: string): void {
  const result = getDb().prepare("DELETE FROM news WHERE id = ?").run(id);
  if (result.changes === 0) throw Object.assign(new Error("News not found"), { status: 404 });
}

export function listNews(personId?: string): NewsItem[] {
  const rows = (
    personId
      ? getDb().prepare("SELECT * FROM news WHERE person_id = ? ORDER BY date DESC, created_at DESC").all(personId)
      : getDb().prepare("SELECT * FROM news ORDER BY date DESC, created_at DESC").all()
  ) as { id: string; person_id: string; content: string; date: string; created_at: string }[];
  return rows.map((row) => ({
    id: row.id,
    personId: row.person_id,
    content: row.content,
    date: row.date,
    createdAt: row.created_at,
  }));
}

export function createImportantDate(input: {
  personId: string;
  type: DateType;
  label?: string | null;
  month: number;
  day: number;
  year?: number | null;
}): ImportantDate {
  if (!getPerson(input.personId)) throw Object.assign(new Error("Person not found"), { status: 404 });
  const id = randomUUID();
  getDb()
    .prepare("INSERT INTO important_dates (id, person_id, type, label, month, day, year) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(id, input.personId, input.type, emptyToNull(input.label), input.month, input.day, input.year ?? null);
  return getImportantDate(id)!;
}

export function getImportantDate(id: string): ImportantDate | null {
  const row = getDb().prepare("SELECT * FROM important_dates WHERE id = ?").get(id) as
    | { id: string; person_id: string; type: DateType; label: string | null; month: number; day: number; year: number | null }
    | undefined;
  if (!row) return null;
  return {
    id: row.id,
    personId: row.person_id,
    type: row.type,
    label: row.label,
    month: row.month,
    day: row.day,
    year: row.year,
  };
}

export function updateImportantDate(
  id: string,
  input: Partial<{ type: DateType; label: string | null; month: number; day: number; year: number | null }>,
): ImportantDate {
  const current = getImportantDate(id);
  if (!current) throw Object.assign(new Error("Date not found"), { status: 404 });
  getDb()
    .prepare("UPDATE important_dates SET type=?, label=?, month=?, day=?, year=? WHERE id=?")
    .run(
      input.type ?? current.type,
      input.label === undefined ? current.label : emptyToNull(input.label),
      input.month ?? current.month,
      input.day ?? current.day,
      input.year === undefined ? current.year : input.year,
      id,
    );
  return getImportantDate(id)!;
}

export function deleteImportantDate(id: string): void {
  const result = getDb().prepare("DELETE FROM important_dates WHERE id = ?").run(id);
  if (result.changes === 0) throw Object.assign(new Error("Date not found"), { status: 404 });
}

export function listImportantDates(personId?: string): ImportantDate[] {
  const rows = (
    personId
      ? getDb().prepare("SELECT * FROM important_dates WHERE person_id = ?").all(personId)
      : getDb().prepare("SELECT * FROM important_dates").all()
  ) as {
    id: string;
    person_id: string;
    type: DateType;
    label: string | null;
    month: number;
    day: number;
    year: number | null;
  }[];
  return rows.map((row) => ({
    id: row.id,
    personId: row.person_id,
    type: row.type,
    label: row.label,
    month: row.month,
    day: row.day,
    year: row.year,
  }));
}

export function createReminder(input: { personId: string; content: string; dueDate: string; done?: boolean }): Reminder {
  if (!getPerson(input.personId)) throw Object.assign(new Error("Person not found"), { status: 404 });
  const id = randomUUID();
  const createdAt = nowIso();
  const done = Boolean(input.done);
  getDb()
    .prepare("INSERT INTO reminders (id, person_id, content, due_date, done, done_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(id, input.personId, input.content.trim(), input.dueDate, done ? 1 : 0, done ? createdAt : null, createdAt);
  return getReminder(id)!;
}

export function getReminder(id: string): Reminder | null {
  const row = getDb().prepare("SELECT * FROM reminders WHERE id = ?").get(id) as
    | {
        id: string;
        person_id: string;
        content: string;
        due_date: string;
        done: number;
        done_at: string | null;
        created_at: string;
      }
    | undefined;
  if (!row) return null;
  return {
    id: row.id,
    personId: row.person_id,
    content: row.content,
    dueDate: row.due_date,
    done: Boolean(row.done),
    doneAt: row.done_at,
    createdAt: row.created_at,
  };
}

export function updateReminder(
  id: string,
  input: Partial<{ content: string; dueDate: string; done: boolean }>,
): Reminder {
  const current = getReminder(id);
  if (!current) throw Object.assign(new Error("Reminder not found"), { status: 404 });
  const done = input.done === undefined ? current.done : input.done;
  const doneAt = done ? current.doneAt ?? nowIso() : null;
  getDb()
    .prepare("UPDATE reminders SET content=?, due_date=?, done=?, done_at=? WHERE id=?")
    .run(
      input.content?.trim() ?? current.content,
      input.dueDate ?? current.dueDate,
      done ? 1 : 0,
      doneAt,
      id,
    );
  return getReminder(id)!;
}

export function deleteReminder(id: string): void {
  const result = getDb().prepare("DELETE FROM reminders WHERE id = ?").run(id);
  if (result.changes === 0) throw Object.assign(new Error("Reminder not found"), { status: 404 });
}

export function listReminders(personId?: string): Reminder[] {
  const rows = (
    personId
      ? getDb().prepare("SELECT * FROM reminders WHERE person_id = ? ORDER BY due_date").all(personId)
      : getDb().prepare("SELECT * FROM reminders ORDER BY due_date").all()
  ) as {
    id: string;
    person_id: string;
    content: string;
    due_date: string;
    done: number;
    done_at: string | null;
    created_at: string;
  }[];
  return rows.map((row) => ({
    id: row.id,
    personId: row.person_id,
    content: row.content,
    dueDate: row.due_date,
    done: Boolean(row.done),
    doneAt: row.done_at,
    createdAt: row.created_at,
  }));
}

export function createGift(input: {
  personId: string;
  description: string;
  status: GiftStatus;
  occasion?: string | null;
  date?: string | null;
}): Gift {
  if (!getPerson(input.personId)) throw Object.assign(new Error("Person not found"), { status: 404 });
  const id = randomUUID();
  getDb()
    .prepare("INSERT INTO gifts (id, person_id, description, status, occasion, date) VALUES (?, ?, ?, ?, ?, ?)")
    .run(id, input.personId, input.description.trim(), input.status, emptyToNull(input.occasion), emptyToNull(input.date));
  return getGift(id)!;
}

export function getGift(id: string): Gift | null {
  const row = getDb().prepare("SELECT * FROM gifts WHERE id = ?").get(id) as
    | { id: string; person_id: string; description: string; status: GiftStatus; occasion: string | null; date: string | null }
    | undefined;
  if (!row) return null;
  return {
    id: row.id,
    personId: row.person_id,
    description: row.description,
    status: row.status,
    occasion: row.occasion,
    date: row.date,
  };
}

export function updateGift(
  id: string,
  input: Partial<{ description: string; status: GiftStatus; occasion: string | null; date: string | null }>,
): Gift {
  const current = getGift(id);
  if (!current) throw Object.assign(new Error("Gift not found"), { status: 404 });
  getDb()
    .prepare("UPDATE gifts SET description=?, status=?, occasion=?, date=? WHERE id=?")
    .run(
      input.description?.trim() ?? current.description,
      input.status ?? current.status,
      input.occasion === undefined ? current.occasion : emptyToNull(input.occasion),
      input.date === undefined ? current.date : emptyToNull(input.date),
      id,
    );
  return getGift(id)!;
}

export function deleteGift(id: string): void {
  const result = getDb().prepare("DELETE FROM gifts WHERE id = ?").run(id);
  if (result.changes === 0) throw Object.assign(new Error("Gift not found"), { status: 404 });
}

export function listGifts(personId?: string): Gift[] {
  const rows = (
    personId
      ? getDb().prepare("SELECT * FROM gifts WHERE person_id = ?").all(personId)
      : getDb().prepare("SELECT * FROM gifts").all()
  ) as {
    id: string;
    person_id: string;
    description: string;
    status: GiftStatus;
    occasion: string | null;
    date: string | null;
  }[];
  return rows.map((row) => ({
    id: row.id,
    personId: row.person_id,
    description: row.description,
    status: row.status,
    occasion: row.occasion,
    date: row.date,
  }));
}

export function createConnection(input: {
  fromPersonId: string;
  toPersonId: string;
  type: ConnectionType;
  label?: string | null;
}): Connection {
  if (input.fromPersonId === input.toPersonId) throw Object.assign(new Error("Cannot connect a person to themselves"), { status: 400 });
  if (!getPerson(input.fromPersonId) || !getPerson(input.toPersonId)) {
    throw Object.assign(new Error("Person not found"), { status: 404 });
  }
  const id = randomUUID();
  getDb()
    .prepare("INSERT INTO connections (id, from_person_id, to_person_id, type, label) VALUES (?, ?, ?, ?, ?)")
    .run(id, input.fromPersonId, input.toPersonId, input.type, emptyToNull(input.label));
  return getConnection(id)!;
}

export function getConnection(id: string): Connection | null {
  const row = getDb().prepare("SELECT * FROM connections WHERE id = ?").get(id) as
    | { id: string; from_person_id: string; to_person_id: string; type: ConnectionType; label: string | null }
    | undefined;
  if (!row) return null;
  return {
    id: row.id,
    fromPersonId: row.from_person_id,
    toPersonId: row.to_person_id,
    type: row.type,
    label: row.label,
  };
}

export function deleteConnection(id: string): void {
  const result = getDb().prepare("DELETE FROM connections WHERE id = ?").run(id);
  if (result.changes === 0) throw Object.assign(new Error("Connection not found"), { status: 404 });
}

export function listConnectionsFor(personId: string): ConnectionView[] {
  const rows = getDb()
    .prepare("SELECT * FROM connections WHERE from_person_id = ? OR to_person_id = ?")
    .all(personId, personId) as {
    id: string;
    from_person_id: string;
    to_person_id: string;
    type: ConnectionType;
    label: string | null;
  }[];
  return rows.map((row) => {
    const viewerIsFrom = row.from_person_id === personId;
    const otherId = viewerIsFrom ? row.to_person_id : row.from_person_id;
    const other = getPerson(otherId);
    return {
      id: row.id,
      personId: otherId,
      personName: other?.name ?? "Unknown",
      hasPhoto: other?.hasPhoto ?? false,
      type: row.type,
      label: row.label,
      displayType: displayLabel(row.type, viewerIsFrom),
    };
  });
}

export function listAllConnections(): Connection[] {
  const rows = getDb().prepare("SELECT * FROM connections").all() as {
    id: string;
    from_person_id: string;
    to_person_id: string;
    type: ConnectionType;
    label: string | null;
  }[];
  return rows.map((row) => ({
    id: row.id,
    fromPersonId: row.from_person_id,
    toPersonId: row.to_person_id,
    type: row.type,
    label: row.label,
  }));
}

export interface PersonDetail {
  person: PersonListItem;
  interactions: Interaction[];
  facts: Fact[];
  news: NewsItem[];
  importantDates: ImportantDate[];
  reminders: Reminder[];
  gifts: Gift[];
  connections: ConnectionView[];
}

export function getPersonDetail(id: string): PersonDetail | null {
  const person = getPerson(id);
  if (!person) return null;
  return {
    person,
    interactions: listInteractions(id),
    facts: listFacts(id),
    news: listNews(id),
    importantDates: listImportantDates(id),
    reminders: listReminders(id),
    gifts: listGifts(id),
    connections: listConnectionsFor(id),
  };
}

export function listTimeline(filters: { personId?: string; type?: TimelineKind } = {}): TimelineItem[] {
  const people = new Map(listPeople().map((p) => [p.id, p]));
  const items: TimelineItem[] = [];
  if (!filters.type || filters.type === "interaction") {
    for (const item of listInteractions(filters.personId)) {
      const person = people.get(item.personId);
      if (!person) continue;
      items.push({
        id: `interaction:${item.id}`,
        kind: "interaction",
        date: item.date,
        personId: person.id,
        personName: person.name,
        hasPhoto: person.hasPhoto,
        title: item.type,
        detail: item.notes,
      });
    }
  }
  if (!filters.type || filters.type === "news") {
    for (const item of listNews(filters.personId)) {
      const person = people.get(item.personId);
      if (!person) continue;
      items.push({
        id: `news:${item.id}`,
        kind: "news",
        date: item.date,
        personId: person.id,
        personName: person.name,
        hasPhoto: person.hasPhoto,
        title: "News",
        detail: item.content,
      });
    }
  }
  if (!filters.type || filters.type === "reminder") {
    for (const item of listReminders(filters.personId)) {
      if (!item.done || !item.doneAt) continue;
      const person = people.get(item.personId);
      if (!person) continue;
      items.push({
        id: `reminder:${item.id}`,
        kind: "reminder",
        date: item.doneAt.slice(0, 10),
        personId: person.id,
        personName: person.name,
        hasPhoto: person.hasPhoto,
        title: "Reminder completed",
        detail: item.content,
      });
    }
  }
  items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return items;
}

export function getToday() {
  const people = listPeople();
  const contact = people
    .filter((p) => p.checkInStatus === "overdue" || p.checkInStatus === "due_soon")
    .sort((a, b) => (a.daysUntilDue ?? 9999) - (b.daysUntilDue ?? 9999));
  const dates = listImportantDates()
    .map((d) => {
      const person = people.find((p) => p.id === d.personId);
      if (!person) return null;
      const days = daysUntilNext(d.month, d.day);
      if (days > 30) return null;
      const next = format(nextOccurrence(d.month, d.day), "yyyy-MM-dd");
      const age = d.year != null ? parseISO(next).getFullYear() - d.year : null;
      return {
        ...d,
        personId: person.id,
        personName: person.name,
        hasPhoto: person.hasPhoto,
        next,
        days,
        age,
        milestone: age != null && isMilestoneAge(age),
      };
    })
    .filter((d) => d != null)
    .sort((a, b) => a.days - b.days);
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const reminders = listReminders()
    .filter((r) => !r.done && r.dueDate <= todayStr)
    .map((r) => {
      const person = people.find((p) => p.id === r.personId);
      return { ...r, personName: person?.name ?? "", hasPhoto: person?.hasPhoto ?? false };
    })
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const activity = listTimeline().slice(0, 12);
  const months: { month: string; label: string; count: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = subMonths(new Date(), i);
    const key = format(d, "yyyy-MM");
    months.push({ month: key, label: format(d, "MMM"), count: 0 });
  }
  for (const item of listInteractions()) {
    const key = item.date.slice(0, 7);
    const bucket = months.find((m) => m.month === key);
    if (bucket) bucket.count += 1;
  }
  const peopleByCircle = (["inner", "close", "wider", "distant"] as Circle[]).map((circle) => {
    const group = people.filter((p) => p.circle === circle);
    return {
      circle,
      total: group.length,
      overdue: group.filter((p) => p.checkInStatus === "overdue").length,
    };
  });
  return { contact, dates, reminders, activity, charts: { interactionsByMonth: months, peopleByCircle } };
}

export function countPeople(): number {
  const row = getDb().prepare("SELECT COUNT(*) AS n FROM people").get() as { n: number };
  return row.n;
}
