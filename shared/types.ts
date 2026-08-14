export type CircleType = 'inner' | 'close' | 'wider' | 'distant';

export const CIRCLE_CADENCE_DAYS: Record<CircleType, number> = {
  inner: 30,
  close: 90,
  wider: 180,
  distant: 365,
};

export const CIRCLE_LABELS: Record<CircleType, string> = {
  inner: 'Inner Circle',
  close: 'Close Friends & Family',
  wider: 'Wider Network',
  distant: 'Distant / Acquaintances',
};

export const CIRCLE_ORDER: CircleType[] = ['inner', 'close', 'wider', 'distant'];

export type CheckInStatus = 'in_touch' | 'due_soon' | 'overdue' | 'snoozed' | 'off';

export interface Person {
  id: string;
  name: string;
  photo_url?: string | null;
  email?: string | null;
  phone?: string | null;
  job_title?: string | null;
  company?: string | null;
  city?: string | null;
  time_zone?: string | null;
  circle: CircleType;
  cadence_override_days?: number | null;
  check_ins_enabled: boolean;
  snooze_until?: string | null; // YYYY-MM-DD
  how_we_met?: string | null;
  notes?: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface PersonWithComputed extends Person {
  last_contacted?: string | null; // YYYY-MM-DD of latest interaction
  latest_news?: News | null;
  status: CheckInStatus;
  days_overdue?: number;
  days_until_due?: number;
  effective_cadence_days: number;
}

export type InteractionType = 'call' | 'message' | 'email' | 'meetup' | 'other';

export interface Interaction {
  id: string;
  person_id: string;
  type: InteractionType;
  date: string; // YYYY-MM-DD
  notes?: string | null;
  created_at: string;
}

export type ImportantDateType = 'birthday' | 'anniversary' | 'work_anniversary' | 'child_birthday' | 'other';

export interface ImportantDate {
  id: string;
  person_id: string;
  type: ImportantDateType;
  title?: string | null;
  month: number; // 1-12
  day: number; // 1-31
  year?: number | null;
  created_at: string;
}

export interface Fact {
  id: string;
  person_id: string;
  fact: string;
  created_at: string;
}

export interface News {
  id: string;
  person_id: string;
  content: string;
  date: string; // YYYY-MM-DD
  created_at: string;
}

export interface Reminder {
  id: string;
  person_id: string;
  title: string;
  due_date: string; // YYYY-MM-DD
  completed: boolean;
  completed_at?: string | null;
  created_at: string;
}

export type GiftStatus = 'idea' | 'given' | 'received';

export interface Gift {
  id: string;
  person_id: string;
  name: string;
  status: GiftStatus;
  occasion?: string | null;
  date?: string | null; // YYYY-MM-DD
  notes?: string | null;
  created_at: string;
}

export type RelationshipType =
  | 'partner'
  | 'parent'
  | 'child'
  | 'sibling'
  | 'colleague'
  | 'introduced'
  | 'introduced_by'
  | 'friend'
  | 'other';

export interface Connection {
  id: string;
  person_a_id: string;
  person_b_id: string;
  relationship_type: RelationshipType;
  custom_label?: string | null;
  created_at: string;
}

export interface ConnectionView {
  id: string;
  connected_person: Person;
  relationship_label: string;
  relationship_type: RelationshipType;
}

export interface TimelineItem {
  id: string;
  person_id: string;
  person_name: string;
  person_photo?: string | null;
  type: 'interaction' | 'news' | 'reminder_completed';
  interaction_type?: InteractionType;
  date: string;
  title: string;
  notes?: string | null;
  created_at: string;
}
