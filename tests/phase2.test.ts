import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { RolodexRepo } from '../server/repo';
import { parseCSVContent, parseVCardContent, detectDuplicates } from '../src/utils/importer';

function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE people (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      photo_url TEXT,
      email TEXT,
      phone TEXT,
      job_title TEXT,
      company TEXT,
      city TEXT,
      time_zone TEXT,
      circle TEXT NOT NULL,
      cadence_override_days INTEGER,
      check_ins_enabled INTEGER NOT NULL DEFAULT 1,
      snooze_until TEXT,
      how_we_met TEXT,
      notes TEXT,
      tags TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE interactions (
      id TEXT PRIMARY KEY,
      person_id TEXT NOT NULL,
      type TEXT NOT NULL,
      date TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE news (
      id TEXT PRIMARY KEY,
      person_id TEXT NOT NULL,
      content TEXT NOT NULL,
      date TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  return db;
}

describe('Phase 2: People management and Import parsing', () => {
  let db: Database.Database;
  let repo: RolodexRepo;

  beforeEach(() => {
    db = createTestDb();
    repo = new RolodexRepo(db);
  });

  it('searches people by name, company, email, city, job_title, or tag', () => {
    repo.createPerson({
      id: 'p1',
      name: 'Sarah Connor',
      email: 'sarah@cyberdyne.com',
      company: 'Cyberdyne Systems',
      city: 'Los Angeles',
      job_title: 'Security Lead',
      circle: 'inner',
      tags: ['security', 'ai'],
    });

    repo.createPerson({
      id: 'p2',
      name: 'John Doe',
      email: 'john@acme.com',
      company: 'Acme Corp',
      city: 'Chicago',
      job_title: 'Architect',
      circle: 'close',
      tags: ['consultant'],
    });

    // Search by name
    expect(repo.getAllPeople({ search: 'Connor' }).length).toBe(1);
    // Search by company
    expect(repo.getAllPeople({ search: 'cyberdyne' }).length).toBe(1);
    // Search by email
    expect(repo.getAllPeople({ search: 'acme.com' }).length).toBe(1);
    // Search by tag
    expect(repo.getAllPeople({ tag: 'security' }).length).toBe(1);
    // Search by circle
    expect(repo.getAllPeople({ circle: 'inner' }).length).toBe(1);
    expect(repo.getAllPeople({ circle: 'distant' }).length).toBe(0);
  });

  it('correctly parses CSV content with mapped headers', () => {
    const csvData = `Full Name,Work Email,Telephone,Position,Organization,Location,Tags
Alex Turner,alex@arctic.com,+44 114 222,Frontman,Arctic Monkeys,Sheffield,"music, indie"
Miles Kane,miles@raskols.com,+44 151 333,Guitarist,The Last Shadow Puppets,Liverpool,"rock"`;

    const { contacts } = parseCSVContent(csvData);
    expect(contacts.length).toBe(2);

    expect(contacts[0].name).toBe('Alex Turner');
    expect(contacts[0].email).toBe('alex@arctic.com');
    expect(contacts[0].company).toBe('Arctic Monkeys');
    expect(contacts[0].city).toBe('Sheffield');
    expect(contacts[0].tags).toEqual(['music', 'indie']);

    expect(contacts[1].name).toBe('Miles Kane');
    expect(contacts[1].tags).toEqual(['rock']);
  });

  it('correctly parses vCard (.vcf) formatted contacts', () => {
    const vcfData = `BEGIN:VCARD
VERSION:3.0
FN:Grace Hopper
N:Hopper;Grace;;Rear Admiral;
ORG:United States Navy;Programming Branch
TITLE:Computer Scientist
TEL;TYPE=WORK,VOICE:+1-202-555-0199
EMAIL;TYPE=PREF,INTERNET:grace.hopper@navy.mil
ADR;TYPE=WORK:;;Arlington National Cemetery;Arlington;VA;22211;USA
NOTE:Pioneer of computer programming and creator of FLOW-MATIC.
CATEGORIES:computing,pioneer,navy
END:VCARD

BEGIN:VCARD
VERSION:3.0
FN:Alan Turing
ORG:Bletchley Park
TITLE:Mathematician
EMAIL:alan@bletchleypark.org.uk
CATEGORIES:cryptography,maths
END:VCARD`;

    const contacts = parseVCardContent(vcfData);
    expect(contacts.length).toBe(2);

    expect(contacts[0].name).toBe('Grace Hopper');
    expect(contacts[0].email).toBe('grace.hopper@navy.mil');
    expect(contacts[0].company).toBe('United States Navy');
    expect(contacts[0].city).toBe('Arlington');
    expect(contacts[0].tags).toEqual(['computing', 'pioneer', 'navy']);

    expect(contacts[1].name).toBe('Alan Turing');
    expect(contacts[1].email).toBe('alan@bletchleypark.org.uk');
  });

  it('accurately flags duplicates against existing contacts by email or name', () => {
    const existingPeople = [
      {
        id: 'ex1',
        name: 'Elena Rostova',
        email: 'elena@designlab.io',
        circle: 'inner' as const,
        tags: [],
        check_ins_enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const parsedContacts = [
      {
        name: 'Elena Rostova',
        email: 'elena.different@domain.com', // same name
        circle: 'inner' as const,
        tags: [],
      },
      {
        name: 'Elena R.',
        email: 'elena@designlab.io', // same email
        circle: 'close' as const,
        tags: [],
      },
      {
        name: 'New Person Entirely',
        email: 'new@fresh.com',
        circle: 'wider' as const,
        tags: [],
      },
    ];

    const flagged = detectDuplicates(parsedContacts, existingPeople);
    expect(flagged[0].isDuplicate).toBe(true);
    expect(flagged[0].duplicateMatchName).toBe('Elena Rostova');

    expect(flagged[1].isDuplicate).toBe(true);
    expect(flagged[1].duplicateMatchName).toBe('Elena Rostova');

    expect(flagged[2].isDuplicate).toBe(false);
  });
});
