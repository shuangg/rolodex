import Papa from 'papaparse';
import { CircleType, Person } from '../../shared/types';

export interface ParsedContact {
  name: string;
  email?: string | null;
  phone?: string | null;
  job_title?: string | null;
  company?: string | null;
  city?: string | null;
  time_zone?: string | null;
  circle: CircleType;
  notes?: string | null;
  tags: string[];
  isDuplicate?: boolean;
  duplicateMatchId?: string;
  duplicateMatchName?: string;
}

export interface CSVMapping {
  name: string;
  email: string;
  phone: string;
  job_title: string;
  company: string;
  city: string;
  circle: string;
  notes: string;
  tags: string;
}

export function autoDetectCSVMapping(headers: string[]): CSVMapping {
  const lowerHeaders = headers.map((h) => h.toLowerCase().trim());

  const findHeader = (candidates: string[]): string => {
    for (const cand of candidates) {
      const idx = lowerHeaders.findIndex((h) => h === cand || h.includes(cand));
      if (idx !== -1) return headers[idx];
    }
    return '';
  };

  return {
    name: findHeader(['name', 'full name', 'fullname', 'contact', 'first name']),
    email: findHeader(['email', 'e-mail', 'mail', 'email address']),
    phone: findHeader(['phone', 'mobile', 'tel', 'cell', 'telephone']),
    job_title: findHeader(['job_title', 'job title', 'title', 'position', 'role', 'occupation']),
    company: findHeader(['company', 'organization', 'org', 'employer', 'workplace']),
    city: findHeader(['city', 'location', 'town']),
    circle: findHeader(['circle', 'tier', 'group']),
    notes: findHeader(['notes', 'note', 'comment', 'bio', 'description']),
    tags: findHeader(['tags', 'tag', 'categories', 'labels', 'keywords']),
  };
}

export function parseCSVContent(csvText: string, mapping?: CSVMapping): { headers: string[]; rows: any[]; contacts: ParsedContact[] } {
  const result = Papa.parse(csvText.trim(), {
    header: true,
    skipEmptyLines: true,
  });

  const headers = result.meta.fields || [];
  const effectiveMapping = mapping || autoDetectCSVMapping(headers);

  const contacts: ParsedContact[] = [];

  for (const row of result.data as Record<string, string>[]) {
    const rawName = effectiveMapping.name ? row[effectiveMapping.name] : (row['name'] || row['Name'] || '');
    if (!rawName || !rawName.trim()) continue;

    const rawEmail = effectiveMapping.email ? row[effectiveMapping.email] : (row['email'] || row['Email'] || '');
    const rawPhone = effectiveMapping.phone ? row[effectiveMapping.phone] : (row['phone'] || row['Phone'] || '');
    const rawJob = effectiveMapping.job_title ? row[effectiveMapping.job_title] : (row['job_title'] || row['Title'] || '');
    const rawCompany = effectiveMapping.company ? row[effectiveMapping.company] : (row['company'] || row['Company'] || '');
    const rawCity = effectiveMapping.city ? row[effectiveMapping.city] : (row['city'] || row['City'] || '');
    const rawCircle = effectiveMapping.circle ? row[effectiveMapping.circle] : (row['circle'] || row['Circle'] || '');
    const rawNotes = effectiveMapping.notes ? row[effectiveMapping.notes] : (row['notes'] || row['Notes'] || '');
    const rawTags = effectiveMapping.tags ? row[effectiveMapping.tags] : (row['tags'] || row['Tags'] || '');

    // Validate circle
    let circle: CircleType = 'wider';
    const cLower = (rawCircle || '').toLowerCase().trim();
    if (cLower === 'inner' || cLower === 'close' || cLower === 'wider' || cLower === 'distant') {
      circle = cLower as CircleType;
    }

    // Parse tags (comma, semicolon, or space-separated)
    const tags = rawTags
      ? rawTags
          .split(/[,;|]/)
          .map((t) => t.trim().toLowerCase())
          .filter((t) => t.length > 0)
      : [];

    contacts.push({
      name: rawName.trim(),
      email: rawEmail ? rawEmail.trim() : null,
      phone: rawPhone ? rawPhone.trim() : null,
      job_title: rawJob ? rawJob.trim() : null,
      company: rawCompany ? rawCompany.trim() : null,
      city: rawCity ? rawCity.trim() : null,
      circle,
      notes: rawNotes ? rawNotes.trim() : null,
      tags,
    });
  }

  return {
    headers,
    rows: result.data,
    contacts,
  };
}

/**
 * Robust RFC-compliant vCard (2.1, 3.0, 4.0) parser
 */
export function parseVCardContent(vcfText: string): ParsedContact[] {
  const cards = vcfText.split(/BEGIN:VCARD/i).filter((chunk) => chunk.trim().length > 0);
  const contacts: ParsedContact[] = [];

  for (const card of cards) {
    // Unfold multi-line folded fields (RFC vCard allows lines starting with space/tab)
    const unfolded = card.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
    const lines = unfolded.split(/\r\n|\r|\n/);

    let name = '';
    let email: string | null = null;
    let phone: string | null = null;
    let job_title: string | null = null;
    let company: string | null = null;
    let city: string | null = null;
    let notes: string | null = null;
    const tags: string[] = [];

    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;

      const rawKey = line.substring(0, colonIndex).toUpperCase();
      const value = line.substring(colonIndex + 1).trim();
      if (!value) continue;

      if (rawKey === 'FN' || rawKey.startsWith('FN;')) {
        name = value.replace(/\\,/g, ',').replace(/\\;/g, ';');
      } else if (!name && (rawKey === 'N' || rawKey.startsWith('N;'))) {
        // N:LastName;FirstName;Middle;Prefix;Suffix
        const parts = value.split(';').map((p) => p.trim());
        const last = parts[0] || '';
        const first = parts[1] || '';
        name = `${first} ${last}`.trim();
      } else if (rawKey === 'EMAIL' || rawKey.startsWith('EMAIL;') || rawKey.startsWith('EMAIL:')) {
        if (!email) email = value;
      } else if (rawKey === 'TEL' || rawKey.startsWith('TEL;') || rawKey.startsWith('TEL:')) {
        if (!phone) phone = value;
      } else if (rawKey === 'TITLE' || rawKey.startsWith('TITLE;')) {
        job_title = value.replace(/\\,/g, ',').replace(/\\;/g, ';');
      } else if (rawKey === 'ORG' || rawKey.startsWith('ORG;')) {
        // ORG:Company Name;Department
        const parts = value.split(';');
        company = parts[0].trim().replace(/\\,/g, ',').replace(/\\;/g, ';');
      } else if (rawKey === 'ADR' || rawKey.startsWith('ADR;')) {
        // ADR:PO Box;Extended;Street;City;State;PostalCode;Country
        const parts = value.split(';');
        if (parts.length >= 4 && parts[3]) {
          city = parts[3].trim().replace(/\\,/g, ',').replace(/\\;/g, ';');
        }
      } else if (rawKey === 'NOTE' || rawKey.startsWith('NOTE;')) {
        notes = value.replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';');
      } else if (rawKey === 'CATEGORIES' || rawKey.startsWith('CATEGORIES;')) {
        const catParts = value.split(',').map((c) => c.trim().toLowerCase());
        tags.push(...catParts);
      }
    }

    if (name) {
      contacts.push({
        name,
        email,
        phone,
        job_title,
        company,
        city,
        circle: 'wider', // default circle for vCard imports
        notes,
        tags: Array.from(new Set(tags)),
      });
    }
  }

  return contacts;
}

/**
 * Flags contacts that match existing people by email or name
 */
export function detectDuplicates(contacts: ParsedContact[], existingPeople: Person[]): ParsedContact[] {
  const emailMap = new Map<string, Person>();
  const nameMap = new Map<string, Person>();

  for (const p of existingPeople) {
    if (p.email) {
      emailMap.set(p.email.toLowerCase().trim(), p);
    }
    nameMap.set(p.name.toLowerCase().trim(), p);
  }

  return contacts.map((c) => {
    const emailKey = c.email ? c.email.toLowerCase().trim() : '';
    const nameKey = c.name.toLowerCase().trim();

    const match = (emailKey ? emailMap.get(emailKey) : null) || nameMap.get(nameKey);
    if (match) {
      return {
        ...c,
        isDuplicate: true,
        duplicateMatchId: match.id,
        duplicateMatchName: match.name,
      };
    }
    return {
      ...c,
      isDuplicate: false,
    };
  });
}
