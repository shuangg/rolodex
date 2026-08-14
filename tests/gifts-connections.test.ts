import { beforeEach, describe, expect, it } from "vitest";
import { initMemoryDb } from "../server/db.ts";
import {
  createConnection,
  createGift,
  createInteraction,
  createPerson,
  deletePerson,
  getPerson,
  listConnectionsFor,
  listGifts,
  updateGift,
  updateReminder,
  createReminder,
} from "../server/repo.ts";

beforeEach(() => {
  initMemoryDb();
});

describe("gifts", () => {
  it("adds ideas, marks them given, and records received gifts", () => {
    const person = createPerson({ name: "Maya Chen", circle: "inner" });
    const idea = createGift({ personId: person.id, description: "Sketchbook", status: "idea", occasion: "Birthday" });
    expect(listGifts(person.id)).toHaveLength(1);
    expect(updateGift(idea.id, { status: "given", date: "2026-08-01" }).status).toBe("given");
    createGift({ personId: person.id, description: "Tea", status: "received", occasion: "Visit", date: "2026-07-01" });
    expect(listGifts(person.id).map((g) => g.status).sort()).toEqual(["given", "received"]);
  });
});

describe("connections", () => {
  it("is visible and correct from both sides", () => {
    const kate = createPerson({ name: "Kate", circle: "inner" });
    const sam = createPerson({ name: "Sam", circle: "inner" });
    createConnection({ fromPersonId: kate.id, toPersonId: sam.id, type: "parent" });
    const fromKate = listConnectionsFor(kate.id);
    const fromSam = listConnectionsFor(sam.id);
    expect(fromKate[0]?.personName).toBe("Sam");
    expect(fromKate[0]?.displayType).toBe("Parent");
    expect(fromSam[0]?.personName).toBe("Kate");
    expect(fromSam[0]?.displayType).toBe("Child");
  });

  it("does not leave broken connections when a person is deleted", () => {
    const a = createPerson({ name: "Ada", circle: "inner" });
    const b = createPerson({ name: "Charles", circle: "close" });
    createConnection({ fromPersonId: a.id, toPersonId: b.id, type: "colleague" });
    deletePerson(b.id);
    expect(listConnectionsFor(a.id)).toHaveLength(0);
    expect(getPerson(b.id)).toBeNull();
  });
});

describe("interactions and reminders", () => {
  it("recalculates last contacted from the newest interaction", () => {
    const person = createPerson({ name: "Priya Shah", circle: "inner" });
    createInteraction({ personId: person.id, type: "call", date: "2025-01-01", notes: "old" });
    expect(getPerson(person.id)?.lastContacted).toBe("2025-01-01");
    createInteraction({ personId: person.id, type: "message", date: "2026-08-10", notes: "new" });
    expect(getPerson(person.id)?.lastContacted).toBe("2026-08-10");
  });

  it("toggles a reminder done and not-done", () => {
    const person = createPerson({ name: "Helen", circle: "inner" });
    const reminder = createReminder({ personId: person.id, content: "Call", dueDate: "2026-08-01" });
    const done = updateReminder(reminder.id, { done: true });
    expect(done.done).toBe(true);
    expect(done.doneAt).toBeTruthy();
    const undone = updateReminder(reminder.id, { done: false });
    expect(undone.done).toBe(false);
    expect(undone.doneAt).toBeNull();
  });
});
