import os from "node:os";
import path from "node:path";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

process.env.ROLODEX_DB = path.join(os.tmpdir(), `rolodex-test-${process.pid}.db`);

const { createApp } = await import("./app");
const { getDb, resetDb } = await import("./db");
const { seedIfEmpty } = await import("./seed");

const app = createApp();

beforeAll(() => {
  resetDb();
  seedIfEmpty(getDb());
});

beforeEach(() => {
  resetDb();
  seedIfEmpty(getDb());
});

afterAll(() => resetDb());

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function createPerson(body: Record<string, unknown> = {}) {
  return request(app).post("/api/people").send({
    firstName: "Testy",
    lastName: "McTest",
    circle: "inner",
    ...body,
  });
}

describe("people", () => {
  it("lists seeded people with checkin metadata", async () => {
    const res = await request(app).get("/api/people").expect(200);
    const people = res.body as any[];
    expect(people.length).toBeGreaterThanOrEqual(30);
    for (const p of people.slice(0, 5)) {
      expect(p.id).toBeGreaterThan(0);
      expect(p.firstName).toBeTruthy();
      expect(p.circle).toBeTruthy();
      expect(p.checkin).toBeTruthy();
      expect(["in_touch", "due_soon", "overdue"]).toContain(p.checkin.status);
    }
  });

  it("creates a person and assigns a default circle", async () => {
    const res = await createPerson({ circle: "close" }).expect(201);
    expect(res.body.id).toBeGreaterThan(0);
    expect(res.body.firstName).toBe("Testy");
    expect(res.body.circle).toBe("close");
    expect(res.body.tags).toEqual([]);
    const fresh = await request(app).get(`/api/people/${res.body.id}`).expect(200);
    expect(fresh.body.firstName).toBe("Testy");
  });

  it("updates a person", async () => {
    const { body: p } = await createPerson().expect(201);
    const res = await request(app)
      .put(`/api/people/${p.id}`)
      .send({ circle: "distant", jobTitle: "CTO", tags: ["work"] })
      .expect(200);
    expect(res.body.circle).toBe("distant");
    expect(res.body.jobTitle).toBe("CTO");
    expect(res.body.tags).toEqual(["work"]);
    expect(res.body.checkin.cadenceDays).toBe(365);
  });

  it("keeps a cadence override when the circle changes", async () => {
    const { body: p } = await createPerson({ cadenceOverrideDays: 60 }).expect(201);
    const res = await request(app).put(`/api/people/${p.id}`).send({ circle: "distant" }).expect(200);
    expect(res.body.checkin.cadenceDays).toBe(60);
  });

  it("deletes a person and cascades their data", async () => {
    const { body: p } = await createPerson().expect(201);
    await request(app)
      .post("/api/interactions")
      .send({ personId: p.id, type: "call", occurredOn: today() })
      .expect(201);
    await request(app).post(`/api/people/${p.id}/facts`).send({ text: "a fact" }).expect(201);
    await request(app).delete(`/api/people/${p.id}`).expect(200);
    await request(app).get(`/api/people/${p.id}`).expect(404);
    const db = getDb();
    const interactions = db.prepare("SELECT COUNT(*) AS c FROM interactions WHERE person_id = ?").get(p.id) as { c: number };
    const facts = db.prepare("SELECT COUNT(*) AS c FROM facts WHERE person_id = ?").get(p.id) as { c: number };
    expect(Number(interactions.c)).toBe(0);
    expect(Number(facts.c)).toBe(0);
  });

  it("updates checkin status based on interaction history", async () => {
    const { body: p } = await createPerson().expect(201);
    expect(p.checkin.status).toBe("overdue");
    await request(app)
      .post("/api/interactions")
      .send({ personId: p.id, type: "message", occurredOn: today() })
      .expect(201);
    const after = await request(app).get(`/api/people/${p.id}`).expect(200);
    expect(after.body.lastContacted).toBe(today());
    expect(after.body.checkin.status).toBe("in_touch");
    expect(after.body.checkin.dueDate > today()).toBe(true);
  });
});

describe("interactions", () => {
  it("rejects missing required fields", async () => {
    await request(app).post("/api/interactions").send({ personId: 1 }).expect(400);
  });

  it("edits and deletes an interaction", async () => {
    const { body: p } = await createPerson().expect(201);
    const { body } = await request(app)
      .post("/api/interactions")
      .send({ personId: p.id, type: "call", occurredOn: today(), notes: "initial" })
      .expect(201);
    expect(body.interaction.type).toBe("call");
    const updated = await request(app)
      .put(`/api/interactions/${body.interaction.id}`)
      .send({ notes: "follow-up" })
      .expect(200);
    expect(updated.body.notes).toBe("follow-up");
    await request(app).delete(`/api/interactions/${body.interaction.id}`).expect(200);
    const detail = await request(app).get(`/api/people/${p.id}`).expect(200);
    expect(detail.body.interactions).toEqual([]);
  });
});

describe("important dates", () => {
  it("creates, lists, updates and deletes a date", async () => {
    const { body: p } = await createPerson().expect(201);
    const created = await request(app)
      .post(`/api/people/${p.id}/dates`)
      .send({ kind: "birthday", month: 12, day: 25, year: 1990 })
      .expect(201);
    expect(created.body.id).toBeGreaterThan(0);

    const list = await request(app).get("/api/dates").expect(200);
    const mine = (list.body as any[]).filter((d) => d.date.id === created.body.id);
    expect(mine).toHaveLength(1);
    expect(mine[0].person).toMatchObject({ firstName: "Testy" });

    const updated = await request(app)
      .put(`/api/dates/${created.body.id}`)
      .send({ kind: "birthday", month: 1, day: 1, year: 1990 })
      .expect(200);
    expect(updated.body.month).toBe(1);

    await request(app).delete(`/api/dates/${created.body.id}`).expect(200);
    const after = await request(app).get("/api/dates").expect(200);
    expect((after.body as any[]).some((d) => d.date.id === created.body.id)).toBe(false);
  });
});

describe("facts, news, reminders", () => {
  it("manages facts", async () => {
    const { body: p } = await createPerson().expect(201);
    const f = await request(app).post(`/api/people/${p.id}/facts`).send({ text: "loves jazz" }).expect(201);
    expect(f.body.text).toBe("loves jazz");
    await request(app).delete(`/api/facts/${f.body.id}`).expect(200);
  });

  it("manages news", async () => {
    const { body: p } = await createPerson().expect(201);
    const n = await request(app)
      .post(`/api/people/${p.id}/news`)
      .send({ text: "got promoted", happenedOn: today() })
      .expect(201);
    expect(n.body.text).toBe("got promoted");
    await request(app).delete(`/api/news/${n.body.id}`).expect(200);
  });

  it("tracks reminders and completion", async () => {
    const { body: p } = await createPerson().expect(201);
    const r = await request(app)
      .post(`/api/people/${p.id}/reminders`)
      .send({ title: "send birthday card", dueOn: today() })
      .expect(201);
    expect(r.body.done).toBe(false);
    const done = await request(app).post(`/api/reminders/${r.body.id}/toggle`).send({ done: true }).expect(200);
    expect(done.body.done).toBe(true);
    expect(done.body.doneAt).toBeTruthy();
    await request(app).delete(`/api/reminders/${r.body.id}`).expect(200);
  });
});

describe("connections", () => {
  it("creates reciprocal connections", async () => {
    const a = (await createPerson({ firstName: "Alice" }).expect(201)).body;
    const b = (await createPerson({ firstName: "Bob" }).expect(201)).body;
    const c = await request(app)
      .post("/api/connections")
      .send({ personAId: a.id, personBId: b.id, label: "parent" })
      .expect(201);
    expect(c.body.personAId).toBe(a.id);

    const detailA = await request(app).get(`/api/people/${a.id}`).expect(200);
    const detailB = await request(app).get(`/api/people/${b.id}`).expect(200);
    const fromA = (detailA.body.connections as any[]).find((x) => x.person.id === b.id);
    const fromB = (detailB.body.connections as any[]).find((x) => x.person.id === a.id);
    expect(fromA).toBeTruthy();
    expect(fromA.label).toBe("child");
    expect(fromB).toBeTruthy();
    expect(fromB.label).toBe("parent");

    await request(app).delete(`/api/connections/${c.body.id}`).expect(200);
    const after = await request(app).get(`/api/people/${b.id}`).expect(200);
    expect((after.body.connections as any[]).some((x) => x.person.id === a.id)).toBe(false);
  });

  it("rejects connections to unknown people", async () => {
    await request(app).post("/api/connections").send({ personAId: 1, personBId: 999999, label: "parent" }).expect(400);
  });
});

describe("gifts", () => {
  it("tracks a gift from idea to given", async () => {
    const { body: p } = await createPerson().expect(201);
    const g = await request(app)
      .post(`/api/people/${p.id}/gifts`)
      .send({ text: "whiskey", status: "idea", occasion: "birthday" })
      .expect(201);
    expect(g.body.status).toBe("idea");
    const given = await request(app).put(`/api/gifts/${g.body.id}/status`).send({ status: "given" }).expect(200);
    expect(given.body.status).toBe("given");
    await request(app).delete(`/api/gifts/${g.body.id}`).expect(200);
  });
});

describe("today", () => {
  it("returns the dashboard payload", async () => {
    const res = await request(app).get("/api/today").expect(200);
    const body = res.body;
    expect(Array.isArray(body.duePeople)).toBe(true);
    expect(body.interactionsPerMonth).toHaveLength(12);
    expect(body.circleOverdue).toHaveLength(4);
    expect(Array.isArray(body.upcomingDates)).toBe(true);
    for (const u of body.upcomingDates) {
      expect(u.personName).toBeTruthy();
      expect(u.occurrence).toBeTruthy();
    }
  });

  it("surfaces a never-contacted person as due", async () => {
    const { body: p } = await createPerson({ firstName: "Never", circle: "inner" }).expect(201);
    const res = await request(app).get("/api/today").expect(200);
    const found = (res.body.duePeople as any[]).some((x) => x.id === p.id);
    expect(found).toBe(true);
  });
});

describe("timeline", () => {
  it("returns combined entries and supports filters", async () => {
    const all = await request(app).get("/api/timeline").expect(200);
    expect(all.body.length).toBeGreaterThan(0);
    for (const e of all.body.slice(0, 10)) {
      expect(e.id).toBeTruthy();
      expect(e.type).toBeTruthy();
      expect(e.person).toBeTruthy();
      expect(e.description).toBeTruthy();
    }
    const interactions = await request(app).get("/api/timeline?type=interaction").expect(200);
    expect(interactions.body.length).toBeGreaterThan(0);
    expect(interactions.body.every((e: any) => e.type === "interaction")).toBe(true);

    const personId = all.body[0].person.id;
    const filtered = await request(app).get(`/api/timeline?personId=${personId}`).expect(200);
    expect(filtered.body.length).toBeGreaterThan(0);
    expect(filtered.body.every((e: any) => e.person.id === personId)).toBe(true);
  });

  it("produces entries for every supported activity type", async () => {
    const all = await request(app).get("/api/timeline").expect(200);
    const types = new Set(all.body.map((e: any) => e.type));
    for (const expected of ["interaction", "news", "reminder_done", "gift", "connection", "important_date", "person_added"]) {
      expect(types.has(expected), `expected timeline to include ${expected}`).toBe(true);
    }
  });
});

describe("photos", () => {
  it("uploads, serves and deletes a photo", async () => {
    const { body: p } = await createPerson().expect(201);
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
    const up = await request(app)
      .post(`/api/people/${p.id}/photo`)
      .attach("photo", png, { filename: "face.png", contentType: "image/png" })
      .expect(200);
    expect(up.body.hasPhoto).toBe(true);
    const got = await request(app).get(`/api/people/${p.id}/photo`).expect(200);
    expect(got.headers["content-type"]).toContain("image/png");
    expect(Buffer.from(got.body).equals(png)).toBe(true);
    const del = await request(app).delete(`/api/people/${p.id}/photo`).expect(200);
    expect(del.body.hasPhoto).toBe(false);
    await request(app).get(`/api/people/${p.id}/photo`).expect(404);
  });
});

describe("import", () => {
  const csv = [
    "First Name,Last Name,Email,Phone,Company",
    "Ada,Lovelace,ada@babbage.dev,555-0100,Analytical Engines",
    "Grace,Hopper,grace@navy.mil,555-0101,US Navy",
  ].join("\n");

  it("parses a CSV and suggests a mapping", async () => {
    const res = await request(app)
      .post("/api/import/csv")
      .attach("file", Buffer.from(csv), { filename: "contacts.csv", contentType: "text/csv" })
      .expect(200);
    expect(res.body.format).toBe("csv");
    expect(res.body.columns).toContain("Email");
    expect(res.body.suggestedMapping.firstName).toBe("First Name");
    expect(res.body.suggestedMapping.email).toBe("Email");
    expect(res.body.rows).toHaveLength(2);
  });

  it("imports rows and skips duplicates on re-import", async () => {
    const before = (await request(app).get("/api/people").expect(200)).body.length;
    const first = await request(app)
      .post("/api/import/commit")
      .send({
        format: "csv",
        mapping: { firstName: "First Name", lastName: "Last Name", email: "Email", phone: "Phone", company: "Company" },
        rawRows: [
          { "First Name": "Ada", "Last Name": "Lovelace", Email: "ada@babbage.dev", Phone: "555-0100", Company: "AE" },
          { "First Name": "Grace", "Last Name": "Hopper", Email: "grace@navy.mil", Phone: "555-0101", Company: "USN" },
        ],
      })
      .expect(200);
    expect(first.body.created).toBe(2);
    const after = (await request(app).get("/api/people").expect(200)).body.length;
    expect(after).toBe(before + 2);

    const second = await request(app)
      .post("/api/import/commit")
      .send({
        format: "csv",
        mapping: { firstName: "First Name", lastName: "Last Name", email: "Email" },
        rawRows: [
          { "First Name": "Ada", "Last Name": "Lovelace", Email: "ada@babbage.dev" },
          { "First Name": "Grace", "Last Name": "Hopper", Email: "grace@navy.mil" },
        ],
      })
      .expect(200);
    expect(second.body.created).toBe(0);
  });

  it("parses a vCard file", async () => {
    const vcf = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      "FN:Marie Curie",
      "EMAIL:marie@curie.phys",
      "TEL:555-0199",
      "ORG:Institut Curie",
      "END:VCARD",
    ].join("\r\n");
    const res = await request(app)
      .post("/api/import/vcf")
      .attach("file", Buffer.from(vcf), { filename: "people.vcf", contentType: "text/vcard" })
      .expect(200);
    expect(res.body.format).toBe("vcf");
    expect(res.body.rows).toHaveLength(1);
    expect(res.body.rows[0].firstName).toBe("Marie");
    expect(res.body.rows[0].lastName).toBe("Curie");
    expect(res.body.rows[0].email).toBe("marie@curie.phys");
  });

  it("parses a vCard file using LF-only line endings", async () => {
    const vcf = ["BEGIN:VCARD", "VERSION:3.0", "FN:Alan Turing", "EMAIL:alan@bletchley.uk", "END:VCARD"].join("\n");
    const res = await request(app)
      .post("/api/import/vcf")
      .attach("file", Buffer.from(vcf), { filename: "people.vcf", contentType: "text/vcard" })
      .expect(200);
    expect(res.body.format).toBe("vcf");
    expect(res.body.rows).toHaveLength(1);
    expect(res.body.rows[0].firstName).toBe("Alan");
    expect(res.body.rows[0].lastName).toBe("Turing");
  });

  it("imports vCard rows directly", async () => {
    const res = await request(app)
      .post("/api/import/commit")
      .send({
        format: "vcf",
        rows: [{ rowIndex: 0, firstName: "Rosalind", lastName: "Franklin", email: "r@kings.lab", tags: [] }],
      })
      .expect(200);
    expect(res.body.created).toBe(1);
    const list = (await request(app).get("/api/people").expect(200)).body as any[];
    expect(list.some((p) => p.email === "r@kings.lab")).toBe(true);
  });
});
