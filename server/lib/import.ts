import Papa from 'papaparse'
import VCARD from 'vcf'
import type { Circle } from './types'

export interface ParsedPerson {
  name: string
  email: string | null
  phone: string | null
  job_title: string | null
  company: string | null
  city: string | null
  birthday: string | null // yyyy-mm-dd or partial
  notes: string | null
}

export interface ImportParseResult {
  format: 'csv' | 'vcf'
  headers: string[]
  rows: Record<string, string>[]
  people: ParsedPerson[]
  suggestedMapping: Record<string, string> | null
}

export const PERSON_FIELDS = [
  { key: 'name', label: 'Name', required: true },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'job_title', label: 'Job title' },
  { key: 'company', label: 'Company' },
  { key: 'city', label: 'City' },
  { key: 'birthday', label: 'Birthday' },
  { key: 'notes', label: 'Notes' },
] as const

const FIELD_KEYS = PERSON_FIELDS.map((f) => f.key) as readonly string[]

const HEADER_SYNONYMS: Record<string, string[]> = {
  name: ['name', 'full name', 'fullname', 'fn', 'display name', 'given name', 'first name'],
  email: ['email', 'e-mail', 'email address', 'mail', 'emailaddress'],
  phone: ['phone', 'phone number', 'mobile', 'cell', 'tel', 'telephone', 'mobile phone'],
  job_title: ['job title', 'title', 'role', 'position', 'job'],
  company: ['company', 'organization', 'organisation', 'organisation name', 'org', 'employer', 'company name'],
  city: ['city', 'town', 'location', 'home city', 'address city'],
  birthday: ['birthday', 'birth date', 'birthdate', 'bday', 'dob', 'date of birth'],
  notes: ['notes', 'note', 'comment', 'comments', 'remarks'],
}

function suggestMappingForHeaders(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {}
  for (const field of FIELD_KEYS) {
    const synonyms = HEADER_SYNONYMS[field] ?? [field]
    const match = headers.find((h) => {
      const norm = h.trim().toLowerCase()
      return synonyms.some((s) => norm === s) || norm.includes(field)
    })
    if (match) mapping[match] = field
  }
  return mapping
}

export function parseCSV(text: string): ImportParseResult {
  const parsed = Papa.parse<Record<string, string>>(text.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  })
  const headers = parsed.meta.fields ?? []
  const rows = parsed.data.filter((r) => Object.values(r).some((v) => (v ?? '').toString().trim() !== ''))
  return {
    format: 'csv',
    headers,
    rows,
    people: [],
    suggestedMapping: suggestMappingForHeaders(headers),
  }
}

export function applyMapping(
  parsed: ImportParseResult,
  mapping: Record<string, string>
): { people: ParsedPerson[]; skipped: number } {
  const people: ParsedPerson[] = []
  let skipped = 0
  for (const row of parsed.rows) {
    const mapped: Record<string, string | null> = {}
    for (const [header, field] of Object.entries(mapping)) {
      const value = (row[header] ?? '').toString().trim()
      mapped[field] = value || null
    }
    if (!mapped.name) {
      // Try to build a name from first/last style columns if present
      const first = (row['First Name'] ?? row['first name'] ?? '').toString().trim()
      const last = (row['Last Name'] ?? row['last name'] ?? '').toString().trim()
      mapped.name = [first, last].filter(Boolean).join(' ') || null
    }
    if (!mapped.name) {
      skipped++
      continue
    }
    people.push({
      name: mapped.name,
      email: mapped.email ?? null,
      phone: mapped.phone ?? null,
      job_title: mapped.job_title ?? null,
      company: mapped.company ?? null,
      city: mapped.city ?? null,
      birthday: normalizeBirthday(mapped.birthday),
      notes: mapped.notes ?? null,
    })
  }
  return { people, skipped }
}

function normalizeBirthday(raw: string | null | undefined): string | null {
  if (!raw) return null
  const s = raw.trim()
  // ISO: yyyy-mm-dd (possibly with time)
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  // dd/mm/yyyy or mm/dd/yyyy — disambiguate: first number > 12 means day-first
  m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (m) {
    const a = Number(m[1])
    const b = Number(m[2])
    if (a > 12 && b <= 12) return `${m[3]}-${String(b).padStart(2, '0')}-${String(a).padStart(2, '0')}`
    return `${m[3]}-${String(a).padStart(2, '0')}-${String(b).padStart(2, '0')}`
  }
  // yyyy (year only) or --mm-dd (vCard style)
  m = s.match(/^(\d{4})$/)
  if (m) return s
  m = s.match(/^--(\d{2})-(\d{2})$/)
  if (m) return s
  return null
}

function splitOrg(orgValue: unknown): { company: string | null; title: string | null } {
  const parts = Array.isArray(orgValue)
    ? orgValue.map((x) => String(x ?? '').trim())
    : String(orgValue ?? '')
        .split(';')
        .map((x) => x.trim())
  const company = parts[0] || null
  return { company, title: null }
}
/* eslint-disable @typescript-eslint/no-explicit-any */
// The vcf library's Property is a plain object; its value lives behind
// valueOf() (_data). get() returns one property or an array of them.
function propValue(card: any, propName: string): unknown {
  const got = card.get(propName)
  if (!got) return null
  const entry: any = Array.isArray(got) ? got[0] : got
  if (entry == null || typeof entry.valueOf !== 'function') return null
  const v = entry.valueOf()
  // Properties created from jCard-style input are arrays whose 4th item is
  // the value; from text parsing, valueOf() is the value itself.
  if (Array.isArray(v) && v.length === 4 && typeof v[0] === 'string' && v[2] === 'text') return v[3]
  return v
}

function propToString(value: unknown): string | null {
  if (value == null) return null
  if (Array.isArray(value)) return value.filter((x) => x != null && String(x).trim() !== '').join(' ').trim() || null
  const s = String(value).trim()
  return s || null
}

export function parseVCard(text: string): ParsedPerson[] {
  // The parser wants CRLF line endings and only understands vCard 2.1/3.0;
  // the fields we read are the same in 4.0, so normalise before parsing.
  const normalized = text.replace(/\r?\n/g, '\r\n').replace(/^VERSION:4(\.0)?$/gim, 'VERSION:3.0')
  let cards: any[]
  try {
    cards = VCARD.parse(normalized.trim())
  } catch {
    return []
  }
  const people: ParsedPerson[] = []
  for (const card of cards) {
    try {
      let name = propToString(propValue(card, 'fn'))
      if (!name) {
        const nValue = String(propValue(card, 'n') ?? '')
        if (nValue) {
          // N = Family;Given;Middle;Prefix;Suffix
          const parts = nValue.split(';')
          name = [parts[1], parts[2], parts[0]].filter(Boolean).join(' ').trim() || null
        }
      }
      if (!name) continue

      const { company } = splitOrg(propValue(card, 'org'))
      people.push({
        name,
        email: propToString(propValue(card, 'email')),
        phone: propToString(propValue(card, 'tel')),
        job_title: propToString(propValue(card, 'title')),
        company,
        city: extractCity(card),
        birthday: normalizeBirthday(propToString(propValue(card, 'bday'))),
        notes: propToString(propValue(card, 'note')),
      })
    } catch {
      // Skip malformed cards rather than failing the whole import
      continue
    }
  }
  return people
}

function extractCity(card: any): string | null {
  // ADR = POBox;Ext;Street;Locality;Region;PostalCode;Country
  const adr = String(propValue(card, 'adr') ?? '')
  if (!adr) return null
  return adr.split(';')[3]?.trim() || null
}

export interface DuplicateCheck {
  isDuplicate: boolean
  duplicateOfId: number | null
  duplicateOfName: string | null
  reason: 'email' | 'name' | null
}

export function checkDuplicates(
  candidate: ParsedPerson,
  existing: { id: number; name: string; email: string | null }[]
): DuplicateCheck {
  if (candidate.email) {
    const email = candidate.email.toLowerCase()
    const hit = existing.find((p) => p.email && p.email.toLowerCase() === email)
    if (hit) return { isDuplicate: true, duplicateOfId: hit.id, duplicateOfName: hit.name, reason: 'email' }
  }
  const normName = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')
  const name = normName(candidate.name)
  const hit = existing.find((p) => normName(p.name) === name)
  if (hit) return { isDuplicate: true, duplicateOfId: hit.id, duplicateOfName: hit.name, reason: 'name' }
  return { isDuplicate: false, duplicateOfId: null, duplicateOfName: null, reason: null }
}
