import Papa from "papaparse";
import vCard from "vcf";
import type { Person, PersonField } from "./types.ts";
import { PERSON_FIELDS } from "./types.ts";

const HEADER_ALIASES: Record<string, PersonField> = {
  name: "name",
  "full name": "name",
  fullname: "name",
  "display name": "name",
  fn: "name",
  email: "email",
  "e-mail": "email",
  "email address": "email",
  mail: "email",
  phone: "phone",
  tel: "phone",
  telephone: "phone",
  mobile: "phone",
  cell: "phone",
  "phone number": "phone",
  company: "company",
  org: "company",
  organisation: "company",
  organization: "company",
  title: "jobTitle",
  "job title": "jobTitle",
  job_title: "jobTitle",
  jobtitle: "jobTitle",
  role: "jobTitle",
  position: "jobTitle",
  city: "city",
  location: "city",
  town: "city",
  timezone: "timezone",
  "time zone": "timezone",
  tz: "timezone",
  notes: "notes",
  note: "notes",
  comment: "notes",
  tags: "tags",
  tag: "tags",
  labels: "tags",
};

export interface CsvParseResult {
  headers: string[];
  rows: Record<string, string>[];
}

export function parseCsv(text: string): CsvParseResult {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });
  const headers = (parsed.meta.fields ?? []).filter(Boolean);
  const rows = parsed.data.map((row) => {
    const clean: Record<string, string> = {};
    for (const key of headers) {
      const value = row[key];
      clean[key] = value == null ? "" : String(value).trim();
    }
    return clean;
  });
  return { headers, rows };
}

function cardValue(card: InstanceType<typeof vCard>, key: string): string | null {
  const prop = card.get(key);
  if (!prop) return null;
  const raw = prop.valueOf();
  const first = Array.isArray(raw) ? raw[0] : raw;
  if (first == null) return null;
  const text = String(first).trim();
  return text || null;
}

function nameFromCard(card: InstanceType<typeof vCard>): string {
  const fn = cardValue(card, "fn");
  if (fn) return fn;
  const n = cardValue(card, "n");
  if (!n) return "";
  const parts = n.split(";");
  const family = parts[0] ?? "";
  const given = parts[1] ?? "";
  return `${given} ${family}`.trim();
}

function cityFromAdr(adr: string | null): string | null {
  if (!adr) return null;
  const parts = adr.split(";");
  const city = (parts[3] ?? "").trim();
  return city || null;
}

export function parseVCard(text: string): Record<string, string>[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\n/g, "\r\n").trim();
  if (!normalized) return [];
  const cards = vCard.parse(normalized);
  return cards.map((card) => {
    const org = cardValue(card, "org");
    const company = org ? org.split(";")[0]!.trim() : "";
    return {
      name: nameFromCard(card),
      email: cardValue(card, "email") ?? "",
      phone: cardValue(card, "tel") ?? "",
      company,
      jobTitle: cardValue(card, "title") ?? "",
      city: cityFromAdr(cardValue(card, "adr")) ?? "",
      notes: cardValue(card, "note") ?? "",
    };
  }).filter((row) => row.name || row.email);
}

export function suggestMapping(headers: string[]): Record<string, PersonField | ""> {
  const mapping: Record<string, PersonField | ""> = {};
  const used = new Set<PersonField>();
  for (const header of headers) {
    const alias = HEADER_ALIASES[header.trim().toLowerCase().replace(/[_-]+/g, " ")];
    if (alias && !used.has(alias)) {
      mapping[header] = alias;
      used.add(alias);
    } else {
      mapping[header] = "";
    }
  }
  return mapping;
}

export function applyMapping(
  rows: Record<string, string>[],
  mapping: Record<string, PersonField | "">,
): Partial<Record<PersonField, string>>[] {
  return rows.map((row) => {
    const values: Partial<Record<PersonField, string>> = {};
    for (const [header, field] of Object.entries(mapping)) {
      if (!field) continue;
      const value = (row[header] ?? "").trim();
      if (value) values[field] = value;
    }
    return values;
  });
}

export function detectDuplicate(
  values: Partial<Record<PersonField, string>>,
  existing: Pick<Person, "id" | "name" | "email">[],
): { id: string; name: string; reason: string } | null {
  const email = values.email?.trim().toLowerCase();
  if (email) {
    const match = existing.find((p) => p.email?.trim().toLowerCase() === email);
    if (match) return { id: match.id, name: match.name, reason: "Same email" };
  }
  const name = values.name?.trim().toLowerCase();
  if (name) {
    const match = existing.find((p) => p.name.trim().toLowerCase() === name);
    if (match) return { id: match.id, name: match.name, reason: "Same name" };
  }
  return null;
}

export function isPersonField(value: string): value is PersonField {
  return (PERSON_FIELDS as readonly string[]).includes(value);
}
