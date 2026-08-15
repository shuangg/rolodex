import { Router } from "express";
import multer from "multer";
import { getDb } from "./db";
import {
  buildTimeline,
  createConnection,
  createFact,
  createGift,
  createImportantDate,
  createInteraction,
  createNews,
  createPerson,
  createReminder,
  deleteConnection,
  deleteFact,
  deleteGift,
  deleteImportantDate,
  deleteInteraction,
  deleteNews,
  deletePerson,
  deleteReminder,
  getPersonPhoto,
  getPersonWithMeta,
  listAllDates,
  listConnections,
  listFacts,
  listGifts,
  listImportantDates,
  listInteractions,
  listNews,
  listOpenReminders,
  listPeopleWithMeta,
  listReminders,
  setPersonPhoto,
  toggleReminder,
  updateGiftStatus,
  updateImportantDate,
  updateInteraction,
  updatePerson,
  type NewPerson,
} from "./store";
import {
  annotateRows,
  importRows,
  parseCsv,
  parseVcf,
  rowFromMapping,
  suggestMapping,
  type ParsedRow,
} from "./import";
import type { FieldMapping } from "../src/types";
import { CIRCLE_CADENCE_DAYS, dueOrdering, isDue } from "../src/lib/cadence";
import { upcomingDatesFor } from "../src/lib/recurring";
import { subMonths } from "date-fns";
import type { Circle, TimelineEntryType } from "../src/types";

export const api = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

function parseCircle(v: unknown): Circle {
  const c = String(v ?? "wider");
  return c === "inner" || c === "close" || c === "wider" || c === "distant" ? c : "wider";
}

// ---- People ---------------------------------------------------------------

api.get("/people", (_req, res) => {
  const people = listPeopleWithMeta().map((p) => ({ ...p, hasPhoto: p.hasPhoto }));
  res.json(people);
});

api.get("/people/:id", (req, res) => {
  const id = Number(req.params.id);
  const person = getPersonWithMeta(id);
  if (!person) return res.status(404).json({ error: "Not found" });
  res.json({
    ...person,
    dates: listImportantDates(id),
    interactions: listInteractions(id),
    facts: listFacts(id),
    news: listNews(id),
    reminders: listReminders(id),
    connections: listConnections(id),
    gifts: listGifts(id),
    timeline: buildTimeline(id),
  });
});

api.post("/people", (req, res) => {
  const body = req.body as Partial<NewPerson>;
  const person = createPerson({
    ...body,
    circle: body.circle ?? parseCircle(body.circle),
    tags: Array.isArray(body.tags) ? body.tags : [],
  });
  res.status(201).json(getPersonWithMeta(person.id));
});

api.put("/people/:id", (req, res) => {
  const id = Number(req.params.id);
  const body = req.body as Partial<NewPerson>;
  const person = updatePerson(id, {
    ...body,
    tags: Array.isArray(body.tags) ? body.tags : undefined,
  });
  if (!person) return res.status(404).json({ error: "Not found" });
  res.json(getPersonWithMeta(person.id));
});

api.delete("/people/:id", (req, res) => {
  const ok = deletePerson(Number(req.params.id));
  if (!ok) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

api.post("/people/:id/photo", upload.single("photo"), (req, res) => {
  const id = Number(req.params.id);
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const mime = req.file.mimetype || "application/octet-stream";
  if (!/^image\/(png|jpe?g|webp|gif|svg\+xml)$/.test(mime)) {
    return res.status(400).json({ error: "Unsupported image type" });
  }
  setPersonPhoto(id, req.file.buffer, mime);
  res.json({ ok: true, hasPhoto: true });
});

api.delete("/people/:id/photo", (req, res) => {
  const db = getDb();
  db.prepare("UPDATE people SET photo = NULL, photo_mime = NULL WHERE id = ?").run(Number(req.params.id));
  res.json({ ok: true, hasPhoto: false });
});

api.get("/people/:id/photo", (req, res) => {
  const photo = getPersonPhoto(Number(req.params.id));
  if (!photo) return res.status(404).end();
  res.setHeader("Content-Type", photo.mime);
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.send(photo.data);
});

// ---- Interactions ---------------------------------------------------------

api.post("/interactions", (req, res) => {
  const { personId, type, occurredOn, notes } = req.body as {
    personId: number;
    type: "call" | "message" | "email" | "meetup" | "other";
    occurredOn: string;
    notes?: string | null;
  };
  if (!personId || !occurredOn || !type) {
    return res.status(400).json({ error: "personId, type and occurredOn are required" });
  }
  const interaction = createInteraction({ personId: Number(personId), type, occurredOn, notes });
  if (!interaction) return res.status(404).json({ error: "Person not found" });
  res.status(201).json({ interaction, person: getPersonWithMeta(Number(personId)) });
});

api.put("/interactions/:id", (req, res) => {
  const { type, occurredOn, notes } = req.body;
  const updated = updateInteraction(Number(req.params.id), { type, occurredOn, notes });
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json(updated);
});

api.delete("/interactions/:id", (req, res) => {
  if (!deleteInteraction(Number(req.params.id))) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

// ---- Important dates ------------------------------------------------------

api.get("/dates", (_req, res) => {
  res.json(listAllDates());
});

api.post("/people/:id/dates", (req, res) => {
  const { kind, label, month, day, year } = req.body as {
    kind: string;
    label?: string | null;
    month: number;
    day: number;
    year?: number | null;
  };
  const d = createImportantDate({
    personId: Number(req.params.id),
    kind: kind as "birthday",
    label,
    month: Number(month),
    day: Number(day),
    year: year != null ? Number(year) : null,
  });
  if (!d) return res.status(404).json({ error: "Person not found" });
  res.status(201).json(d);
});

api.put("/dates/:id", (req, res) => {
  const { kind, label, month, day, year } = req.body;
  const updated = updateImportantDate(Number(req.params.id), { kind, label, month, day, year });
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json(updated);
});

api.delete("/dates/:id", (req, res) => {
  if (!deleteImportantDate(Number(req.params.id))) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

// ---- Facts ----------------------------------------------------------------

api.post("/people/:id/facts", (req, res) => {
  const fact = createFact(Number(req.params.id), String(req.body.text ?? ""));
  if (!fact) return res.status(404).json({ error: "Person not found" });
  res.status(201).json(fact);
});

api.delete("/facts/:id", (req, res) => {
  if (!deleteFact(Number(req.params.id))) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

// ---- News -----------------------------------------------------------------

api.post("/people/:id/news", (req, res) => {
  const news = createNews(Number(req.params.id), String(req.body.text ?? ""), req.body.happenedOn ?? null);
  if (!news) return res.status(404).json({ error: "Person not found" });
  res.status(201).json(news);
});

api.delete("/news/:id", (req, res) => {
  if (!deleteNews(Number(req.params.id))) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

// ---- Reminders ------------------------------------------------------------

api.post("/people/:id/reminders", (req, res) => {
  const { title, dueOn } = req.body as { title: string; dueOn: string };
  const reminder = createReminder({ personId: Number(req.params.id), title, dueOn });
  if (!reminder) return res.status(404).json({ error: "Person not found" });
  res.status(201).json(reminder);
});

api.post("/reminders/:id/toggle", (req, res) => {
  const done = Boolean(req.body.done);
  const updated = toggleReminder(Number(req.params.id), done);
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json(updated);
});

api.delete("/reminders/:id", (req, res) => {
  if (!deleteReminder(Number(req.params.id))) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

// ---- Connections ----------------------------------------------------------

api.post("/connections", (req, res) => {
  const { personAId, personBId, label } = req.body as {
    personAId: number;
    personBId: number;
    label: string;
  };
  const connection = createConnection({ personAId: Number(personAId), personBId: Number(personBId), label: String(label) });
  if (!connection) return res.status(400).json({ error: "Invalid connection" });
  res.status(201).json(connection);
});

api.delete("/connections/:id", (req, res) => {
  if (!deleteConnection(Number(req.params.id))) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

// ---- Gifts ----------------------------------------------------------------

api.post("/people/:id/gifts", (req, res) => {
  const { text, status, occasion, date } = req.body as {
    text: string;
    status?: "idea" | "given" | "received";
    occasion?: string | null;
    date?: string | null;
  };
  const gift = createGift({ personId: Number(req.params.id), text, status, occasion, date });
  if (!gift) return res.status(404).json({ error: "Person not found" });
  res.status(201).json(gift);
});

api.put("/gifts/:id/status", (req, res) => {
  const updated = updateGiftStatus(Number(req.params.id), String(req.body.status) as "idea" | "given" | "received");
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json(updated);
});

api.delete("/gifts/:id", (req, res) => {
  if (!deleteGift(Number(req.params.id))) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

// ---- Timeline -------------------------------------------------------------

api.get("/timeline", (req, res) => {
  const personId = req.query.personId ? Number(req.query.personId) : undefined;
  const type = req.query.type ? String(req.query.type) : undefined;
  const validTypes: TimelineEntryType[] = [
    "interaction",
    "news",
    "reminder_done",
    "connection",
    "fact",
    "gift",
    "important_date",
    "person_added",
  ];
  const cleanType = type && validTypes.includes(type as TimelineEntryType) ? (type as TimelineEntryType) : undefined;
  res.json(buildTimeline(personId, cleanType));
});

// ---- Today ----------------------------------------------------------------

function last12Months(): { month: string; count: number }[] {
  const out: { month: string; count: number }[] = [];
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  for (let i = 11; i >= 0; i--) {
    const m = subMonths(start, i);
    out.push({ month: `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`, count: 0 });
  }
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT substr(occurred_on, 1, 7) AS month, COUNT(*) AS count
       FROM interactions
       WHERE occurred_on >= date('now', '-12 months', 'start of month')
       GROUP BY month`,
    )
    .all() as { month: string; count: number }[];
  const byMonth = new Map(rows.map((r) => [r.month, Number(r.count)]));
  return out.map((m) => ({ ...m, count: byMonth.get(m.month) ?? 0 }));
}

api.get("/today", (_req, res) => {
  const db = getDb();
  const all = listPeopleWithMeta();
  const due = all.filter(isDue).sort(dueOrdering);

  const today = new Date();
  const allDates = db
    .prepare(
      "SELECT id, person_id, kind, label, month, day, year, created_at FROM important_dates",
    )
    .all() as {
    id: number;
    person_id: number;
    kind: string;
    label: string | null;
    month: number;
    day: number;
    year: number | null;
    created_at: string;
  }[];
  const upcomingDates = upcomingDatesFor(
    allDates.map((d) => ({
      id: d.id,
      personId: d.person_id,
      kind: d.kind as "birthday",
      label: d.label,
      month: d.month,
      day: d.day,
      year: d.year,
      createdAt: d.created_at,
    })),
    today,
    30,
  ).map((u) => {
    const p = db
      .prepare("SELECT first_name, last_name FROM people WHERE id = ?")
      .get(u.personId) as { first_name: string; last_name: string | null } | undefined;
    return { ...u, personName: p ? `${p.first_name} ${p.last_name ?? ""}`.trim() : "Unknown" };
  });

  const openReminders = listOpenReminders();
  const todayStr = today.toISOString().slice(0, 10);
  const dueReminders = openReminders
    .filter((r) => r.dueOn <= todayStr)
    .map((r) => {
      const summary = db
        .prepare("SELECT id, first_name, last_name, email, company, circle, photo FROM people WHERE id = ?")
        .get(r.personId) as {
        id: number;
        first_name: string;
        last_name: string | null;
        email: string | null;
        company: string | null;
        circle: string;
        photo: unknown;
      };
      return {
        ...r,
        person: {
          id: summary.id,
          firstName: summary.first_name,
          lastName: summary.last_name,
          email: summary.email,
          company: summary.company,
          circle: summary.circle as Circle,
          hasPhoto: summary.photo != null,
        },
      };
    })
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn));

  const recentActivity = buildTimeline().slice(0, 15);

  const interactionsPerMonth = last12Months();

  const circleOverdue = (["inner", "close", "wider", "distant"] as Circle[]).map((circle) => {
    const inCircle = all.filter((p) => p.circle === circle);
    const overdue = inCircle.filter((p) => p.checkin.status === "overdue").length;
    return { circle, total: inCircle.length, overdue };
  });

  const upcomingCount = upcomingDates.length;
  const overdueReminders = dueReminders.length;
  res.json({
    duePeople: due,
    upcomingDates,
    reminders: dueReminders,
    recentActivity,
    interactionsPerMonth,
    circleOverdue,
    dueCount: due.length,
    upcomingCount,
    overdueReminders,
  });
});

// ---- Import ---------------------------------------------------------------

api.post("/import/csv", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const text = req.file.buffer.toString("utf8");
  const { columns, rows } = parseCsv(text);
  const suggested = suggestMapping(columns);
  const annotated = annotateRows(rows.map((r, i) => rowFromMapping(r, suggested, i)));
  res.json({ format: "csv", columns, suggestedMapping: suggested, rawRows: rows, rows: annotated });
});

api.post("/import/vcf", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const text = req.file.buffer.toString("utf8");
  const { rows } = parseVcf(text);
  const annotated = annotateRows(rows);
  res.json({ format: "vcf", columns: ["fn", "email", "tel", "org", "title", "note"], rows: annotated });
});

api.post("/import/commit", (req, res) => {
  const body = req.body as {
    format: "csv" | "vcf";
    mapping?: FieldMapping;
    rawRows?: Record<string, string>[];
    rows?: ParsedRow[];
    selectedRowIndexes?: number[];
    circle?: Circle;
  };
  const circle = parseCircle(body.circle);
  let parsed: ParsedRow[];
  if (body.format === "csv" && body.rawRows && body.mapping) {
    parsed = body.rawRows.map((r, i) => rowFromMapping(r, body.mapping!, i));
  } else if (body.format === "vcf" && body.rows) {
    parsed = body.rows;
  } else {
    return res.status(400).json({ error: "Invalid import payload" });
  }
  const selected = new Set(body.selectedRowIndexes ?? parsed.map((_, i) => i));
  const annotated = annotateRows(parsed).filter((_r, i) => selected.has(i));
  const result = importRows(annotated, circle);
  res.json(result);
});

api.post("/import/preview", (req, res) => {
  const body = req.body as { rows: ParsedRow[] };
  if (!Array.isArray(body.rows)) return res.status(400).json({ error: "rows required" });
  res.json({ rows: annotateRows(body.rows) });
});

api.get("/circles/cadences", (_req, res) => {
  res.json(CIRCLE_CADENCE_DAYS);
});
