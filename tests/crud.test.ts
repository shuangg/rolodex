import { describe, expect, it, beforeEach } from "vitest";
import { initMemoryDb } from "../server/db.ts";
import {
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
  getConnection,
  getFact,
  getGift,
  getImportantDate,
  getInteraction,
  getNews,
  getPerson,
  getReminder,
  listConnectionsFor,
  listFacts,
  listGifts,
  listImportantDates,
  listInteractions,
  listNews,
  listPeople,
  listReminders,
  updateFact,
  updateGift,
  updateImportantDate,
  updateInteraction,
  updateNews,
  updatePerson,
  updateReminder,
} from "../server/repo.ts";

beforeEach(() => {
  initMemoryDb();
});

function person() {
  return createPerson({ name: "Ada Lovelace", email: "ada@example.com", circle: "inner", company: "Analytical Engines" });
}

describe("people CRUD", () => {
  it("creates, reads, updates and deletes a person", () => {
    const created = person();
    expect(created.name).toBe("Ada Lovelace");
    expect(getPerson(created.id)?.email).toBe("ada@example.com");
    const updated = updatePerson(created.id, { city: "London", company: "Royal Society" });
    expect(updated.city).toBe("London");
    expect(updated.company).toBe("Royal Society");
    deletePerson(created.id);
    expect(getPerson(created.id)).toBeNull();
    expect(listPeople()).toHaveLength(0);
  });
});

describe("interactions CRUD", () => {
  it("creates, reads, updates and deletes an interaction", () => {
    const p = person();
    const created = createInteraction({ personId: p.id, type: "call", date: "2026-01-02", notes: "Hello" });
    expect(getInteraction(created.id)?.notes).toBe("Hello");
    expect(updateInteraction(created.id, { notes: "Caught up" }).notes).toBe("Caught up");
    expect(listInteractions(p.id)).toHaveLength(1);
    deleteInteraction(created.id);
    expect(getInteraction(created.id)).toBeNull();
  });
});

describe("facts CRUD", () => {
  it("creates, reads, updates and deletes a fact", () => {
    const p = person();
    const created = createFact({ personId: p.id, content: "Allergic to shellfish" });
    expect(getFact(created.id)?.content).toContain("shellfish");
    expect(updateFact(created.id, { content: "Allergic to peanuts" }).content).toContain("peanuts");
    expect(listFacts(p.id)).toHaveLength(1);
    deleteFact(created.id);
    expect(getFact(created.id)).toBeNull();
  });
});

describe("news CRUD", () => {
  it("creates, reads, updates and deletes news", () => {
    const p = person();
    const created = createNews({ personId: p.id, content: "Moved to Berlin", date: "2026-02-01" });
    expect(getNews(created.id)?.content).toContain("Berlin");
    expect(updateNews(created.id, { content: "Moved to Lisbon" }).content).toContain("Lisbon");
    expect(listNews(p.id)).toHaveLength(1);
    deleteNews(created.id);
    expect(getNews(created.id)).toBeNull();
  });
});

describe("important dates CRUD", () => {
  it("creates, reads, updates and deletes an important date", () => {
    const p = person();
    const created = createImportantDate({ personId: p.id, type: "birthday", month: 12, day: 10, year: 1815 });
    expect(getImportantDate(created.id)?.year).toBe(1815);
    expect(updateImportantDate(created.id, { day: 11 }).day).toBe(11);
    expect(listImportantDates(p.id)).toHaveLength(1);
    deleteImportantDate(created.id);
    expect(getImportantDate(created.id)).toBeNull();
  });
});

describe("reminders CRUD", () => {
  it("creates, reads, updates and deletes a reminder", () => {
    const p = person();
    const created = createReminder({ personId: p.id, content: "Send card", dueDate: "2026-03-01" });
    expect(getReminder(created.id)?.done).toBe(false);
    expect(updateReminder(created.id, { done: true }).done).toBe(true);
    expect(listReminders(p.id)).toHaveLength(1);
    deleteReminder(created.id);
    expect(getReminder(created.id)).toBeNull();
  });
});

describe("gifts CRUD", () => {
  it("creates, reads, updates and deletes a gift", () => {
    const p = person();
    const created = createGift({ personId: p.id, description: "Book", status: "idea", occasion: "Birthday" });
    expect(getGift(created.id)?.status).toBe("idea");
    expect(updateGift(created.id, { status: "given" }).status).toBe("given");
    expect(listGifts(p.id)).toHaveLength(1);
    deleteGift(created.id);
    expect(getGift(created.id)).toBeNull();
  });
});

describe("connections CRUD", () => {
  it("creates, reads and deletes a connection", () => {
    const a = person();
    const b = createPerson({ name: "Charles Babbage", circle: "close" });
    const created = createConnection({ fromPersonId: a.id, toPersonId: b.id, type: "colleague" });
    expect(getConnection(created.id)?.type).toBe("colleague");
    expect(listConnectionsFor(a.id)).toHaveLength(1);
    deleteConnection(created.id);
    expect(getConnection(created.id)).toBeNull();
  });
});
