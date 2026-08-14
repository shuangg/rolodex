import {
  Person,
  PersonWithComputed,
  Interaction,
  ImportantDate,
  Fact,
  News,
  Reminder,
  Gift,
  ConnectionView,
  TimelineItem,
  CircleType,
  RelationshipType,
  ImportantDateType,
  InteractionType,
  GiftStatus,
} from '@shared/types';

const API_BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!res.ok) {
    let errorMsg = `HTTP ${res.status} ${res.statusText}`;
    try {
      const data = await res.json();
      if (data.error) errorMsg = data.error;
    } catch {}
    throw new Error(errorMsg);
  }

  return res.json();
}

export const api = {
  // People
  getPeople: (params?: { circle?: CircleType; tag?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.circle) query.set('circle', params.circle);
    if (params?.tag) query.set('tag', params.tag);
    if (params?.search) query.set('search', params.search);
    const qs = query.toString();
    return fetchJson<PersonWithComputed[]>(`${API_BASE}/people${qs ? `?${qs}` : ''}`);
  },

  getPerson: (id: string) => fetchJson<PersonWithComputed>(`${API_BASE}/people/${id}`),

  createPerson: (person: Partial<Person> & { name: string; circle: CircleType }) =>
    fetchJson<PersonWithComputed>(`${API_BASE}/people`, {
      method: 'POST',
      body: JSON.stringify(person),
    }),

  updatePerson: (id: string, updates: Partial<Person>) =>
    fetchJson<PersonWithComputed>(`${API_BASE}/people/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  deletePerson: (id: string) =>
    fetchJson<{ success: boolean; id: string }>(`${API_BASE}/people/${id}`, {
      method: 'DELETE',
    }),

  importPeople: (items: any[], action: 'skip_duplicates' | 'overwrite_duplicates' | 'create_all' = 'skip_duplicates') =>
    fetchJson<{ imported_count: number; created: any[]; updated: any[]; skipped: any[] }>(`${API_BASE}/people/import`, {
      method: 'POST',
      body: JSON.stringify({ items, action }),
    }),

  // Interactions
  getInteractions: (personId: string) => fetchJson<Interaction[]>(`${API_BASE}/people/${personId}/interactions`),

  createInteraction: (interaction: { person_id: string; type: InteractionType; date: string; notes?: string | null }) =>
    fetchJson<Interaction>(`${API_BASE}/interactions`, {
      method: 'POST',
      body: JSON.stringify(interaction),
    }),

  deleteInteraction: (id: string) =>
    fetchJson<{ success: boolean; id: string }>(`${API_BASE}/interactions/${id}`, {
      method: 'DELETE',
    }),

  // Important Dates
  getAllImportantDates: () =>
    fetchJson<(ImportantDate & { person_name: string; person_photo?: string | null })[]>(`${API_BASE}/important-dates`),

  getImportantDates: (personId: string) =>
    fetchJson<ImportantDate[]>(`${API_BASE}/people/${personId}/important-dates`),

  createImportantDate: (data: {
    person_id: string;
    type: ImportantDateType;
    title?: string | null;
    month: number;
    day: number;
    year?: number | null;
  }) =>
    fetchJson<ImportantDate>(`${API_BASE}/important-dates`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteImportantDate: (id: string) =>
    fetchJson<{ success: boolean; id: string }>(`${API_BASE}/important-dates/${id}`, {
      method: 'DELETE',
    }),

  // Facts
  getFacts: (personId: string) => fetchJson<Fact[]>(`${API_BASE}/people/${personId}/facts`),

  createFact: (data: { person_id: string; fact: string }) =>
    fetchJson<Fact>(`${API_BASE}/facts`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteFact: (id: string) =>
    fetchJson<{ success: boolean; id: string }>(`${API_BASE}/facts/${id}`, {
      method: 'DELETE',
    }),

  // News
  getNews: (personId: string) => fetchJson<News[]>(`${API_BASE}/people/${personId}/news`),

  createNews: (data: { person_id: string; content: string; date: string }) =>
    fetchJson<News>(`${API_BASE}/news`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteNews: (id: string) =>
    fetchJson<{ success: boolean; id: string }>(`${API_BASE}/news/${id}`, {
      method: 'DELETE',
    }),

  // Reminders
  getAllReminders: () =>
    fetchJson<(Reminder & { person_name: string; person_photo?: string | null })[]>(`${API_BASE}/reminders`),

  getReminders: (personId: string) => fetchJson<Reminder[]>(`${API_BASE}/people/${personId}/reminders`),

  createReminder: (data: { person_id: string; title: string; due_date: string; completed?: boolean }) =>
    fetchJson<Reminder>(`${API_BASE}/reminders`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateReminder: (id: string, data: Partial<Reminder>) =>
    fetchJson<Reminder>(`${API_BASE}/reminders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteReminder: (id: string) =>
    fetchJson<{ success: boolean; id: string }>(`${API_BASE}/reminders/${id}`, {
      method: 'DELETE',
    }),

  // Gifts
  getGifts: (personId: string) => fetchJson<Gift[]>(`${API_BASE}/people/${personId}/gifts`),

  createGift: (data: {
    person_id: string;
    name: string;
    status?: GiftStatus;
    occasion?: string | null;
    date?: string | null;
    notes?: string | null;
  }) =>
    fetchJson<Gift>(`${API_BASE}/gifts`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateGift: (id: string, data: Partial<Gift>) =>
    fetchJson<Gift>(`${API_BASE}/gifts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteGift: (id: string) =>
    fetchJson<{ success: boolean; id: string }>(`${API_BASE}/gifts/${id}`, {
      method: 'DELETE',
    }),

  // Connections
  getConnections: (personId: string) => fetchJson<ConnectionView[]>(`${API_BASE}/people/${personId}/connections`),

  createConnection: (data: {
    person_a_id: string;
    person_b_id: string;
    relationship_type: RelationshipType;
    custom_label?: string | null;
  }) =>
    fetchJson<any>(`${API_BASE}/connections`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteConnection: (id: string) =>
    fetchJson<{ success: boolean; id: string }>(`${API_BASE}/connections/${id}`, {
      method: 'DELETE',
    }),

  // Timeline
  getTimeline: (params?: { person_id?: string; type?: string }) => {
    const query = new URLSearchParams();
    if (params?.person_id) query.set('person_id', params.person_id);
    if (params?.type) query.set('type', params.type);
    const qs = query.toString();
    return fetchJson<TimelineItem[]>(`${API_BASE}/timeline${qs ? `?${qs}` : ''}`);
  },
};
