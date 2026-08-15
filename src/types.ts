export type Circle = "inner" | "close" | "wider" | "distant";

export type InteractionType = "call" | "message" | "email" | "meetup" | "other";

export type CheckinStatus = "in_touch" | "due_soon" | "overdue";

export type ImportantDateKind =
  | "birthday"
  | "anniversary"
  | "work_anniversary"
  | "child_birthday"
  | "other";

export type GiftStatus = "idea" | "given" | "received";

export interface FieldMapping {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  city?: string;
  notes?: string;
  tags?: string;
}

export type TimelineEntryType =
  | "interaction"
  | "news"
  | "reminder_done"
  | "connection"
  | "fact"
  | "gift"
  | "important_date"
  | "person_added";

export const CIRCLES: Circle[] = ["inner", "close", "wider", "distant"];

export const CIRCLE_LABELS: Record<Circle, string> = {
  inner: "Inner",
  close: "Close",
  wider: "Wider",
  distant: "Distant",
};

export const INTERACTION_LABELS: Record<InteractionType, string> = {
  call: "Call",
  message: "Message",
  email: "Email",
  meetup: "Met up",
  other: "Other",
};

export interface Person {
  id: number;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
  company: string | null;
  city: string | null;
  timeZone: string | null;
  circle: Circle;
  cadenceOverrideDays: number | null;
  checkinsOptedOut: boolean;
  snoozeUntil: string | null;
  howMet: string | null;
  whereMet: string | null;
  whenMet: string | null;
  notes: string | null;
  tags: string[];
  hasPhoto: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CheckinInfo {
  status: CheckinStatus;
  cadenceDays: number | null;
  daysUntilDue: number | null;
  dueDate: string | null;
  snoozed: boolean;
  optedOut: boolean;
  daysOverdue: number | null;
}

export interface PersonWithMeta extends Person {
  lastContacted: string | null;
  latestNews: string | null;
  checkin: CheckinInfo;
}

export interface Interaction {
  id: number;
  personId: number;
  type: InteractionType;
  occurredOn: string;
  notes: string | null;
  createdAt: string;
}

export interface ImportantDate {
  id: number;
  personId: number;
  kind: ImportantDateKind;
  label: string | null;
  month: number;
  day: number;
  year: number | null;
  createdAt: string;
}

export interface UpcomingDate {
  id: number;
  personId: number;
  kind: ImportantDateKind;
  label: string | null;
  year: number | null;
  occurrence: string;
  age: number | null;
  milestone: boolean;
}

export interface Fact {
  id: number;
  personId: number;
  text: string;
  createdAt: string;
}

export interface NewsItem {
  id: number;
  personId: number;
  text: string;
  happenedOn: string | null;
  createdAt: string;
}

export interface Reminder {
  id: number;
  personId: number;
  title: string;
  dueOn: string;
  done: boolean;
  doneAt: string | null;
  createdAt: string;
}

export interface Connection {
  id: number;
  personAId: number;
  personBId: number;
  label: string;
  createdAt: string;
}

export interface ConnectionView {
  id: number;
  person: PersonSummary;
  label: string;
}

export interface Gift {
  id: number;
  personId: number;
  text: string;
  status: GiftStatus;
  occasion: string | null;
  date: string | null;
  createdAt: string;
}

export interface PersonSummary {
  id: number;
  firstName: string;
  lastName: string | null;
  email: string | null;
  company: string | null;
  circle: Circle;
  hasPhoto: boolean;
}

export interface TimelineEntry {
  id: string;
  date: string;
  type: TimelineEntryType;
  person: PersonSummary;
  description: string;
  details: string | null;
}

export interface TodayData {
  duePeople: PersonWithMeta[];
  upcomingDates: Array<UpcomingDate & { personName: string }>;
  reminders: ReminderWithPerson[];
  recentActivity: TimelineEntry[];
  interactionsPerMonth: { month: string; count: number }[];
  circleOverdue: { circle: Circle; total: number; overdue: number }[];
  dueCount: number;
  upcomingCount: number;
  overdueReminders: number;
}

export interface ReminderWithPerson extends Reminder {
  person: PersonSummary;
}
