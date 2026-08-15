import type {
  Connection,
  ConnectionView,
  Fact,
  Gift,
  ImportantDate,
  Interaction,
  NewsItem,
  PersonSummary,
  PersonWithMeta,
  Reminder,
  TodayData,
  TimelineEntry,
} from "./types";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, options);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const api = {
  listPeople: () => request<PersonWithMeta[]>("/api/people"),
  getPerson: (id: number) => request<PersonWithMeta & {
    dates: ImportantDate[];
    interactions: Interaction[];
    facts: Fact[];
    news: NewsItem[];
    reminders: Reminder[];
    connections: ConnectionView[];
    gifts: Gift[];
    timeline: TimelineEntry[];
  }>(`/api/people/${id}`),
  createPerson: (body: Record<string, unknown>) =>
    request<PersonWithMeta>("/api/people", json("POST", body)),
  updatePerson: (id: number, body: Record<string, unknown>) =>
    request<PersonWithMeta>(`/api/people/${id}`, json("PUT", body)),
  deletePerson: (id: number) => request<{ ok: boolean }>(`/api/people/${id}`, { method: "DELETE" }),
  uploadPhoto: (id: number, file: File) => {
    const form = new FormData();
    form.append("photo", file);
    return request<{ ok: boolean; hasPhoto: boolean }>(`/api/people/${id}/photo`, {
      method: "POST",
      body: form,
    });
  },
  deletePhoto: (id: number) => request<{ ok: boolean; hasPhoto: boolean }>(`/api/people/${id}/photo`, { method: "DELETE" }),
  photoUrl: (id: number) => `/api/people/${id}/photo`,
  createInteraction: (personId: number, body: { type: string; occurredOn: string; notes?: string }) =>
    request<{ interaction: Interaction; person: PersonWithMeta }>("/api/interactions", json("POST", { personId, ...body })),
  deleteInteraction: (id: number) => request<{ ok: boolean }>(`/api/interactions/${id}`, { method: "DELETE" }),
  createDate: (personId: number, body: Record<string, unknown>) =>
    request<ImportantDate>(`/api/people/${personId}/dates`, json("POST", body)),
  allDates: () =>
    request<Array<{ date: ImportantDate; person: PersonSummary }>>("/api/dates"),
  deleteDate: (id: number) => request<{ ok: boolean }>(`/api/dates/${id}`, { method: "DELETE" }),
  createFact: (personId: number, text: string) =>
    request<Fact>(`/api/people/${personId}/facts`, json("POST", { text })),
  deleteFact: (id: number) => request<{ ok: boolean }>(`/api/facts/${id}`, { method: "DELETE" }),
  createNews: (personId: number, text: string, happenedOn?: string | null) =>
    request<NewsItem>(`/api/people/${personId}/news`, json("POST", { text, happenedOn })),
  deleteNews: (id: number) => request<{ ok: boolean }>(`/api/news/${id}`, { method: "DELETE" }),
  createReminder: (personId: number, title: string, dueOn: string) =>
    request<Reminder>(`/api/people/${personId}/reminders`, json("POST", { title, dueOn })),
  toggleReminder: (id: number, done: boolean) =>
    request<Reminder>(`/api/reminders/${id}/toggle`, json("POST", { done })),
  deleteReminder: (id: number) => request<{ ok: boolean }>(`/api/reminders/${id}`, { method: "DELETE" }),
  createConnection: (personAId: number, personBId: number, label: string) =>
    request<Connection>("/api/connections", json("POST", { personAId, personBId, label })),
  deleteConnection: (id: number) => request<{ ok: boolean }>(`/api/connections/${id}`, { method: "DELETE" }),
  createGift: (personId: number, body: Record<string, unknown>) =>
    request<Gift>(`/api/people/${personId}/gifts`, json("POST", body)),
  updateGiftStatus: (id: number, status: string) =>
    request<Gift>(`/api/gifts/${id}/status`, json("PUT", { status })),
  deleteGift: (id: number) => request<{ ok: boolean }>(`/api/gifts/${id}`, { method: "DELETE" }),
  getToday: () => request<TodayData>("/api/today"),
  getTimeline: (params?: { personId?: number; type?: string }) => {
    const q = new URLSearchParams();
    if (params?.personId) q.set("personId", String(params.personId));
    if (params?.type) q.set("type", params.type);
    return request<TimelineEntry[]>(`/api/timeline?${q.toString()}`);
  },
  importCsv: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<{
      format: "csv";
      columns: string[];
      suggestedMapping: Record<string, string>;
      rawRows: Array<Record<string, string>>;
      rows: Array<{
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
        duplicateOf: number | null;
        duplicateName: string | null;
        skipped: boolean;
      }>;
    }>("/api/import/csv", { method: "POST", body: form });
  },
  importVcf: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<{
      format: "vcf";
      columns: string[];
      rows: Array<{
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
        duplicateOf: number | null;
        duplicateName: string | null;
        skipped: boolean;
      }>;
    }>("/api/import/vcf", { method: "POST", body: form });
  },
  importCommit: (body: Record<string, unknown>) =>
    request<{ created: number }>("/api/import/commit", json("POST", body)),
};
