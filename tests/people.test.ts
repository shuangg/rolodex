import { beforeEach, describe, expect, it } from "vitest";
import { initMemoryDb } from "../server/db.ts";
import { createPerson, deletePerson, listPeople, updatePerson } from "../server/repo.ts";

beforeEach(() => {
  initMemoryDb();
});

describe("people add / edit / delete / search", () => {
  it("searches by name, company and email", () => {
    createPerson({ name: "Maya Chen", email: "maya.chen@example.com", company: "Pentagram", circle: "inner" });
    createPerson({ name: "Priya Shah", email: "priya.shah@example.com", company: "Stripe", circle: "close" });
    createPerson({ name: "Leo Alvarez", email: "leo@example.com", company: "Contramar", circle: "inner", tags: ["food"] });

    expect(listPeople({ search: "maya" })).toHaveLength(1);
    expect(listPeople({ search: "stripe" })[0]?.name).toBe("Priya Shah");
    expect(listPeople({ search: "leo@example.com" })[0]?.name).toBe("Leo Alvarez");
  });

  it("filters by circle and tag", () => {
    createPerson({ name: "A", circle: "inner", tags: ["family"] });
    createPerson({ name: "B", circle: "distant", tags: ["work"] });
    expect(listPeople({ circle: "inner" })).toHaveLength(1);
    expect(listPeople({ tag: "work" })[0]?.name).toBe("B");
  });

  it("edit and delete persist in the store", () => {
    const person = createPerson({ name: "Temp Person", circle: "wider", email: "temp@example.com" });
    updatePerson(person.id, { name: "Renamed Person", city: "Oslo" });
    expect(listPeople({ search: "renamed" })[0]?.city).toBe("Oslo");
    deletePerson(person.id);
    expect(listPeople({ search: "renamed" })).toHaveLength(0);
  });
});
