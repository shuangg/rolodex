import type { DatabaseSync } from "node:sqlite";
import type { Circle, GiftStatus, ImportantDateKind, InteractionType } from "../src/types";

export function seedIfEmpty(db: DatabaseSync): boolean {
  const count = (db.prepare("SELECT COUNT(*) AS c FROM people").get() as { c: number }).c;
  if (Number(count) > 0) return false;
  seed(db);
  return true;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function isoDaysAhead(days: number): string {
  return isoDaysAgo(-days);
}

function isoNow(): string {
  return new Date().toISOString();
}

function monthAhead(n: number): number {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  return d.getMonth() + 1;
}

interface PersonSpec {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  company?: string;
  city?: string;
  timeZone?: string;
  circle: Circle;
  tags?: string[];
  notes?: string;
  howMet?: string;
  whereMet?: string;
  whenMet?: string;
  photo?: boolean;
  birthday?: [number, number, number?];
  overrideDays?: number;
  optedOut?: boolean;
  snoozeUntil?: string;
  lastOffset?: number;
}

const PEOPLE: PersonSpec[] = [
  { firstName: "Amara", lastName: "Okafor", circle: "inner", city: "London", timeZone: "Europe/London", company: "Foundry Labs", jobTitle: "Co-founder", email: "amara@foundrylabs.io", phone: "+44 7700 900123", tags: ["family", "university"], howMet: "Met at university, same halls of residence", whereMet: "Imperial College", whenMet: "2008", notes: "Twin sister Tola. Nervous about the funding round.", birthday: [5, 17, 1986] },
  { firstName: "Jonas", lastName: "Lindqvist", circle: "inner", city: "Stockholm", timeZone: "Europe/Stockholm", company: "Nordwind", jobTitle: "CTO", email: "jonas@nordwind.se", phone: "+46 70 123 4567", tags: ["work", "cycling"], howMet: "We were both on the same open-source maintainer list", whereMet: "Online", whenMet: "2019", notes: "Got a Brompton. Rides the archipelago loop every summer.", birthday: [2, 29, 1996] },
  { firstName: "Priya", lastName: "Nair", circle: "inner", city: "Bengaluru", timeZone: "Asia/Kolkata", company: "Kite Software", jobTitle: "Design Director", email: "priya@kite.software", phone: "+91 98450 12345", tags: ["work", "university"], howMet: "Worked together at an agency", whereMet: "Bengaluru", whenMet: "2015", notes: "Partner Rohan works at Swiggy. Dog is called Mango.", birthday: [4, 8, 1989] },
  { firstName: "Marcus", lastName: "Bell", circle: "inner", city: "New York", timeZone: "America/New_York", company: "Bell & Byrne", jobTitle: "Owner", email: "marcus@bellbyrne.com", phone: "+1 212 555 0148", tags: ["family"], howMet: "Childhood neighbours", whereMet: "Brooklyn", whenMet: "1994", notes: "Plays bass in a Neil Young tribute band.", birthday: [9, 3, 1981], lastOffset: 3 },
  { firstName: "Sofia", lastName: "Reyes", circle: "close", city: "Madrid", timeZone: "Europe/Madrid", company: "Casa Reyes", jobTitle: "Architect", email: "sofia@casa-reyes.es", phone: "+34 612 345 678", tags: ["family"], howMet: "Married to my cousin Daniel", whereMet: "Family wedding", whenMet: "2012", notes: "Restoring a 1920s townhouse in Malasaña.", birthday: [11, 14, 1979], lastOffset: 95 },
  { firstName: "Daniel", lastName: "Reyes", circle: "close", city: "Madrid", timeZone: "Europe/Madrid", company: "Casa Reyes", jobTitle: "Surgeon", email: "daniel@casa-reyes.es", phone: "+34 611 222 333", tags: ["family"], howMet: "My cousin's husband", whereMet: "Family wedding", whenMet: "2012", notes: "Runs marathons. Doing the Madrid one in April.", birthday: [6, 22, 1980] },
  { firstName: "Yuki", lastName: "Tanaka", circle: "close", city: "Tokyo", timeZone: "Asia/Tokyo", company: "Miru", jobTitle: "Product Manager", email: "yuki@miru.jp", phone: "+81 90 1234 5678", tags: ["work", "ex-colleague"], howMet: "Shared an office in Shibuya", whereMet: "Tokyo", whenMet: "2017", notes: "Always a good month to travel: May and October.", birthday: [10, 5, 1991], lastOffset: 100 },
  { firstName: "Rosa", lastName: "Garcia", circle: "close", city: "Mexico City", timeZone: "America/Mexico_City", company: "Tortilla Tech", jobTitle: "Head of People", email: "rosa@tortillatech.mx", phone: "+52 55 1234 5678", tags: ["family", "university"], howMet: "Met at a mutual friend's birthday", whereMet: "Mexico City", whenMet: "2016", notes: "Hosts an amazing Christmas dinner every year.", birthday: [7, 30, 1987] },
  { firstName: "Elena", lastName: "Kovacs", circle: "close", city: "Budapest", timeZone: "Europe/Budapest", company: "Duna Data", jobTitle: "Data Scientist", email: "elena@dunadata.hu", phone: "+36 30 123 4567", tags: ["ex-colleague"], howMet: "Worked together at a bank", whereMet: "Budapest", whenMet: "2014", notes: "Started a folk dance class this year.", birthday: [1, 12, 1993], lastOffset: 84 },
  { firstName: "Felix", lastName: "Meyer", circle: "close", city: "Berlin", timeZone: "Europe/Berlin", company: "Alte Mauer", jobTitle: "Journalist", email: "felix@altemauer.de", phone: "+49 170 1234567", tags: ["university", "cycling"], howMet: "Met on a cycling trip", whereMet: "Bodensee", whenMet: "2011", notes: "Writing a book about the Berlin Wall bicycle routes.", birthday: [3, 25, 1983] },
  { firstName: "Nadia", lastName: "Haddad", circle: "close", city: "Dubai", timeZone: "Asia/Dubai", company: "Sahel Ventures", jobTitle: "Partner", email: "nadia@sahel.vc", phone: "+971 50 123 4567", tags: ["work"], howMet: "Introduced by Jonas", whereMet: "Dubai", whenMet: "2020", notes: "Knows everyone in the region. Ask her before any trip.", birthday: [8, 9, 1988], lastOffset: 88 },
  { firstName: "Tom", lastName: "Ferguson", circle: "close", city: "Sydney", timeZone: "Australia/Sydney", company: "Harbour AI", jobTitle: "Engineer", email: "tom@harbourai.com.au", phone: "+61 400 123 456", tags: ["work", "surfing"], howMet: "Met at a conference", whereMet: "Melbourne", whenMet: "2018", notes: "Surfs before work when the swell is up.", birthday: [12, 1, 1990], lastOffset: 92 },
  { firstName: "Ingrid", lastName: "Larsen", circle: "wider", city: "Oslo", timeZone: "Europe/Oslo", company: "Fjord Digital", jobTitle: "Counsel", email: "ingrid@fjorddigital.no", phone: "+47 900 12 345", tags: ["work"], howMet: "Met through a legal referral", whereMet: "Oslo", whenMet: "2021", notes: "Cross-country skis most weekends in winter.", birthday: [2, 18, 1985], lastOffset: 140 },
  { firstName: "Kenji", lastName: "Sato", circle: "wider", city: "Osaka", timeZone: "Asia/Tokyo", company: "Umai Foods", jobTitle: "Founder", email: "kenji@umaifoods.jp", phone: "+81 80 1234 5678", tags: ["work"], howMet: "Introduced by Yuki", whereMet: "Osaka", whenMet: "2022", notes: "Always brings amazing snacks to meetings.", birthday: [5, 29, 1987], lastOffset: 150 },
  { firstName: "Layla", lastName: "Benali", circle: "wider", city: "Casablanca", timeZone: "Africa/Casablanca", company: "Atlas Studio", jobTitle: "Illustrator", email: "layla@atlasstudio.ma", phone: "+212 6 61 23 45 67", tags: ["art"], howMet: "Commissioned her for a project", whereMet: "Online", whenMet: "2020", notes: "Watercolours cities she travels to.", birthday: [9, 12, 1994], lastOffset: 130 },
  { firstName: "Hugo", lastName: "Silva", circle: "wider", city: "Lisbon", timeZone: "Europe/Lisbon", company: "Azulejo Systems", jobTitle: "Ops Lead", email: "hugo@azulejo.pt", phone: "+351 912 345 678", tags: ["work", "football"], howMet: "Met at a DevOps meetup", whereMet: "Lisbon", whenMet: "2019", notes: "Supports Benfica. Do not tease him about it.", birthday: [4, 16, 1992], lastOffset: 155 },
  { firstName: "Chloe", lastName: "Dubois", circle: "wider", city: "Paris", timeZone: "Europe/Paris", company: "Vélo Club", jobTitle: "Events Manager", email: "chloe@veloclub.fr", phone: "+33 6 12 34 56 78", tags: ["cycling"], howMet: "Met at the weekly group ride", whereMet: "Paris", whenMet: "2018", notes: "Organises the summer alpine ride every year.", birthday: [7, 7, 1990], lastOffset: 130 },
  { firstName: "Sven", lastName: "Johansson", circle: "wider", city: "Gothenburg", timeZone: "Europe/Stockholm", company: "Volvo Research", jobTitle: "Scientist", email: "sven@volvoresearch.se", phone: "+46 73 456 7890", tags: ["university"], howMet: "Shared a supervisor at university", whereMet: "Gothenburg", whenMet: "2009", notes: "Has three kids and a very old Volvo.", birthday: [10, 21, 1981], lastOffset: 190 },
  { firstName: "Amina", lastName: "Diallo", circle: "wider", city: "Dakar", timeZone: "Africa/Dakar", company: "Teranga Media", jobTitle: "Producer", email: "amina@teranga.sn", phone: "+221 77 123 45 67", tags: ["work", "university"], howMet: "Met at a film festival", whereMet: "Dakar", whenMet: "2017", notes: "Producing a documentary about street music.", birthday: [6, 6, 1985], lastOffset: 150 },
  { firstName: "Leo", lastName: "Klein", circle: "wider", city: "Vienna", timeZone: "Europe/Vienna", company: "Wunderkammer", jobTitle: "Curator", email: "leo@wunderkammer.at", phone: "+43 660 1234567", tags: ["art"], howMet: "Met through a gallery opening", whereMet: "Vienna", whenMet: "2021", notes: "Can talk about coffee for hours.", birthday: [11, 2, 1989], lastOffset: 165 },
  { firstName: "Marta", lastName: "Nowak", circle: "wider", city: "Warsaw", timeZone: "Europe/Warsaw", company: "Brama Labs", jobTitle: "Backend Engineer", email: "marta@bramalabs.pl", phone: "+48 600 123 456", tags: ["work"], howMet: "Met at a hackathon", whereMet: "Warsaw", whenMet: "2021", notes: "Climbs at the local bouldering gym twice a week.", birthday: [3, 9, 1995], lastOffset: 145 },
  { firstName: "Kwame", lastName: "Asante", circle: "wider", city: "Accra", timeZone: "Africa/Accra", company: "Adinkra Code", jobTitle: "Frontend Lead", email: "kwame@adinkracode.com", phone: "+233 24 123 4567", tags: ["work"], howMet: "Met at a conference in Accra", whereMet: "Accra", whenMet: "2020", notes: "Runs a weekend coding club for teenagers.", birthday: [1, 25, 1990], lastOffset: 150 },
  { firstName: "Isabella", lastName: "Rossi", circle: "wider", city: "Milan", timeZone: "Europe/Rome", company: "Studio Milano", jobTitle: "Fashion Buyer", email: "isabella@studiomilano.it", phone: "+39 340 123 4567", tags: ["work", "art"], howMet: "Met through a mutual friend", whereMet: "Milan", whenMet: "2019", notes: "Always knows the best restaurants.", birthday: [12, 9, 1986], lastOffset: 200 },
  { firstName: "Owen", lastName: "Bradley", circle: "distant", city: "Dublin", timeZone: "Europe/Dublin", company: "Emerald Systems", jobTitle: "Solutions Architect", email: "owen@emeraldsystems.ie", phone: "+353 87 123 4567", tags: ["ex-colleague"], howMet: "Worked together at a telecom", whereMet: "Dublin", whenMet: "2010", notes: "Plays the tin whistle badly, happily.", birthday: [5, 11, 1984], lastOffset: 280 },
  { firstName: "Grace", lastName: "Kimani", circle: "distant", city: "Nairobi", timeZone: "Africa/Nairobi", company: "Savanna Health", jobTitle: "Public Health Lead", email: "grace@savannahealth.ke", phone: "+254 700 123 456", tags: ["university"], howMet: "Met while volunteering", whereMet: "Nairobi", whenMet: "2013", notes: "Fluent in five languages.", birthday: [8, 17, 1983], lastOffset: 300 },
  { firstName: "Arjun", lastName: "Sharma", circle: "distant", city: "Mumbai", timeZone: "Asia/Kolkata", company: "Coral Films", jobTitle: "Director", email: "arjun@coralfilms.in", phone: "+91 98200 12345", tags: ["art", "university"], howMet: "Met at a film screening", whereMet: "Mumbai", whenMet: "2015", notes: "His short film won at a festival last year.", birthday: [2, 5, 1988], lastOffset: 250 },
  { firstName: "Elif", lastName: "Yilmaz", circle: "distant", city: "Istanbul", timeZone: "Europe/Istanbul", company: "Bosphorus Digital", jobTitle: "Marketing", email: "elif@bosphorusdigital.com.tr", phone: "+90 532 123 4567", tags: ["work"], howMet: "Met at a marketing summit", whereMet: "Istanbul", whenMet: "2019", notes: "Her cat is named Sultan.", birthday: [9, 28, 1992], lastOffset: 300 },
  { firstName: "Marco", lastName: "Romano", circle: "distant", city: "Rome", timeZone: "Europe/Rome", company: "Piazza Apps", jobTitle: "Mobile Engineer", email: "marco@piazzaapps.it", phone: "+39 328 123 4567", tags: ["work"], howMet: "Met through Isabella", whereMet: "Rome", whenMet: "2020", notes: "Makes an espresso worth travelling for.", birthday: [6, 30, 1993], lastOffset: 280 },
  { firstName: "Zara", lastName: "Ali", circle: "distant", city: "Karachi", timeZone: "Asia/Karachi", company: "Sindh Studio", jobTitle: "Animator", email: "zara@sindhstudio.pk", phone: "+92 300 1234567", tags: ["art"], howMet: "Met at an animation workshop", whereMet: "Karachi", whenMet: "2021", notes: "Illustrates children's books in her spare time.", birthday: [11, 19, 1996], lastOffset: 310 },
  { firstName: "Noah", lastName: "Johnson", circle: "distant", city: "Austin", timeZone: "America/Chicago", company: "Cactus Software", jobTitle: "DevRel", email: "noah@cactussoftware.dev", phone: "+1 512 555 0123", tags: ["work"], howMet: "Met at SXSW", whereMet: "Austin", whenMet: "2019", notes: "Has a collection of vintage keyboards.", birthday: [4, 27, 1991], lastOffset: 380 },
  { firstName: "Hana", lastName: "Kim", circle: "distant", city: "Seoul", timeZone: "Asia/Seoul", company: "Hanul Labs", jobTitle: "ML Engineer", email: "hana@hanullabs.kr", phone: "+82 10 1234 5678", tags: ["work"], howMet: "Met at a research meetup", whereMet: "Seoul", whenMet: "2022", notes: "Learning to play the gayageum.", birthday: [12, 23, 1994], lastOffset: 330 },
  { firstName: "Paul", lastName: "Anderson", circle: "distant", city: "Cape Town", timeZone: "Africa/Johannesburg", company: "Table Mountain Tech", jobTitle: "Growth", email: "paul@tablemountaintech.co.za", phone: "+27 82 123 4567", tags: ["ex-colleague", "cycling"], howMet: "Worked together at a startup", whereMet: "Cape Town", whenMet: "2017", notes: "Cycles Chapman's Peak every Sunday.", birthday: [1, 14, 1986], lastOffset: 300 },
  { firstName: "Olga", lastName: "Petrova", circle: "distant", city: "Prague", timeZone: "Europe/Prague", company: "Vitava Code", jobTitle: "QA Lead", email: "olga@vitavacode.cz", phone: "+420 601 123 456", tags: ["work"], howMet: "Met at a testing conference", whereMet: "Prague", whenMet: "2021", notes: "Bakes the best apple strudel in Prague.", birthday: [7, 13, 1990], lastOffset: 400 },
  { firstName: "Victor", lastName: "Moreau", circle: "distant", city: "Montreal", timeZone: "America/Toronto", company: "Neige AI", jobTitle: "Research Scientist", email: "victor@neige.ai", phone: "+1 514 555 0145", tags: ["work"], howMet: "Met at a machine learning seminar", whereMet: "Montreal", whenMet: "2022", notes: "Plays ice hockey in a beer league.", birthday: [3, 2, 1990], lastOffset: 280 },
  { firstName: "Mei", lastName: "Chen", circle: "distant", city: "Singapore", timeZone: "Asia/Singapore", company: "Lotus Fintech", jobTitle: "Compliance", email: "mei@lotusfintech.sg", phone: "+65 8123 4567", tags: ["work"], howMet: "Met through Kenji", whereMet: "Singapore", whenMet: "2021", notes: "Collects Hawker Centre food reviews.", birthday: [10, 8, 1993], lastOffset: 410 },
];

const INTERACTION_TYPES: InteractionType[] = ["call", "message", "email", "meetup", "other"];
const INTERACTION_NOTES = [
  "Caught up properly, lots of ground to cover.",
  "Quick check-in. All good.",
  "Talked about the new job. Sounds like a good fit.",
  "Planning to meet up next month.",
  "Talked about their family. Kids are growing fast.",
  "Shared a project update and asked for feedback.",
  "Chat about a book we're both reading.",
  "Confirmed travel plans.",
  "Caught up on holiday photos.",
  "Discussed a potential collaboration.",
];

const FACTS = [
  "Allergic to shellfish.",
  "Partner is called Sam.",
  "Supports Arsenal since the 90s.",
  "Vegetarian — no meat, no fish.",
  "Speaks fluent French.",
  "Has a dog called Mango.",
  "Bought a house last year.",
  "Collects old maps.",
  "Learning Spanish.",
  "Doesn't drink coffee after 2pm.",
];

const NEWS = [
  "Started a new job",
  "Moved to a new city",
  "Second baby due in March",
  "Got engaged",
  "Launched their own company",
  "Finished a marathon",
  "Bought their first flat",
  "Adopted a cat",
  "Won an award at work",
  "Planning a big trip to Japan",
];

function svgAvatar(firstName: string, lastName: string | null, color: string): string {
  const initial = (firstName[0] ?? "?").toUpperCase();
  const second = (lastName?.[0] ?? "").toUpperCase();
  const label = initial + second;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
  <rect width="120" height="120" fill="${color}"/>
  <circle cx="60" cy="44" r="22" fill="#ffffff" opacity="0.92"/>
  <path d="M60 74 C38 74 26 88 26 102 L94 102 C94 88 82 74 60 74 Z" fill="#ffffff" opacity="0.92"/>
  <text x="60" y="120" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="bold" fill="${color}">${label}</text>
</svg>`;
}

function hashColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const palette = ["#209dd7", "#753991", "#2e9e6b", "#e07b39", "#c0392b", "#8e6f3a", "#16697a", "#6a3093"];
  return palette[h % palette.length];
}

function seed(db: DatabaseSync): void {
  const rand = mulberry32(20260214);
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];

  const now = isoNow();
  const next3 = [monthAhead(1), monthAhead(2), monthAhead(3)];
  const monthBirthdays: [number, number][] = [
    [next3[0], 12],
    [next3[1], 7],
    [next3[2], 24],
  ];
  let mbIndex = 0;
  let peopleIndex = 0;

  for (const spec of PEOPLE) {
    const createdAt = isoDaysAgo(10 + peopleIndex * 4 + Math.floor(rand() * 3));
    peopleIndex++;
    const name = `${spec.firstName} ${spec.lastName ?? ""}`;
    const color = hashColor(name);
    const hasPhoto = spec.photo ?? rand() < 0.15;
    const tags = JSON.stringify(spec.tags ?? []);
    const insert = db.prepare(`
      INSERT INTO people (
        first_name, last_name, email, phone, job_title, company, city, time_zone, circle,
        cadence_override_days, checkins_opted_out, snooze_until, how_met, where_met, when_met,
        notes, tags, photo, photo_mime, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const snoozeUntil = spec.snoozeUntil ?? null;
    insert.run(
      spec.firstName,
      spec.lastName ?? null,
      spec.email ?? `${spec.firstName.toLowerCase()}.${spec.lastName?.toLowerCase() ?? "x"}@example.com`,
      spec.phone ?? null,
      spec.jobTitle ?? null,
      spec.company ?? null,
      spec.city ?? null,
      spec.timeZone ?? null,
      spec.circle,
      spec.overrideDays ?? null,
      spec.optedOut ? 1 : 0,
      snoozeUntil,
      spec.howMet ?? null,
      spec.whereMet ?? null,
      spec.whenMet ?? null,
      spec.notes ?? null,
      tags,
      hasPhoto ? Buffer.from(svgAvatar(spec.firstName, spec.lastName ?? null, color), "utf8") : null,
      hasPhoto ? "image/svg+xml" : null,
      createdAt,
      createdAt,
    );
    const personId = Number((db.prepare("SELECT last_insert_rowid() AS id").get() as { id: number }).id);

    // Birthday: assign next-3-months birthdays to specific people.
    let birthday = spec.birthday;
    if (!birthday && mbIndex < 3) {
      const [m, d] = monthBirthdays[mbIndex];
      mbIndex++;
      birthday = [m, d, 1986 + Math.floor(rand() * 12)];
    }
    if (birthday) {
      const [m, d, y] = birthday;
      db.prepare(
        "INSERT INTO important_dates (person_id, kind, label, month, day, year, created_at) VALUES (?, 'birthday', NULL, ?, ?, ?, ?)",
      ).run(personId, m, d, y ?? null, isoDaysAgo(3 + Math.floor(rand() * 120)));
    }
    if (rand() < 0.35) {
      const kind = pick<ImportantDateKind>(["anniversary", "work_anniversary", "child_birthday", "other"]);
      const m = 1 + Math.floor(rand() * 12);
      const d = 1 + Math.floor(rand() * 27);
      const y = rand() < 0.5 ? 2000 + Math.floor(rand() * 24) : null;
      const label = kind === "other" ? "Started their band" : null;
      db.prepare(
        "INSERT INTO important_dates (person_id, kind, label, month, day, year, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      ).run(personId, kind, label, m, d, y, isoDaysAgo(3 + Math.floor(rand() * 120)));
    }

    // Interaction history: last contact ~400 days ago, stepping forward.
    const cadence: Record<Circle, number> = { inner: 30, close: 90, wider: 180, distant: 365 };
    const effective = spec.overrideDays ?? cadence[spec.circle];
    let lastOffset = spec.lastOffset;
    if (lastOffset == null) {
      const u = rand();
      const cad = effective;
      if (u < 0.18) {
        lastOffset = Math.floor(cad + 2 + (u / 0.18) * cad * 0.8);
      } else if (u < 0.38) {
        lastOffset = Math.floor(cad * (0.9 + ((u - 0.18) / 0.2) * 0.1));
      } else {
        lastOffset = Math.floor(cad * (0.15 + ((u - 0.38) / 0.62) * 0.7));
      }
      lastOffset = Math.max(3, lastOffset);
    }
    const history: number[] = [];
    for (let offset = 400; offset > lastOffset; ) {
      history.push(offset);
      offset -= Math.floor(effective * (0.7 + rand() * 0.6));
    }
    history.push(lastOffset);
    const historyDates = [...history];
    for (const offset of historyDates) {
      db.prepare(
        "INSERT INTO interactions (person_id, type, occurred_on, notes, created_at) VALUES (?, ?, ?, ?, ?)",
      ).run(personId, pick(INTERACTION_TYPES), isoDaysAgo(offset), rand() < 0.7 ? pick(INTERACTION_NOTES) : null, isoDaysAgo(offset));
    }

    // Facts for some people.
    if (rand() < 0.4) {
      const n = 1 + Math.floor(rand() * 2);
      for (let i = 0; i < n; i++) {
        db.prepare("INSERT INTO facts (person_id, text, created_at) VALUES (?, ?, ?)").run(
          personId,
          pick(FACTS),
          now,
        );
      }
    }

    // News for some people.
    if (rand() < 0.5) {
      const age = Math.floor(rand() * 200);
      db.prepare("INSERT INTO news (person_id, text, happened_on, created_at) VALUES (?, ?, ?, ?)").run(
        personId,
        `${pick(NEWS)}`,
        isoDaysAgo(age),
        isoDaysAgo(age),
      );
    }

    // Reminders for some people.
    if (rand() < 0.35) {
      const done = rand() < 0.4;
      const dueOffset = done ? Math.floor(rand() * 60) : -Math.floor(rand() * 45) - 3;
      const title = pick(["Call to check in", "Send the article", "Book a coffee", "Reply about the trip", "Ask about the project", "Catch up on the news"]);
      const dueOn = done ? isoDaysAgo(dueOffset) : isoDaysAhead(dueOffset);
      db.prepare(
        "INSERT INTO reminders (person_id, title, due_on, done, done_at, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      ).run(personId, title, dueOn, done ? 1 : 0, done ? isoDaysAgo(1 + Math.floor(rand() * dueOffset)) : null, isoDaysAgo(30 + Math.floor(rand() * 60)));
    }
  }

  // Ensure every circle is populated (already true, but guarantee statuses).
  const all = db.prepare("SELECT id, first_name, last_name, circle FROM people").all() as {
    id: number;
    first_name: string;
    last_name: string | null;
    circle: Circle;
  }[];

  // Snoozed person: travelling until next week.
  const snoozer = all.find((p) => p.first_name === "Chloe");
  if (snoozer) {
    db.prepare("UPDATE people SET snooze_until = ? WHERE id = ?").run(isoDaysAhead(10), snoozer.id);
  }

  // Opted-out person.
  const optedOut = all.find((p) => p.first_name === "Owen");
  if (optedOut) {
    db.prepare("UPDATE people SET checkins_opted_out = 1 WHERE id = ?").run(optedOut.id);
  }

  // Custom cadence override.
  const overridden = all.find((p) => p.first_name === "Yuki");
  if (overridden) {
    db.prepare("UPDATE people SET cadence_override_days = 60 WHERE id = ?").run(overridden.id);
  }

  // Connections between people.
  const byName = (first: string) => all.find((p) => p.first_name === first);
  const connect = (a: string, b: string, label: string) => {
    const pa = byName(a);
    const pb = byName(b);
    if (!pa || !pb) return;
    const exists = db
      .prepare(
        "SELECT id FROM connections WHERE (person_a_id = ? AND person_b_id = ?) OR (person_a_id = ? AND person_b_id = ?)",
      )
      .get(pa.id, pb.id, pb.id, pa.id);
    if (!exists) {
      db.prepare(
        "INSERT INTO connections (person_a_id, person_b_id, label, created_at) VALUES (?, ?, ?, ?)",
      ).run(pa.id, pb.id, label, isoDaysAgo(5 + Math.floor(rand() * 150)));
    }
  };
  connect("Sofia", "Daniel", "partner");
  connect("Priya", "Rosa", "sibling");
  connect("Jonas", "Nadia", "colleague");
  connect("Nadia", "Marcus", "colleague");
  connect("Kenji", "Yuki", "colleague");
  connect("Mei", "Kenji", "partner");
  connect("Marcus", "Amara", "parent");
  connect("Tom", "Chloe", "colleague");

  // Gifts for some people.
  const giftIdeas = [
    { text: "A vintage map of Tokyo", status: "idea" as GiftStatus, occasion: "Birthday" },
    { text: "Coffee subscription — speciality roasters", status: "idea" as GiftStatus, occasion: "Just because" },
    { text: "The new Neil Young box set", status: "given" as GiftStatus, occasion: "Christmas" },
    { text: "Watercolour brush set", status: "idea" as GiftStatus, occasion: "Birthday" },
    { text: "A Brompton saddle bag", status: "given" as GiftStatus, occasion: "Birthday" },
    { text: "Tripod for the documentary camera", status: "received" as GiftStatus, occasion: "Birthday" },
    { text: "Gayageum starter course voucher", status: "idea" as GiftStatus, occasion: "Birthday" },
    { text: "Hockey sticks — they wear out fast", status: "idea" as GiftStatus, occasion: "Christmas" },
  ];
  const giftPeople = [0, 1, 2, 3, 6, 8, 12, 19, 24, 27];
  giftPeople.forEach((idx, i) => {
    const p = all[idx];
    if (!p) return;
    const g = giftIdeas[i % giftIdeas.length];
    db.prepare(
      "INSERT INTO gifts (person_id, text, status, occasion, date, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(p.id, g.text, g.status, g.occasion, g.status === "given" || g.status === "received" ? isoDaysAgo(Math.floor(rand() * 300)) : null, isoDaysAgo(4 + Math.floor(rand() * 180)));
  });

  // A couple of extra gift ideas on people with upcoming birthdays (for Phase 6 surfacing).
  const birthdaySoon = all
    .map((p) => {
      const b = db
        .prepare("SELECT month, day FROM important_dates WHERE person_id = ? AND kind = 'birthday'")
        .get(p.id) as { month: number; day: number } | undefined;
      return { p, b };
    })
    .filter((x) => x.b);
  const upcoming = birthdaySoon.slice(0, 3);
  for (const { p } of upcoming) {
    db.prepare(
      "INSERT INTO gifts (person_id, text, status, occasion, date, created_at) VALUES (?, ?, 'idea', 'Birthday', NULL, ?)",
    ).run(p.id, pick(["Something for their reading list", "A nice bottle of olive oil", "Tickets to a show", "A plant they won't kill"]), isoDaysAgo(2 + Math.floor(rand() * 90)));
  }
}
