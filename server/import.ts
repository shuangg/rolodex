import Papa from "papaparse";
import VCard from "vcf";
import { getDb } from "./db";
import { createPerson, getPerson } from "./store";
import type { Circle, FieldMapping } from "../src/types";

export interface ParsedRow {
  rowIndex: number;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  jobTitle: string | null;
  city: string | null;
  notes: string | null;
  tags: string[];
}

export interface ImportRowWithDup extends ParsedRow {
  duplicateOf: number | null;
  duplicateName: string | null;
  skipped: boolean;
}

export interface CsvParseResult {
  format: "csv";
  columns: string[];
  rows: ImportRowWithDup[];
}

export interface VcfParseResult {
  format: "vcf";
  columns: string[];
  rows: ImportRowWithDup[];
}

const FIELD_ALIASES: Record<keyof FieldMapping, string[]> = {
  firstName: ["first name", "firstname", "first_name", "given name", "givenname", "given_name", "fname", "name"],
  lastName: ["last name", "lastname", "last_name", "family name", "familyname", "surname", "lname"],
  email: ["email", "e-mail", "email address", "emailaddress"],
  phone: ["phone", "telephone", "tel", "mobile", "cell", "phone number", "phonenumber"],
  company: ["company", "organisation", "organization", "employer", "org"],
  jobTitle: ["job title", "jobtitle", "title", "position", "role", "designation"],
  city: ["city", "location", "town", "hometown"],
  notes: ["notes", "note", "comments", "comment", "description"],
  tags: ["tags", "tag", "category", "categories"],
};

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z]/g, "").trim();
}

export function suggestMapping(columns: string[]): FieldMapping {
  const mapping: FieldMapping = {};
  for (const col of columns) {
    const n = normalize(col);
    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      if (aliases.map(normalize).includes(n) && !mapping[field as keyof FieldMapping]) {
        mapping[field as keyof FieldMapping] = col;
        break;
      }
    }
  }
  return mapping;
}

export function parseCsv(text: string): { columns: string[]; rows: Record<string, string>[] } {
  const result = Papa.parse<Record<string, string>>(text.trim(), {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });
  const rows = result.data.filter((r) => Object.values(r).some((v) => v && v.trim() !== ""));
  const columns = result.meta.fields ?? [];
  return { columns, rows };
}

function toTags(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(/[,;]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export function rowFromMapping(
  raw: Record<string, string>,
  mapping: FieldMapping,
  rowIndex: number,
): ParsedRow {
  const get = (field?: string): string | null => {
    if (!field) return null;
    const v = raw[field];
    return v != null && String(v).trim() !== "" ? String(v).trim() : null;
  };
  const firstName = get(mapping.firstName) ?? "";
  const lastName = get(mapping.lastName);
  const full = get(mapping.firstName);
  if (firstName === "" && full && full.includes(" ")) {
    const parts = full.split(/\s+/);
    return {
      rowIndex,
      firstName: parts[0],
      lastName: parts.slice(1).join(" ") || null,
      email: get(mapping.email),
      phone: get(mapping.phone),
      company: get(mapping.company),
      jobTitle: get(mapping.jobTitle),
      city: get(mapping.city),
      notes: get(mapping.notes),
      tags: toTags(get(mapping.tags)),
    };
  }
  return {
    rowIndex,
    firstName,
    lastName,
    email: get(mapping.email),
    phone: get(mapping.phone),
    company: get(mapping.company),
    jobTitle: get(mapping.jobTitle),
    city: get(mapping.city),
    notes: get(mapping.notes),
    tags: toTags(get(mapping.tags)),
  };
}

function normEmail(e: string | null): string | null {
  if (!e) return null;
  return e.toLowerCase().trim().replace(/^mailto:/i, "");
}

function normName(first: string, last: string | null): string | null {
  return (first + " " + (last ?? "")).toLowerCase().replace(/[^a-z ]/g, "").trim();
}

export function findDuplicate(row: ParsedRow): {
  duplicateOf: number | null;
  duplicateName: string | null;
} {
  const db = getDb();
  const email = normEmail(row.email);
  if (email) {
    const byEmail = db
      .prepare("SELECT id, first_name, last_name FROM people WHERE lower(email) = ?")
      .get(email) as { id: number; first_name: string; last_name: string | null } | undefined;
    if (byEmail) {
      return {
        duplicateOf: byEmail.id,
        duplicateName: `${byEmail.first_name} ${byEmail.last_name ?? ""}`.trim(),
      };
    }
  }
  const name = normName(row.firstName, row.lastName);
  if (name && name.length > 2) {
    const byName = db
      .prepare(
        "SELECT id, first_name, last_name FROM people WHERE lower(trim(first_name || ' ' || COALESCE(last_name, ''))) = ?",
      )
      .get(name) as { id: number; first_name: string; last_name: string | null } | undefined;
    if (byName) {
      return {
        duplicateOf: byName.id,
        duplicateName: `${byName.first_name} ${byName.last_name ?? ""}`.trim(),
      };
    }
  }
  return { duplicateOf: null, duplicateName: null };
}

export function annotateRows(rows: ParsedRow[]): ImportRowWithDup[] {
  return rows.map((r) => {
    const dup = findDuplicate(r);
    return { ...r, ...dup, skipped: dup.duplicateOf != null };
  });
}

function propValue(card: unknown, field: string): string | null {
  if (card == null || typeof card !== "object") return null;
  const get = (card as { get?: (f: string) => unknown }).get;
  if (typeof get !== "function") return null;
  const value = get.call(card, field);
  if (value == null) return null;
  const arr = Array.isArray(value) ? value : [value];
  const first = arr[0];
  if (first == null) return null;
  const v = typeof (first as { valueOf?: () => unknown }).valueOf === "function"
    ? (first as { valueOf: () => unknown }).valueOf()
    : first;
  return v != null ? String(v) : null;
}

export function parseVcf(text: string): { rows: ParsedRow[] } {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n/g, "\r\n");
  const cards = VCard.parse(normalized) as unknown[];
  const rows: ParsedRow[] = [];
  for (const card of cards) {
    const getProp = (field: string): string | null => propValue(card, field);
    const fn = getProp("fn");
    let firstName = fn ?? "";
    let lastName: string | null = null;
    if (fn && fn.includes(" ")) {
      const parts = fn.split(/\s+/);
      firstName = parts[0];
      lastName = parts.slice(1).join(" ") || null;
    }
    const nProp = getProp("n");
    if (nProp && nProp.includes(",")) {
      const [nLast, nFirst] = nProp.split(",");
      if (nFirst) firstName = nFirst.trim();
      if (nLast) lastName = nLast.trim();
    }
    if (!firstName && !lastName) continue;
    rows.push({
      rowIndex: rows.length,
      firstName: firstName || "Unknown",
      lastName,
      email: getProp("email"),
      phone: getProp("tel"),
      company: getProp("org"),
      jobTitle: getProp("title"),
      city: null,
      notes: getProp("note"),
      tags: [],
    });
  }
  return { rows };
}

export function importRows(rows: ImportRowWithDup[], circle: Circle = "wider"): { created: number } {
  let created = 0;
  for (const row of rows) {
    if (row.skipped || row.duplicateOf != null) continue;
    if (!row.firstName && !row.lastName && !row.email) continue;
    createPerson({
      firstName: row.firstName || row.lastName || row.email || "Unknown",
      lastName: row.lastName,
      email: row.email,
      phone: row.phone,
      company: row.company,
      jobTitle: row.jobTitle,
      city: row.city,
      notes: row.notes,
      tags: row.tags,
      circle,
      cadenceOverrideDays: null,
      checkinsOptedOut: false,
      snoozeUntil: null,
      howMet: null,
      whereMet: null,
      whenMet: null,
    });
    created++;
  }
  return { created };
}

export function duplicateEmailsInImport(rows: ParsedRow[]): string[] {
  const seen = new Map<string, number>();
  const dups = new Set<string>();
  for (const r of rows) {
    const e = normEmail(r.email);
    if (!e) continue;
    const count = (seen.get(e) ?? 0) + 1;
    seen.set(e, count);
    if (count > 1) dups.add(e);
  }
  return [...dups];
}

export function existingPersonById(id: number) {
  return getPerson(id);
}
