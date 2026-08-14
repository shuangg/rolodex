import type {
  Circle,
  ConnectionView,
  DateType,
  Fact,
  Gift,
  GiftStatus,
  ImportantDate,
  Interaction,
  InteractionType,
  NewsItem,
  PersonInput,
  PersonListItem,
  Reminder,
  TimelineItem,
  TimelineKind,
} from "@shared/types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function json<T>(path: string, method: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function fetchPeople(filters: { search?: string; circle?: Circle | ""; tag?: string } = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.circle) params.set("circle", filters.circle);
  if (filters.tag) params.set("tag", filters.tag);
  const q = params.toString();
  return request<PersonListItem[]>(`/api/people${q ? `?${q}` : ""}`);
}

export function fetchPerson(id: string) {
  return request<PersonDetail>(`/api/people/${id}`);
}

export function createPerson(input: PersonInput) {
  return json<PersonListItem>("/api/people", "POST", input);
}

export function updatePerson(id: string, input: Partial<PersonInput>) {
  return json<PersonListItem>(`/api/people/${id}`, "PUT", input);
}

export function deletePerson(id: string) {
  return json<void>(`/api/people/${id}`, "DELETE");
}

export async function uploadPhoto(id: string, file: File) {
  const body = new FormData();
  body.append("photo", file);
  await request(`/api/people/${id}/photo`, { method: "POST", body });
}

export function fetchTags() {
  return request<string[]>("/api/tags");
}

export function createInteraction(input: { personId: string; type: InteractionType; date: string; notes?: string }) {
  return json<Interaction>("/api/interactions", "POST", input);
}

export function createFact(input: { personId: string; content: string }) {
  return json<Fact>("/api/facts", "POST", input);
}

export function deleteFact(id: string) {
  return json<void>(`/api/facts/${id}`, "DELETE");
}

export function createNews(input: { personId: string; content: string; date: string }) {
  return json<NewsItem>("/api/news", "POST", input);
}

export function createImportantDate(input: {
  personId: string;
  type: DateType;
  label?: string;
  month: number;
  day: number;
  year?: number | null;
}) {
  return json<ImportantDate>("/api/dates", "POST", input);
}

export function deleteImportantDate(id: string) {
  return json<void>(`/api/dates/${id}`, "DELETE");
}

export function fetchDates() {
  return request<ImportantDate[]>("/api/dates");
}

export function createReminder(input: { personId: string; content: string; dueDate: string }) {
  return json<Reminder>("/api/reminders", "POST", input);
}

export function updateReminder(id: string, input: Partial<{ content: string; dueDate: string; done: boolean }>) {
  return json<Reminder>(`/api/reminders/${id}`, "PUT", input);
}

export function deleteReminder(id: string) {
  return json<void>(`/api/reminders/${id}`, "DELETE");
}

export function createGift(input: {
  personId: string;
  description: string;
  status: GiftStatus;
  occasion?: string;
  date?: string;
}) {
  return json<Gift>("/api/gifts", "POST", input);
}

export function updateGift(id: string, input: Partial<{ description: string; status: GiftStatus; date: string }>) {
  return json<Gift>(`/api/gifts/${id}`, "PUT", input);
}

export function deleteGift(id: string) {
  return json<void>(`/api/gifts/${id}`, "DELETE");
}

export function createConnection(input: { fromPersonId: string; toPersonId: string; type: string; label?: string }) {
  return json("/api/connections", "POST", input);
}

export function deleteConnection(id: string) {
  return json<void>(`/api/connections/${id}`, "DELETE");
}

export function fetchTimeline(filters: { personId?: string; type?: TimelineKind | "" } = {}) {
  const params = new URLSearchParams();
  if (filters.personId) params.set("personId", filters.personId);
  if (filters.type) params.set("type", filters.type);
  const q = params.toString();
  return request<TimelineItem[]>(`/api/timeline${q ? `?${q}` : ""}`);
}

export function fetchToday() {
  return request<TodayPayload>("/api/today");
}

export interface PersonDetail {
  person: PersonListItem;
  interactions: Interaction[];
  facts: Fact[];
  news: NewsItem[];
  importantDates: ImportantDate[];
  reminders: Reminder[];
  gifts: Gift[];
  connections: ConnectionView[];
}

export interface TodayDate extends ImportantDate {
  personName: string;
  hasPhoto: boolean;
  next: string;
  days: number;
  age: number | null;
  milestone: boolean;
}

export interface TodayReminder extends Reminder {
  personName: string;
  hasPhoto: boolean;
}

export interface TodayPayload {
  contact: PersonListItem[];
  dates: TodayDate[];
  reminders: TodayReminder[];
  activity: TimelineItem[];
  charts: {
    interactionsByMonth: { month: string; label: string; count: number }[];
    peopleByCircle: { circle: Circle; total: number; overdue: number }[];
  };
}

export function photoUrl(id: string, updatedAt?: string) {
  return `/api/people/${id}/photo?t=${encodeURIComponent(updatedAt ?? "")}`;
}
