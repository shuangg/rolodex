import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { applyMapping, detectDuplicate, parseCsv, parseVCard, suggestMapping } from "../shared/import.ts";

const csv = readFileSync(path.resolve("fixtures/contacts.csv"), "utf8");
const vcf = readFileSync(path.resolve("fixtures/contacts.vcf"), "utf8");

describe("import parsing", () => {
  it("parses a CSV file and suggests column mapping", () => {
    const parsed = parseCsv(csv);
    expect(parsed.rows).toHaveLength(3);
    expect(parsed.rows[0]?.name).toBe("Avery Quill");
    const mapping = suggestMapping(parsed.headers);
    expect(mapping.name).toBe("name");
    expect(mapping.email).toBe("email");
    expect(mapping.company).toBe("company");
    expect(mapping.job_title).toBe("jobTitle");
    const people = applyMapping(parsed.rows, mapping);
    expect(people[0]?.name).toBe("Avery Quill");
    expect(people[1]?.city).toBe("Oslo");
  });

  it("parses a vCard file", () => {
    const cards = parseVCard(vcf);
    expect(cards).toHaveLength(3);
    expect(cards[0]?.name).toBe("Nia Okonkwo");
    expect(cards[0]?.email).toBe("nia.okonkwo@example.com");
    expect(cards[0]?.company).toBe("BBC");
    expect(cards[0]?.city).toBe("Leeds");
    expect(cards[2]?.name).toBe("Kit Moreau");
  });

  it("flags likely duplicates by email or name", () => {
    const existing = [{ id: "1", name: "Maya Chen", email: "maya.chen@example.com" }];
    const byEmail = detectDuplicate({ name: "Maya C", email: "maya.chen@example.com" }, existing);
    expect(byEmail?.reason).toBe("Same email");
    const byName = detectDuplicate({ name: "Maya Chen" }, existing);
    expect(byName?.reason).toBe("Same name");
    expect(detectDuplicate({ name: "Avery Quill", email: "avery.quill@example.com" }, existing)).toBeNull();
  });
});
