import { addDays, format, startOfDay } from "date-fns";
import { CIRCLE_CADENCE_DAYS } from "../shared/types.ts";
import type { CheckInStatus, Circle, ConnectionType, DateType, GiftStatus, InteractionType } from "../shared/types.ts";
import { cadenceDaysFor } from "../shared/checkin.ts";
import {
  countPeople,
  createConnection,
  createFact,
  createGift,
  createImportantDate,
  createInteraction,
  createNews,
  createPerson,
  createReminder,
  setPhoto,
} from "./repo.ts";
import { makeAvatarPng } from "./png.ts";

function isoDaysAgo(days: number): string {
  return format(addDays(startOfDay(new Date()), -days), "yyyy-MM-dd");
}

function isoDaysAhead(days: number): string {
  return format(addDays(startOfDay(new Date()), days), "yyyy-MM-dd");
}

function monthDay(offset: number, day: number): { month: number; day: number; year: number } {
  const base = new Date();
  const d = new Date(base.getFullYear(), base.getMonth() + offset, Math.min(day, 28));
  return { month: d.getMonth() + 1, day: d.getDate(), year: 1978 + ((offset + day) % 22) };
}

function lastContactDays(cadence: number, status: CheckInStatus, overdueBy = 14): number {
  if (status === "in_touch") return Math.max(3, cadence - 16);
  if (status === "due_soon") return Math.max(1, cadence - 4);
  return cadence + overdueBy;
}

interface SeedSpec {
  name: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  company?: string;
  city?: string;
  timezone?: string;
  circle: Circle;
  cadenceOverrideDays?: number | null;
  checkinsEnabled?: boolean;
  snoozeDays?: number;
  howMet?: string;
  whereMet?: string;
  whenMet?: string;
  notes?: string;
  tags?: string[];
  photo?: boolean;
  status?: CheckInStatus;
  overdueBy?: number;
  birthday?: { month: number; day: number; year?: number | null };
  extraDates?: { type: DateType; label?: string; month: number; day: number; year?: number | null }[];
  facts?: string[];
  news?: { content: string; daysAgo: number }[];
  gifts?: { description: string; status: GiftStatus; occasion?: string; date?: string }[];
  reminders?: { content: string; dueDays: number; done?: boolean }[];
  extraInteractions?: { type: InteractionType; daysAgo: number; notes: string }[];
}

const laterThisMonth = (() => {
  const now = new Date();
  const day = now.getDate() + 9;
  if (day <= 28) return { month: now.getMonth() + 1, day, year: now.getFullYear() - 40 };
  return monthDay(0, 28);
})();

const PEOPLE: SeedSpec[] = [
  {
    name: "Maya Chen",
    email: "maya.chen@example.com",
    phone: "+1 347 555 0142",
    jobTitle: "Partner",
    company: "Pentagram",
    city: "Brooklyn",
    timezone: "America/New_York",
    circle: "inner",
    howMet: "Introduced by a mutual friend after a design talk",
    whereMet: "Brooklyn Navy Yard",
    whenMet: "2018-06-12",
    notes: "Sunday mornings are sacred — do not call before 11. Loves long letters more than texts.",
    tags: ["family", "design"],
    status: "in_touch",
    birthday: laterThisMonth,
    extraDates: [{ type: "anniversary", label: "We met", month: 6, day: 12, year: 2018 }],
    facts: ["Allergic to shellfish", "Takes oat milk", "Prefers voice notes to texts after 9pm"],
    news: [{ content: "Just made partner at Pentagram", daysAgo: 18 }],
    gifts: [
      { description: "Hand-bound sketchbook from Choosing Keeping", status: "idea", occasion: "Birthday" },
      { description: "Ceramic pour-over set", status: "given", occasion: "Anniversary", date: isoDaysAgo(60) },
    ],
    reminders: [{ content: "Book the September weekend in Beacon", dueDays: 2 }],
    extraInteractions: [
      { type: "meetup", daysAgo: 6, notes: "Walked the promenade. She is thinking about a sabbatical next spring." },
    ],
  },
  {
    name: "David Okonkwo",
    email: "david.okonkwo@example.com",
    phone: "+44 20 7946 0318",
    jobTitle: "Paediatrician",
    company: "St Thomas' Hospital",
    city: "London",
    timezone: "Europe/London",
    circle: "inner",
    howMet: "Grew up in the same house",
    whereMet: "Manchester",
    notes: "Night shifts Thursday–Sunday this month. Best time is Tuesday lunch.",
    tags: ["family", "medicine"],
    status: "due_soon",
    birthday: { month: 3, day: 4, year: 1989 },
    facts: ["Supports Arsenal", "Does not eat pork"],
    news: [{ content: "Accepted the consultant post starting in January", daysAgo: 40 }],
    reminders: [{ content: "Send the photos from Mum's birthday", dueDays: -3 }],
  },
  {
    name: "Priya Shah",
    email: "priya.shah@example.com",
    phone: "+1 415 555 0194",
    jobTitle: "Product lead",
    company: "Stripe",
    city: "San Francisco",
    timezone: "America/Los_Angeles",
    circle: "inner",
    howMet: "University flatmates",
    whereMet: "UCL",
    whenMet: "2008-09-20",
    notes: "Going through a hard quarter at work. Check in properly, not just a like.",
    tags: ["university", "product"],
    status: "overdue",
    overdueBy: 32,
    birthday: monthDay(1, 8),
    extraDates: [{ type: "child_birthday", label: "Asha's birthday", month: monthDay(1, 8).month, day: 22, year: 2021 }],
    facts: ["Partner is Sam", "Daughter Asha starts reception this autumn"],
    news: [{ content: "Second baby due in March", daysAgo: 12 }],
    gifts: [{ description: "Picture book from the bookstore on Valencia", status: "idea", occasion: "Asha's birthday" }],
    reminders: [{ content: "Ask how the scan went", dueDays: 0 }],
  },
  {
    name: "Helen Ward",
    email: "helen.ward@example.com",
    phone: "+44 161 496 0288",
    jobTitle: "Retired teacher",
    city: "Manchester",
    timezone: "Europe/London",
    circle: "inner",
    howMet: "My mother",
    notes: "Prefers a phone call to anything on a screen. Sunday evenings after The Repair Shop.",
    tags: ["family"],
    status: "overdue",
    overdueBy: 21,
    birthday: { month: 11, day: 19, year: 1956 },
    facts: ["Hates lilies", "Still has the good china for Christmas only"],
    news: [{ content: "Joined the canal walking group", daysAgo: 25 }],
    gifts: [{ description: "New secateurs and a handwritten letter", status: "idea", occasion: "Birthday" }],
  },
  {
    name: "Tom Ward",
    email: "tom.ward@example.com",
    phone: "+44 161 496 0289",
    jobTitle: "Retired civil engineer",
    city: "Manchester",
    timezone: "Europe/London",
    circle: "inner",
    snoozeDays: 18,
    howMet: "My father",
    notes: "Currently on a walking holiday in the Lakes. Leave him be until he's back.",
    tags: ["family"],
    status: "overdue",
    birthday: { month: 1, day: 7, year: 1954 },
    facts: ["Will talk about bridges for an hour if you let him"],
  },
  {
    name: "Leo Alvarez",
    email: "leo.alvarez@example.com",
    phone: "+52 55 1234 7788",
    jobTitle: "Chef",
    company: "Contramar",
    city: "Mexico City",
    timezone: "America/Mexico_City",
    circle: "inner",
    howMet: "Shared a hostel kitchen in Oaxaca",
    whereMet: "Oaxaca",
    whenMet: "2016-02-29",
    notes: "Born on 29 February. Texts back at strange hours. Best food brain I know.",
    tags: ["food", "travel"],
    status: "in_touch",
    birthday: { month: 2, day: 29, year: 1992 },
    facts: ["Vegetarian at home, not at work", "Collects old menus"],
    news: [{ content: "Looking at a small site in Roma Norte for his own place", daysAgo: 9 }],
    extraInteractions: [{ type: "call", daysAgo: 8, notes: "Talked through the lease. He sounded excited and tired." }],
  },
  {
    name: "Jordan Blake",
    email: "jordan.blake@example.com",
    phone: "+1 312 555 0166",
    jobTitle: "Associate",
    company: "Kirkland & Ellis",
    city: "Chicago",
    timezone: "America/Chicago",
    circle: "close",
    howMet: "Same halls in first year",
    tags: ["university", "law"],
    status: "overdue",
    overdueBy: 8,
    birthday: { month: 5, day: 14, year: 1990 },
    facts: ["Training for the Chicago marathon"],
    news: [{ content: "Made the partnership track conversation official", daysAgo: 50 }],
  },
  {
    name: "Aisha Rahman",
    email: "aisha.rahman@example.com",
    phone: "+1 416 555 0133",
    jobTitle: "Data scientist",
    company: "Shopify",
    city: "Toronto",
    timezone: "America/Toronto",
    circle: "close",
    howMet: "Saturday morning ride",
    whereMet: "Regent's Park",
    tags: ["cycling"],
    status: "in_touch",
    birthday: { month: 7, day: 2, year: 1993 },
    facts: ["Rides a steel Frame", "Does not do Zwift on principle"],
    extraInteractions: [{ type: "message", daysAgo: 11, notes: "Sent the route for the autumn 100k." }],
  },
  {
    name: "Samira Nouri",
    email: "samira.nouri@example.com",
    phone: "+49 30 555 4410",
    jobTitle: "Product manager",
    company: "Figma",
    city: "Berlin",
    timezone: "Europe/Berlin",
    circle: "close",
    howMet: "Priya introduced us after Config",
    tags: ["work", "design"],
    status: "in_touch",
    birthday: { month: 12, day: 1, year: 1991 },
    facts: ["Learning German, hates the cases"],
    news: [{ content: "Moved to Berlin in April", daysAgo: 110 }],
  },
  {
    name: "Chris Patel",
    email: "chris.patel@example.com",
    phone: "+1 917 555 0180",
    jobTitle: "Reporter",
    company: "The Atlantic",
    city: "New York",
    timezone: "America/New_York",
    circle: "close",
    howMet: "Old roommates on Myrtle Avenue",
    tags: ["journalism"],
    status: "overdue",
    overdueBy: 11,
    birthday: { month: 4, day: 27, year: 1988 },
    facts: ["Always hungry after a deadline"],
    news: [{ content: "Working on a long piece about hospital billing", daysAgo: 7 }],
    reminders: [{ content: "Send the intro to Maya", dueDays: 5 }],
  },
  {
    name: "Naomi Feldman",
    email: "naomi.feldman@example.com",
    jobTitle: "Librarian",
    company: "Multnomah County Library",
    city: "Portland",
    timezone: "America/Los_Angeles",
    circle: "close",
    howMet: "Book club that outlived the book club",
    tags: ["books"],
    status: "due_soon",
    birthday: { month: 9, day: 30, year: 1986 },
    facts: ["Will not discuss endings in public"],
    gifts: [{ description: "The new Ferrante translation", status: "received", occasion: "Just because", date: isoDaysAgo(80) }],
  },
  {
    name: "Benito Cruz",
    email: "benito.cruz@example.com",
    phone: "+34 93 555 2201",
    jobTitle: "Architect",
    company: "Estudio Cruz",
    city: "Barcelona",
    timezone: "Europe/Madrid",
    circle: "close",
    howMet: "Climbing gym in Poble Sec",
    tags: ["climbing"],
    status: "in_touch",
    birthday: { month: 8, day: 9, year: 1987 },
    extraDates: [{ type: "work_anniversary", label: "Opened the studio", month: 3, day: 1, year: 2019 }],
    facts: ["Afraid of heights off the wall, never on it"],
  },
  {
    name: "Freya Lindqvist",
    email: "freya.lindqvist@example.com",
    jobTitle: "UX designer",
    company: "Spotify",
    city: "Stockholm",
    timezone: "Europe/Stockholm",
    circle: "close",
    cadenceOverrideDays: 14,
    howMet: "Exchange students, same kitchen",
    tags: ["university", "design"],
    status: "due_soon",
    birthday: { month: 6, day: 18, year: 1994 },
    facts: ["Swims in the morning even in January"],
    notes: "Asked for more regular check-ins while she decides whether to leave Stockholm.",
  },
  {
    name: "Marcus Johnson",
    email: "marcus.johnson@example.com",
    phone: "+1 404 555 0177",
    jobTitle: "Session musician",
    city: "Atlanta",
    timezone: "America/New_York",
    circle: "close",
    howMet: "Mum's sister's boy — cousin",
    tags: ["family", "music"],
    status: "in_touch",
    birthday: { month: 10, day: 3, year: 1995 },
    facts: ["Plays bass, owns too many pedals"],
    news: [{ content: "Touring with a singer I have never heard of, through November", daysAgo: 20 }],
  },
  {
    name: "Elena Popov",
    email: "elena.popov@example.com",
    phone: "+1 206 555 0112",
    jobTitle: "VP of Engineering",
    company: "Convoy",
    city: "Seattle",
    timezone: "America/Los_Angeles",
    circle: "wider",
    howMet: "She managed me at my second job",
    tags: ["work"],
    status: "overdue",
    overdueBy: 18,
    birthday: monthDay(2, 15),
    facts: ["Early riser", "Has a boat she never takes out"],
    news: [{ content: "Team is being re-orged again", daysAgo: 16 }],
    extraDates: [{ type: "work_anniversary", label: "Started at Convoy", month: 2, day: 1, year: 2020 }],
  },
  {
    name: "Wei Zhang",
    email: "wei.zhang@example.com",
    jobTitle: "Research scientist",
    company: "National University of Singapore",
    city: "Singapore",
    timezone: "Asia/Singapore",
    circle: "wider",
    howMet: "Sat next to each other at a conference dinner",
    whereMet: "CHI, Honolulu",
    tags: ["research"],
    status: "due_soon",
    birthday: { month: 1, day: 21, year: 1984 },
    facts: ["Does not drink", "Always knows a good hawker stall"],
  },
  {
    name: "Olivia Hart",
    email: "olivia.hart@example.com",
    phone: "+44 7700 900123",
    jobTitle: "Year 4 teacher",
    company: "St Mary's Primary",
    city: "London",
    timezone: "Europe/London",
    circle: "wider",
    howMet: "Neighbours, then the street party",
    tags: ["neighbours"],
    status: "in_touch",
    birthday: { month: 5, day: 5, year: 1985 },
    facts: ["Has a spare key to our place"],
  },
  {
    name: "James Okoye",
    email: "james.okoye@example.com",
    phone: "+234 802 555 0144",
    jobTitle: "Founder",
    company: "KitePay",
    city: "Lagos",
    timezone: "Africa/Lagos",
    circle: "wider",
    howMet: "A client who became a friend",
    tags: ["work"],
    status: "in_touch",
    birthday: { month: 11, day: 11, year: 1982 },
    news: [{ content: "Closed the seed round", daysAgo: 33 }],
  },
  {
    name: "Sophie Dubois",
    email: "sophie.dubois@example.com",
    jobTitle: "Translator",
    city: "Lyon",
    timezone: "Europe/Paris",
    circle: "wider",
    howMet: "Evening French class that I abandoned",
    tags: ["language"],
    status: "in_touch",
    birthday: { month: 3, day: 29, year: 1990 },
    facts: ["Corrects my emails, kindly"],
    photo: false,
  },
  {
    name: "Raj Gupta",
    email: "raj.gupta@example.com",
    phone: "+44 20 7946 0881",
    jobTitle: "Accountant",
    company: "Grant Thornton",
    city: "London",
    timezone: "Europe/London",
    circle: "wider",
    howMet: "Sunday cricket in Regent's Park",
    tags: ["cricket"],
    status: "in_touch",
    birthday: { month: 12, day: 16, year: 1983 },
    facts: ["Keeps score in a paper book"],
  },
  {
    name: "Amara Diallo",
    email: "amara.diallo@example.com",
    jobTitle: "Filmmaker",
    city: "Paris",
    timezone: "Europe/Paris",
    circle: "wider",
    howMet: "Maya introduced us at a screening",
    tags: ["film"],
    status: "in_touch",
    birthday: { month: 7, day: 21, year: 1992 },
    news: [{ content: "Documentary got into IDFA", daysAgo: 4 }],
    photo: false,
  },
  {
    name: "Nick Brennan",
    email: "nick.brennan@example.com",
    phone: "+1 512 555 0190",
    jobTitle: "Personal trainer",
    city: "Austin",
    timezone: "America/Chicago",
    circle: "wider",
    howMet: "The gym I used for three months",
    tags: ["fitness"],
    status: "in_touch",
    birthday: { month: 4, day: 4, year: 1991 },
    photo: false,
  },
  {
    name: "Yuki Tanaka",
    email: "yuki.tanaka@example.com",
    jobTitle: "Software engineer",
    company: "Mercari",
    city: "Tokyo",
    timezone: "Asia/Tokyo",
    circle: "wider",
    howMet: "Desk neighbours at the old job",
    tags: ["work"],
    status: "in_touch",
    birthday: { month: 9, day: 9, year: 1988 },
    facts: ["Sends stickers instead of punctuation"],
    extraDates: [{ type: "other", label: "Moved back to Tokyo", month: 8, day: 1, year: 2022 }],
  },
  {
    name: "Clara Mendes",
    email: "clara.mendes@example.com",
    jobTitle: "Veterinarian",
    city: "Lisbon",
    timezone: "Europe/Lisbon",
    circle: "wider",
    howMet: "Parents' friends' daughter, then actually friends",
    tags: ["family-friends"],
    status: "in_touch",
    birthday: { month: 2, day: 14, year: 1993 },
    facts: ["Has two rescue greyhounds, Vasco and Lila"],
    photo: false,
  },
  {
    name: "Hannah Brooks",
    email: "hannah.brooks@example.com",
    jobTitle: "Brand manager",
    company: "Guinness",
    city: "Dublin",
    timezone: "Europe/Dublin",
    circle: "distant",
    howMet: "School, sixth form, the long version",
    tags: ["school"],
    status: "overdue",
    overdueBy: 5,
    birthday: monthDay(3, 6),
    facts: ["Still quotes the same three films"],
  },
  {
    name: "Omar Haddad",
    email: "omar.haddad@example.com",
    jobTitle: "Consultant",
    company: "Independent",
    city: "Dubai",
    timezone: "Asia/Dubai",
    circle: "distant",
    howMet: "First job mentor",
    tags: ["work"],
    status: "in_touch",
    birthday: { month: 8, day: 2, year: 1975 },
    notes: "The person who taught me to write a decent email.",
  },
  {
    name: "Lily Nguyen",
    email: "lily.nguyen@example.com",
    jobTitle: "Design ops",
    company: "Airbnb",
    city: "Los Angeles",
    timezone: "America/Los_Angeles",
    circle: "distant",
    howMet: "Summer internship, same pod",
    tags: ["work"],
    status: "in_touch",
    birthday: { month: 6, day: 6, year: 1996 },
    photo: false,
  },
  {
    name: "Peter Kowalski",
    email: "peter.kowalski@example.com",
    jobTitle: "Professor",
    company: "University of Warsaw",
    city: "Warsaw",
    timezone: "Europe/Warsaw",
    circle: "distant",
    howMet: "Asked a question after my talk, then coffee for two hours",
    tags: ["research"],
    status: "in_touch",
    birthday: { month: 10, day: 28, year: 1971 },
  },
  {
    name: "Fatima Al-Sayed",
    email: "fatima.alsayed@example.com",
    jobTitle: "Correspondent",
    city: "Cairo",
    timezone: "Africa/Cairo",
    circle: "distant",
    howMet: "Cousin's wedding",
    tags: ["family-friends", "journalism"],
    status: "in_touch",
    birthday: { month: 3, day: 12, year: 1989 },
    photo: false,
  },
  {
    name: "Daniel Ruiz",
    email: "daniel.ruiz@example.com",
    phone: "+1 303 555 0148",
    jobTitle: "Shop owner",
    company: "High Plains Cycles",
    city: "Denver",
    timezone: "America/Denver",
    circle: "distant",
    checkinsEnabled: false,
    howMet: "Sold me a bike, then spent an hour setting it up properly",
    tags: ["cycling"],
    notes: "Lovely man. No need to keep a cadence — I'll see him when I need a service.",
    birthday: { month: 5, day: 19, year: 1979 },
  },
  {
    name: "Ingrid Berg",
    email: "ingrid.berg@example.com",
    jobTitle: "Photographer",
    city: "Oslo",
    timezone: "Europe/Oslo",
    circle: "distant",
    howMet: "Hostel kitchen, Oslo, 2019",
    tags: ["travel"],
    status: "in_touch",
    birthday: { month: 12, day: 24, year: 1990 },
    facts: ["Shoots film only"],
    photo: false,
  },
  {
    name: "Michael Thorne",
    email: "michael.thorne@example.com",
    jobTitle: "Retired",
    city: "Boston",
    timezone: "America/New_York",
    circle: "distant",
    howMet: "Old boss, first proper job",
    tags: ["work"],
    status: "in_touch",
    birthday: { month: 7, day: 30, year: 1958 },
    facts: ["Sends clippings in the post"],
    gifts: [{ description: "A book on Boston harbour he mentioned", status: "given", occasion: "Retirement", date: isoDaysAgo(200) }],
  },
];

const CONNECTIONS: { from: string; to: string; type: ConnectionType; label?: string }[] = [
  { from: "Helen Ward", to: "Tom Ward", type: "partner" },
  { from: "David Okonkwo", to: "Helen Ward", type: "parent" },
  { from: "David Okonkwo", to: "Tom Ward", type: "parent" },
  { from: "Maya Chen", to: "Amara Diallo", type: "introduced" },
  { from: "Priya Shah", to: "Samira Nouri", type: "introduced" },
  { from: "Elena Popov", to: "Yuki Tanaka", type: "colleague", label: "Northwind, 2017" },
  { from: "Marcus Johnson", to: "Helen Ward", type: "parent" },
];

export function seedIfEmpty(): void {
  if (countPeople() > 0) return;
  const ids = new Map<string, string>();
  for (const spec of PEOPLE) {
    const person = createPerson({
      name: spec.name,
      email: spec.email,
      phone: spec.phone,
      jobTitle: spec.jobTitle,
      company: spec.company,
      city: spec.city,
      timezone: spec.timezone,
      circle: spec.circle,
      cadenceOverrideDays: spec.cadenceOverrideDays ?? null,
      checkinsEnabled: spec.checkinsEnabled !== false,
      snoozeUntil: spec.snoozeDays != null ? isoDaysAhead(spec.snoozeDays) : null,
      howMet: spec.howMet,
      whereMet: spec.whereMet,
      whenMet: spec.whenMet,
      notes: spec.notes,
      tags: spec.tags,
    });
    ids.set(spec.name, person.id);
    if (spec.photo !== false) {
      setPhoto(person.id, makeAvatarPng(spec.name), "image/png");
    }
    createInteraction({
      personId: person.id,
      type: "other",
      date: isoDaysAgo(400 + (spec.name.length % 20)),
      notes: "Caught up — the long-ago one I still remember.",
    });
    if (spec.status && spec.checkinsEnabled !== false) {
      const cadence = cadenceDaysFor({
        circle: spec.circle,
        cadenceOverrideDays: spec.cadenceOverrideDays ?? null,
        checkinsEnabled: true,
      }) ?? CIRCLE_CADENCE_DAYS[spec.circle];
      createInteraction({
        personId: person.id,
        type: spec.circle === "inner" ? "call" : "message",
        date: isoDaysAgo(lastContactDays(cadence, spec.status, spec.overdueBy)),
        notes: "The last proper catch-up.",
      });
    }
    for (const extra of spec.extraInteractions ?? []) {
      createInteraction({ personId: person.id, type: extra.type, date: isoDaysAgo(extra.daysAgo), notes: extra.notes });
    }
    if (spec.birthday) {
      createImportantDate({
        personId: person.id,
        type: "birthday",
        month: spec.birthday.month,
        day: spec.birthday.day,
        year: spec.birthday.year ?? null,
      });
    }
    for (const d of spec.extraDates ?? []) {
      createImportantDate({
        personId: person.id,
        type: d.type,
        label: d.label,
        month: d.month,
        day: d.day,
        year: d.year ?? null,
      });
    }
    for (const content of spec.facts ?? []) {
      createFact({ personId: person.id, content });
    }
    for (const item of spec.news ?? []) {
      createNews({ personId: person.id, content: item.content, date: isoDaysAgo(item.daysAgo) });
    }
    for (const gift of spec.gifts ?? []) {
      createGift({
        personId: person.id,
        description: gift.description,
        status: gift.status,
        occasion: gift.occasion,
        date: gift.date,
      });
    }
    for (const reminder of spec.reminders ?? []) {
      createReminder({
        personId: person.id,
        content: reminder.content,
        dueDate: reminder.dueDays >= 0 ? isoDaysAhead(reminder.dueDays) : isoDaysAgo(-reminder.dueDays),
        done: reminder.done,
      });
    }
  }
  createReminder({
    personId: ids.get("Michael Thorne")!,
    content: "Write him a proper letter",
    dueDate: isoDaysAgo(12),
    done: true,
  });
  for (const link of CONNECTIONS) {
    const from = ids.get(link.from);
    const to = ids.get(link.to);
    if (from && to) createConnection({ fromPersonId: from, toPersonId: to, type: link.type, label: link.label });
  }
}
