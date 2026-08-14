import type {
  Circle,
  ConnectionKind,
  ConnectionView,
  Fact,
  Gift,
  GiftKind,
  ImportantDate,
  ImportantDateType,
  Interaction,
  InteractionType,
  NewsItem,
  PersonComputed,
  PersonInput,
  Reminder,
  TimelineEntry,
} from '../server/lib/types'
import type { UpcomingDate } from '../server/lib/importantDates'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`
    try {
      const body = await res.json()
      if (body?.error) message = body.error
    } catch {
      /* ignore */
    }
    throw new Error(message)
  }
  return res.json()
}

export interface PersonDetail {
  person: PersonComputed
  interactions: Interaction[]
  dates: ImportantDate[]
  facts: Fact[]
  news: NewsItem[]
  reminders: Reminder[]
  gifts: Gift[]
  connections: ConnectionView[]
}

export interface ToContactRow {
  id: number
  name: string
  circle: Circle
  photo: string | null
  status: 'overdue' | 'due_soon'
  last_contacted: string | null
  next_due: string | null
  latest_news: { id: number; text: string; date: string } | null
  overdue_days: number
}

export interface TodayPayload {
  today: string
  to_contact: ToContactRow[]
  upcoming_dates: UpcomingDate[]
  reminders: (Reminder & { person_name: string; overdue: boolean; due_today: boolean })[]
  recent: TimelineEntry[]
}

export interface StatsPayload {
  months: { key: string; label: string; count: number }[]
  circles: {
    circle: Circle
    label: string
    total: number
    in_touch: number
    due_soon: number
    overdue: number
    snoozed: number
    off: number
  }[]
}

export interface CalendarPayload {
  year: number
  month: number
  events: UpcomingDate[]
  upcoming: UpcomingDate[]
}

export interface ImportRow {
  index: number
  person: {
    name: string
    email: string | null
    phone: string | null
    job_title: string | null
    company: string | null
    city: string | null
    birthday: string | null
    notes: string | null
  }
  duplicate: { isDuplicate: boolean; duplicateOfId: number | null; duplicateOfName: string | null; reason: string | null }
}

export interface ImportParsePayload {
  format: 'csv' | 'vcf'
  headers?: string[]
  raw_rows?: Record<string, string>[]
  suggested_mapping?: Record<string, string>
  rows: ImportRow[]
  skipped?: number
}

export const api = {
  listPeople: () => request<PersonComputed[]>('/api/people'),
  getPerson: (id: number) => request<PersonDetail>(`/api/people/${id}`),
  createPerson: (input: Partial<PersonInput>) =>
    request<PersonComputed>('/api/people', { method: 'POST', body: JSON.stringify(input) }),
  updatePerson: (id: number, patch: Partial<PersonInput>) =>
    request<PersonComputed>(`/api/people/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deletePerson: (id: number) => request<{ ok: boolean }>(`/api/people/${id}`, { method: 'DELETE' }),

  addInteraction: (personId: number, type: InteractionType, date: string, notes: string) =>
    request<Interaction>(`/api/people/${personId}/interactions`, {
      method: 'POST',
      body: JSON.stringify({ type, date, notes }),
    }),
  deleteInteraction: (id: number) => request<{ ok: boolean }>(`/api/interactions/${id}`, { method: 'DELETE' }),

  addDate: (personId: number, body: { type: ImportantDateType; label: string | null; month: number; day: number; year: number | null }) =>
    request<ImportantDate>(`/api/people/${personId}/dates`, { method: 'POST', body: JSON.stringify(body) }),
  deleteDate: (id: number) => request<{ ok: boolean }>(`/api/dates/${id}`, { method: 'DELETE' }),

  addFact: (personId: number, text: string) =>
    request<Fact>(`/api/people/${personId}/facts`, { method: 'POST', body: JSON.stringify({ text }) }),
  deleteFact: (id: number) => request<{ ok: boolean }>(`/api/facts/${id}`, { method: 'DELETE' }),

  addNews: (personId: number, text: string, date?: string) =>
    request<NewsItem>(`/api/people/${personId}/news`, { method: 'POST', body: JSON.stringify({ text, date }) }),
  deleteNews: (id: number) => request<{ ok: boolean }>(`/api/news/${id}`, { method: 'DELETE' }),

  addReminder: (personId: number, text: string, dueDate: string) =>
    request<Reminder>(`/api/people/${personId}/reminders`, {
      method: 'POST',
      body: JSON.stringify({ text, due_date: dueDate }),
    }),
  setReminderDone: (id: number, done: boolean) =>
    request<Reminder>(`/api/reminders/${id}`, { method: 'PATCH', body: JSON.stringify({ done }) }),
  deleteReminder: (id: number) => request<{ ok: boolean }>(`/api/reminders/${id}`, { method: 'DELETE' }),

  addGift: (personId: number, body: { name: string; kind: GiftKind; occasion: string | null; date: string }) =>
    request<Gift>(`/api/people/${personId}/gifts`, { method: 'POST', body: JSON.stringify(body) }),
  updateGift: (id: number, patch: Partial<Gift>) =>
    request<Gift>(`/api/gifts/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteGift: (id: number) => request<{ ok: boolean }>(`/api/gifts/${id}`, { method: 'DELETE' }),

  addConnection: (
    personId: number,
    body: { other_id: number; kind: ConnectionKind; a_is_parent?: boolean; label?: string | null; inverse_label?: string | null; note?: string | null }
  ) => request<unknown>(`/api/people/${personId}/connections`, { method: 'POST', body: JSON.stringify(body) }),
  deleteConnection: (id: number) => request<{ ok: boolean }>(`/api/connections/${id}`, { method: 'DELETE' }),

  timeline: (personId: number | null, kind: string | null) => {
    const params = new URLSearchParams()
    if (personId != null) params.set('person', String(personId))
    if (kind) params.set('kind', kind)
    const qs = params.toString()
    return request<TimelineEntry[]>(`/api/timeline${qs ? `?${qs}` : ''}`)
  },

  calendar: (year: number, month: number) => request<CalendarPayload>(`/api/calendar?year=${year}&month=${month}`),
  today: () => request<TodayPayload>('/api/today'),
  stats: () => request<StatsPayload>('/api/stats'),
  tags: () => request<string[]>('/api/tags'),

  importParse: (filename: string, content: string) =>
    request<ImportParsePayload>('/api/import/parse', { method: 'POST', body: JSON.stringify({ filename, content }) }),
  importRemap: (headers: string[], rawRows: Record<string, string>[], mapping: Record<string, string>) =>
    request<{ rows: ImportRow[] }>('/api/import/remap', {
      method: 'POST',
      body: JSON.stringify({ headers, raw_rows: rawRows, mapping }),
    }),
  importApply: (people: ImportRow['person'][]) =>
    request<{ created: { id: number; name: string }[]; skipped: number }>('/api/import/apply', {
      method: 'POST',
      body: JSON.stringify({ people }),
    }),
}
