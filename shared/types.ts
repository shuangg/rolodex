export const CIRCLES = ["inner", "close", "wider", "distant"] as const;
export type Circle = (typeof CIRCLES)[number];

export const CIRCLE_LABELS: Record<Circle, string> = {
  inner: "Inner",
  close: "Close",
  wider: "Wider",
  distant: "Distant",
};

export const CIRCLE_CADENCE_DAYS: Record<Circle, number> = {
  inner: 30,
  close: 91,
  wider: 182,
  distant: 365,
};

export const CIRCLE_CADENCE_LABELS: Record<Circle, string> = {
  inner: "Monthly",
  close: "Quarterly",
  wider: "Every 6 months",
  distant: "Yearly",
};

export type CheckInStatus = "in_touch" | "due_soon" | "overdue";

export const CHECK_IN_LABELS: Record<CheckInStatus, string> = {
  in_touch: "In touch",
  due_soon: "Due soon",
  overdue: "Overdue",
};

export const INTERACTION_TYPES = ["call", "message", "email", "meetup", "other"] as const;
export type InteractionType = (typeof INTERACTION_TYPES)[number];

export const INTERACTION_LABELS: Record<InteractionType, string> = {
  call: "Call",
  message: "Message",
  email: "Email",
  meetup: "Met up",
  other: "Other",
};

export const DATE_TYPES = [
  "birthday",
  "anniversary",
  "work_anniversary",
  "child_birthday",
  "other",
] as const;
export type DateType = (typeof DATE_TYPES)[number];

export const DATE_TYPE_LABELS: Record<DateType, string> = {
  birthday: "Birthday",
  anniversary: "Anniversary",
  work_anniversary: "Work anniversary",
  child_birthday: "Child's birthday",
  other: "Other",
};

export const GIFT_STATUSES = ["idea", "given", "received"] as const;
export type GiftStatus = (typeof GIFT_STATUSES)[number];

export const GIFT_STATUS_LABELS: Record<GiftStatus, string> = {
  idea: "Idea",
  given: "Given",
  received: "Received",
};

export const CONNECTION_TYPES = [
  "partner",
  "parent",
  "child",
  "sibling",
  "colleague",
  "introduced",
] as const;
export type ConnectionType = (typeof CONNECTION_TYPES)[number];

export const CONNECTION_LABELS: Record<ConnectionType, string> = {
  partner: "Partner",
  parent: "Parent",
  child: "Child",
  sibling: "Sibling",
  colleague: "Colleague",
  introduced: "Introduced me to",
};

export const TIMELINE_TYPES = ["interaction", "news", "reminder"] as const;
export type TimelineKind = (typeof TIMELINE_TYPES)[number];

export interface PersonInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  jobTitle?: string | null;
  company?: string | null;
  city?: string | null;
  timezone?: string | null;
  circle: Circle;
  cadenceOverrideDays?: number | null;
  checkinsEnabled?: boolean;
  snoozeUntil?: string | null;
  howMet?: string | null;
  whereMet?: string | null;
  whenMet?: string | null;
  notes?: string | null;
  tags?: string[];
}

export interface Person {
  id: string;
  name: string;
  hasPhoto: boolean;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
  company: string | null;
  city: string | null;
  timezone: string | null;
  circle: Circle;
  cadenceOverrideDays: number | null;
  checkinsEnabled: boolean;
  snoozeUntil: string | null;
  howMet: string | null;
  whereMet: string | null;
  whenMet: string | null;
  notes: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PersonListItem extends Person {
  lastContacted: string | null;
  latestNews: string | null;
  checkInStatus: CheckInStatus | null;
  dueOn: string | null;
  daysUntilDue: number | null;
}

export interface Interaction {
  id: string;
  personId: string;
  type: InteractionType;
  date: string;
  notes: string | null;
  createdAt: string;
}

export interface ImportantDate {
  id: string;
  personId: string;
  type: DateType;
  label: string | null;
  month: number;
  day: number;
  year: number | null;
}

export interface Fact {
  id: string;
  personId: string;
  content: string;
}

export interface NewsItem {
  id: string;
  personId: string;
  content: string;
  date: string;
  createdAt: string;
}

export interface Reminder {
  id: string;
  personId: string;
  content: string;
  dueDate: string;
  done: boolean;
  doneAt: string | null;
  createdAt: string;
}

export interface Connection {
  id: string;
  fromPersonId: string;
  toPersonId: string;
  type: ConnectionType;
  label: string | null;
}

export interface ConnectionView {
  id: string;
  personId: string;
  personName: string;
  hasPhoto: boolean;
  type: ConnectionType;
  label: string | null;
  displayType: string;
}

export interface Gift {
  id: string;
  personId: string;
  description: string;
  status: GiftStatus;
  occasion: string | null;
  date: string | null;
}

export interface TimelineItem {
  id: string;
  kind: TimelineKind;
  date: string;
  personId: string;
  personName: string;
  hasPhoto: boolean;
  title: string;
  detail: string | null;
}

export const PERSON_FIELDS = [
  "name",
  "email",
  "phone",
  "jobTitle",
  "company",
  "city",
  "timezone",
  "notes",
  "tags",
] as const;

export type PersonField = (typeof PERSON_FIELDS)[number];

export interface ImportRow {
  values: Partial<Record<PersonField, string>>;
  duplicate: { id: string; name: string; reason: string } | null;
  skip: boolean;
}
