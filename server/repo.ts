import Database from 'better-sqlite3';
import {
  Person,
  PersonWithComputed,
  Interaction,
  ImportantDate,
  Fact,
  News,
  Reminder,
  Gift,
  Connection,
  ConnectionView,
  TimelineItem,
  CircleType,
  RelationshipType,
} from '../shared/types';
import { computeCheckInStatus } from '../shared/cadence';
import { getRelationshipLabel } from '../shared/connections';

export class RolodexRepo {
  constructor(private db: Database.Database) {}

  // --------------------------------------------------------------------------
  // PEOPLE
  // --------------------------------------------------------------------------

  getAllPeople(filters?: { circle?: CircleType; tag?: string; search?: string }): PersonWithComputed[] {
    let sql = `SELECT * FROM people WHERE 1=1`;
    const params: any[] = [];

    if (filters?.circle) {
      sql += ` AND circle = ?`;
      params.push(filters.circle);
    }

    if (filters?.tag) {
      sql += ` AND tags LIKE ?`;
      params.push(`%"${filters.tag}"%`);
    }

    sql += ` ORDER BY name COLLATE NOCASE ASC`;

    const rows = this.db.prepare(sql).all(...params) as any[];

    // Fetch all latest interactions for all people in one query
    const lastInteractions = this.db
      .prepare(
        `SELECT person_id, MAX(date) as last_date 
         FROM interactions 
         GROUP BY person_id`
      )
      .all() as { person_id: string; last_date: string }[];

    const lastInteractionMap = new Map<string, string>();
    for (const item of lastInteractions) {
      lastInteractionMap.set(item.person_id, item.last_date);
    }

    // Fetch all latest news for all people in one query
    const latestNewsRows = this.db
      .prepare(
        `SELECT n.* FROM news n
         INNER JOIN (
           SELECT person_id, MAX(date) as max_date, MAX(created_at) as max_created
           FROM news
           GROUP BY person_id
         ) latest ON n.person_id = latest.person_id AND n.date = latest.max_date
         GROUP BY n.person_id`
      )
      .all() as any[];

    const latestNewsMap = new Map<string, News>();
    for (const n of latestNewsRows) {
      latestNewsMap.set(n.person_id, {
        id: n.id,
        person_id: n.person_id,
        content: n.content,
        date: n.date,
        created_at: n.created_at,
      });
    }

    let people: PersonWithComputed[] = rows.map((r) => {
      const parsedTags = JSON.parse(r.tags || '[]');
      const person: Person = {
        id: r.id,
        name: r.name,
        photo_url: r.photo_url,
        email: r.email,
        phone: r.phone,
        job_title: r.job_title,
        company: r.company,
        city: r.city,
        time_zone: r.time_zone,
        circle: r.circle as CircleType,
        cadence_override_days: r.cadence_override_days,
        check_ins_enabled: Boolean(r.check_ins_enabled),
        snooze_until: r.snooze_until,
        how_we_met: r.how_we_met,
        notes: r.notes,
        tags: parsedTags,
        created_at: r.created_at,
        updated_at: r.updated_at,
      };

      const lastContact = lastInteractionMap.get(r.id) || null;
      const latestNews = latestNewsMap.get(r.id) || null;
      const computed = computeCheckInStatus(person, lastContact);

      return {
        ...person,
        last_contacted: lastContact,
        latest_news: latestNews,
        status: computed.status,
        days_overdue: computed.days_overdue,
        days_until_due: computed.days_until_due,
        effective_cadence_days: computed.effective_cadence_days,
      };
    });

    if (filters?.search) {
      const s = filters.search.toLowerCase().trim();
      people = people.filter(
        (p) =>
          p.name.toLowerCase().includes(s) ||
          (p.company && p.company.toLowerCase().includes(s)) ||
          (p.email && p.email.toLowerCase().includes(s)) ||
          (p.city && p.city.toLowerCase().includes(s)) ||
          (p.job_title && p.job_title.toLowerCase().includes(s)) ||
          p.tags.some((t: string) => t.toLowerCase().includes(s))
      );
    }

    return people;
  }

  getPersonById(id: string): PersonWithComputed | null {
    const row = this.db.prepare(`SELECT * FROM people WHERE id = ?`).get(id) as any;
    if (!row) return null;

    const parsedTags = JSON.parse(row.tags || '[]');
    const person: Person = {
      id: row.id,
      name: row.name,
      photo_url: row.photo_url,
      email: row.email,
      phone: row.phone,
      job_title: row.job_title,
      company: row.company,
      city: row.city,
      time_zone: row.time_zone,
      circle: row.circle as CircleType,
      cadence_override_days: row.cadence_override_days,
      check_ins_enabled: Boolean(row.check_ins_enabled),
      snooze_until: row.snooze_until,
      how_we_met: row.how_we_met,
      notes: row.notes,
      tags: parsedTags,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };

    const lastInteraction = this.db
      .prepare(`SELECT MAX(date) as last_date FROM interactions WHERE person_id = ?`)
      .get(id) as any;
    const lastContact = lastInteraction?.last_date || null;

    const latestNewsRow = this.db
      .prepare(`SELECT * FROM news WHERE person_id = ? ORDER BY date DESC, created_at DESC LIMIT 1`)
      .get(id) as any;

    const latestNews: News | null = latestNewsRow
      ? {
          id: latestNewsRow.id,
          person_id: latestNewsRow.person_id,
          content: latestNewsRow.content,
          date: latestNewsRow.date,
          created_at: latestNewsRow.created_at,
        }
      : null;

    const computed = computeCheckInStatus(person, lastContact);

    return {
      ...person,
      last_contacted: lastContact,
      latest_news: latestNews,
      status: computed.status,
      days_overdue: computed.days_overdue,
      days_until_due: computed.days_until_due,
      effective_cadence_days: computed.effective_cadence_days,
    };
  }

  createPerson(person: Omit<Person, 'created_at' | 'updated_at'> & { created_at?: string; updated_at?: string }): PersonWithComputed {
    const now = new Date().toISOString();
    const created_at = person.created_at || now;
    const updated_at = person.updated_at || now;

    this.db
      .prepare(
        `INSERT INTO people (
          id, name, photo_url, email, phone, job_title, company, city, time_zone,
          circle, cadence_override_days, check_ins_enabled, snooze_until, how_we_met, notes, tags,
          created_at, updated_at
        ) VALUES (
          @id, @name, @photo_url, @email, @phone, @job_title, @company, @city, @time_zone,
          @circle, @cadence_override_days, @check_ins_enabled, @snooze_until, @how_we_met, @notes, @tags,
          @created_at, @updated_at
        )`
      )
      .run({
        id: person.id,
        name: person.name,
        photo_url: person.photo_url || null,
        email: person.email || null,
        phone: person.phone || null,
        job_title: person.job_title || null,
        company: person.company || null,
        city: person.city || null,
        time_zone: person.time_zone || null,
        circle: person.circle,
        cadence_override_days: person.cadence_override_days ?? null,
        check_ins_enabled: person.check_ins_enabled !== false ? 1 : 0,
        snooze_until: person.snooze_until || null,
        how_we_met: person.how_we_met || null,
        notes: person.notes || null,
        tags: JSON.stringify(person.tags || []),
        created_at,
        updated_at,
      });

    return this.getPersonById(person.id)!;
  }

  updatePerson(id: string, updates: Partial<Person>): PersonWithComputed | null {
    const current = this.getPersonById(id);
    if (!current) return null;

    const now = new Date().toISOString();
    const merged: Person = {
      ...current,
      ...updates,
      updated_at: now,
    };

    this.db
      .prepare(
        `UPDATE people SET
          name = @name,
          photo_url = @photo_url,
          email = @email,
          phone = @phone,
          job_title = @job_title,
          company = @company,
          city = @city,
          time_zone = @time_zone,
          circle = @circle,
          cadence_override_days = @cadence_override_days,
          check_ins_enabled = @check_ins_enabled,
          snooze_until = @snooze_until,
          how_we_met = @how_we_met,
          notes = @notes,
          tags = @tags,
          updated_at = @updated_at
        WHERE id = @id`
      )
      .run({
        id,
        name: merged.name,
        photo_url: merged.photo_url || null,
        email: merged.email || null,
        phone: merged.phone || null,
        job_title: merged.job_title || null,
        company: merged.company || null,
        city: merged.city || null,
        time_zone: merged.time_zone || null,
        circle: merged.circle,
        cadence_override_days: merged.cadence_override_days ?? null,
        check_ins_enabled: merged.check_ins_enabled ? 1 : 0,
        snooze_until: merged.snooze_until || null,
        how_we_met: merged.how_we_met || null,
        notes: merged.notes || null,
        tags: JSON.stringify(merged.tags || []),
        updated_at: now,
      });

    return this.getPersonById(id);
  }

  deletePerson(id: string): boolean {
    const result = this.db.prepare(`DELETE FROM people WHERE id = ?`).run(id);
    return result.changes > 0;
  }

  // --------------------------------------------------------------------------
  // INTERACTIONS
  // --------------------------------------------------------------------------

  getInteractionsForPerson(personId: string): Interaction[] {
    const rows = this.db
      .prepare(`SELECT * FROM interactions WHERE person_id = ? ORDER BY date DESC, created_at DESC`)
      .all(personId) as any[];

    return rows.map((r) => ({
      id: r.id,
      person_id: r.person_id,
      type: r.type,
      date: r.date,
      notes: r.notes,
      created_at: r.created_at,
    }));
  }

  createInteraction(interaction: Omit<Interaction, 'created_at'> & { created_at?: string }): Interaction {
    const created_at = interaction.created_at || new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO interactions (id, person_id, type, date, notes, created_at)
         VALUES (@id, @person_id, @type, @date, @notes, @created_at)`
      )
      .run({
        id: interaction.id,
        person_id: interaction.person_id,
        type: interaction.type,
        date: interaction.date,
        notes: interaction.notes || null,
        created_at,
      });

    return {
      ...interaction,
      notes: interaction.notes || null,
      created_at,
    };
  }

  deleteInteraction(id: string): boolean {
    const result = this.db.prepare(`DELETE FROM interactions WHERE id = ?`).run(id);
    return result.changes > 0;
  }

  // --------------------------------------------------------------------------
  // IMPORTANT DATES
  // --------------------------------------------------------------------------

  getImportantDatesForPerson(personId: string): ImportantDate[] {
    const rows = this.db
      .prepare(`SELECT * FROM important_dates WHERE person_id = ? ORDER BY month ASC, day ASC`)
      .all(personId) as any[];

    return rows.map((r) => ({
      id: r.id,
      person_id: r.person_id,
      type: r.type,
      title: r.title,
      month: r.month,
      day: r.day,
      year: r.year,
      created_at: r.created_at,
    }));
  }

  getAllImportantDates(): (ImportantDate & { person_name: string; person_photo?: string | null })[] {
    const rows = this.db
      .prepare(
        `SELECT d.*, p.name as person_name, p.photo_url as person_photo
         FROM important_dates d
         JOIN people p ON d.person_id = p.id
         ORDER BY d.month ASC, d.day ASC`
      )
      .all() as any[];

    return rows.map((r) => ({
      id: r.id,
      person_id: r.person_id,
      person_name: r.person_name,
      person_photo: r.person_photo,
      type: r.type,
      title: r.title,
      month: r.month,
      day: r.day,
      year: r.year,
      created_at: r.created_at,
    }));
  }

  createImportantDate(dateItem: Omit<ImportantDate, 'created_at'> & { created_at?: string }): ImportantDate {
    const created_at = dateItem.created_at || new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO important_dates (id, person_id, type, title, month, day, year, created_at)
         VALUES (@id, @person_id, @type, @title, @month, @day, @year, @created_at)`
      )
      .run({
        id: dateItem.id,
        person_id: dateItem.person_id,
        type: dateItem.type,
        title: dateItem.title || null,
        month: dateItem.month,
        day: dateItem.day,
        year: dateItem.year ?? null,
        created_at,
      });

    return {
      ...dateItem,
      title: dateItem.title || null,
      year: dateItem.year ?? null,
      created_at,
    };
  }

  deleteImportantDate(id: string): boolean {
    const result = this.db.prepare(`DELETE FROM important_dates WHERE id = ?`).run(id);
    return result.changes > 0;
  }

  // --------------------------------------------------------------------------
  // FACTS
  // --------------------------------------------------------------------------

  getFactsForPerson(personId: string): Fact[] {
    const rows = this.db
      .prepare(`SELECT * FROM facts WHERE person_id = ? ORDER BY created_at ASC`)
      .all(personId) as any[];

    return rows.map((r) => ({
      id: r.id,
      person_id: r.person_id,
      fact: r.fact,
      created_at: r.created_at,
    }));
  }

  createFact(factItem: Omit<Fact, 'created_at'> & { created_at?: string }): Fact {
    const created_at = factItem.created_at || new Date().toISOString();
    this.db
      .prepare(`INSERT INTO facts (id, person_id, fact, created_at) VALUES (@id, @person_id, @fact, @created_at)`)
      .run({
        id: factItem.id,
        person_id: factItem.person_id,
        fact: factItem.fact,
        created_at,
      });

    return {
      ...factItem,
      created_at,
    };
  }

  deleteFact(id: string): boolean {
    const result = this.db.prepare(`DELETE FROM facts WHERE id = ?`).run(id);
    return result.changes > 0;
  }

  // --------------------------------------------------------------------------
  // NEWS
  // --------------------------------------------------------------------------

  getNewsForPerson(personId: string): News[] {
    const rows = this.db
      .prepare(`SELECT * FROM news WHERE person_id = ? ORDER BY date DESC, created_at DESC`)
      .all(personId) as any[];

    return rows.map((r) => ({
      id: r.id,
      person_id: r.person_id,
      content: r.content,
      date: r.date,
      created_at: r.created_at,
    }));
  }

  createNews(newsItem: Omit<News, 'created_at'> & { created_at?: string }): News {
    const created_at = newsItem.created_at || new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO news (id, person_id, content, date, created_at)
         VALUES (@id, @person_id, @content, @date, @created_at)`
      )
      .run({
        id: newsItem.id,
        person_id: newsItem.person_id,
        content: newsItem.content,
        date: newsItem.date,
        created_at,
      });

    return {
      ...newsItem,
      created_at,
    };
  }

  deleteNews(id: string): boolean {
    const result = this.db.prepare(`DELETE FROM news WHERE id = ?`).run(id);
    return result.changes > 0;
  }

  // --------------------------------------------------------------------------
  // REMINDERS
  // --------------------------------------------------------------------------

  getRemindersForPerson(personId: string): Reminder[] {
    const rows = this.db
      .prepare(`SELECT * FROM reminders WHERE person_id = ? ORDER BY completed ASC, due_date ASC`)
      .all(personId) as any[];

    return rows.map((r) => ({
      id: r.id,
      person_id: r.person_id,
      title: r.title,
      due_date: r.due_date,
      completed: Boolean(r.completed),
      completed_at: r.completed_at,
      created_at: r.created_at,
    }));
  }

  getAllReminders(): (Reminder & { person_name: string; person_photo?: string | null })[] {
    const rows = this.db
      .prepare(
        `SELECT r.*, p.name as person_name, p.photo_url as person_photo
         FROM reminders r
         JOIN people p ON r.person_id = p.id
         ORDER BY r.completed ASC, r.due_date ASC`
      )
      .all() as any[];

    return rows.map((r) => ({
      id: r.id,
      person_id: r.person_id,
      person_name: r.person_name,
      person_photo: r.person_photo,
      title: r.title,
      due_date: r.due_date,
      completed: Boolean(r.completed),
      completed_at: r.completed_at,
      created_at: r.created_at,
    }));
  }

  createReminder(reminder: Omit<Reminder, 'created_at'> & { created_at?: string }): Reminder {
    const created_at = reminder.created_at || new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO reminders (id, person_id, title, due_date, completed, completed_at, created_at)
         VALUES (@id, @person_id, @title, @due_date, @completed, @completed_at, @created_at)`
      )
      .run({
        id: reminder.id,
        person_id: reminder.person_id,
        title: reminder.title,
        due_date: reminder.due_date,
        completed: reminder.completed ? 1 : 0,
        completed_at: reminder.completed_at || null,
        created_at,
      });

    return {
      ...reminder,
      completed: Boolean(reminder.completed),
      completed_at: reminder.completed_at || null,
      created_at,
    };
  }

  updateReminder(id: string, updates: Partial<Reminder>): Reminder | null {
    const row = this.db.prepare(`SELECT * FROM reminders WHERE id = ?`).get(id) as any;
    if (!row) return null;

    const completed = updates.completed !== undefined ? (updates.completed ? 1 : 0) : row.completed;
    const completed_at =
      updates.completed !== undefined
        ? updates.completed
          ? updates.completed_at || new Date().toISOString()
          : null
        : row.completed_at;

    const title = updates.title !== undefined ? updates.title : row.title;
    const due_date = updates.due_date !== undefined ? updates.due_date : row.due_date;

    this.db
      .prepare(
        `UPDATE reminders SET
          title = @title,
          due_date = @due_date,
          completed = @completed,
          completed_at = @completed_at
        WHERE id = @id`
      )
      .run({
        id,
        title,
        due_date,
        completed,
        completed_at,
      });

    return {
      id,
      person_id: row.person_id,
      title,
      due_date,
      completed: Boolean(completed),
      completed_at,
      created_at: row.created_at,
    };
  }

  deleteReminder(id: string): boolean {
    const result = this.db.prepare(`DELETE FROM reminders WHERE id = ?`).run(id);
    return result.changes > 0;
  }

  // --------------------------------------------------------------------------
  // GIFTS
  // --------------------------------------------------------------------------

  getGiftsForPerson(personId: string): Gift[] {
    const rows = this.db
      .prepare(`SELECT * FROM gifts WHERE person_id = ? ORDER BY created_at DESC`)
      .all(personId) as any[];

    return rows.map((r) => ({
      id: r.id,
      person_id: r.person_id,
      name: r.name,
      status: r.status,
      occasion: r.occasion,
      date: r.date,
      notes: r.notes,
      created_at: r.created_at,
    }));
  }

  createGift(gift: Omit<Gift, 'created_at'> & { created_at?: string }): Gift {
    const created_at = gift.created_at || new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO gifts (id, person_id, name, status, occasion, date, notes, created_at)
         VALUES (@id, @person_id, @name, @status, @occasion, @date, @notes, @created_at)`
      )
      .run({
        id: gift.id,
        person_id: gift.person_id,
        name: gift.name,
        status: gift.status,
        occasion: gift.occasion || null,
        date: gift.date || null,
        notes: gift.notes || null,
        created_at,
      });

    return {
      ...gift,
      occasion: gift.occasion || null,
      date: gift.date || null,
      notes: gift.notes || null,
      created_at,
    };
  }

  updateGift(id: string, updates: Partial<Gift>): Gift | null {
    const current = this.db.prepare(`SELECT * FROM gifts WHERE id = ?`).get(id) as any;
    if (!current) return null;

    const name = updates.name !== undefined ? updates.name : current.name;
    const status = updates.status !== undefined ? updates.status : current.status;
    const occasion = updates.occasion !== undefined ? updates.occasion : current.occasion;
    const date = updates.date !== undefined ? updates.date : current.date;
    const notes = updates.notes !== undefined ? updates.notes : current.notes;

    this.db
      .prepare(
        `UPDATE gifts SET
          name = @name,
          status = @status,
          occasion = @occasion,
          date = @date,
          notes = @notes
        WHERE id = @id`
      )
      .run({
        id,
        name,
        status,
        occasion: occasion || null,
        date: date || null,
        notes: notes || null,
      });

    return {
      id,
      person_id: current.person_id,
      name,
      status,
      occasion,
      date,
      notes,
      created_at: current.created_at,
    };
  }

  deleteGift(id: string): boolean {
    const result = this.db.prepare(`DELETE FROM gifts WHERE id = ?`).run(id);
    return result.changes > 0;
  }

  // --------------------------------------------------------------------------
  // CONNECTIONS
  // --------------------------------------------------------------------------

  getConnectionsForPerson(personId: string): ConnectionView[] {
    const rows = this.db
      .prepare(
        `SELECT c.*,
          pa.id as pa_id, pa.name as pa_name, pa.photo_url as pa_photo, pa.email as pa_email, pa.company as pa_company, pa.job_title as pa_job_title, pa.circle as pa_circle,
          pb.id as pb_id, pb.name as pb_name, pb.photo_url as pb_photo, pb.email as pb_email, pb.company as pb_company, pb.job_title as pb_job_title, pb.circle as pb_circle
         FROM connections c
         JOIN people pa ON c.person_a_id = pa.id
         JOIN people pb ON c.person_b_id = pb.id
         WHERE c.person_a_id = ? OR c.person_b_id = ?`
      )
      .all(personId, personId) as any[];

    return rows.map((r) => {
      const isPersonA = r.person_a_id === personId;
      const connectedPersonRow = isPersonA
        ? {
            id: r.pb_id,
            name: r.pb_name,
            photo_url: r.pb_photo,
            email: r.pb_email,
            company: r.pb_company,
            job_title: r.pb_job_title,
            circle: r.pb_circle,
          }
        : {
            id: r.pa_id,
            name: r.pa_name,
            photo_url: r.pa_photo,
            email: r.pa_email,
            company: r.pa_company,
            job_title: r.pa_job_title,
            circle: r.pa_circle,
          };

      const relType = r.relationship_type as RelationshipType;
      const label = getRelationshipLabel(relType, isPersonA, r.custom_label);

      return {
        id: r.id,
        connected_person: connectedPersonRow as Person,
        relationship_label: label,
        relationship_type: relType,
      };
    });
  }

  createConnection(connection: {
    id: string;
    person_a_id: string;
    person_b_id: string;
    relationship_type: RelationshipType;
    custom_label?: string | null;
    created_at?: string;
  }): Connection {
    const created_at = connection.created_at || new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO connections (id, person_a_id, person_b_id, relationship_type, custom_label, created_at)
         VALUES (@id, @person_a_id, @person_b_id, @relationship_type, @custom_label, @created_at)`
      )
      .run({
        id: connection.id,
        person_a_id: connection.person_a_id,
        person_b_id: connection.person_b_id,
        relationship_type: connection.relationship_type,
        custom_label: connection.custom_label || null,
        created_at,
      });

    return {
      id: connection.id,
      person_a_id: connection.person_a_id,
      person_b_id: connection.person_b_id,
      relationship_type: connection.relationship_type,
      custom_label: connection.custom_label || null,
      created_at,
    };
  }

  deleteConnection(id: string): boolean {
    const result = this.db.prepare(`DELETE FROM connections WHERE id = ?`).run(id);
    return result.changes > 0;
  }

  // --------------------------------------------------------------------------
  // TIMELINE
  // --------------------------------------------------------------------------

  getGlobalTimeline(filters?: { person_id?: string; type?: string }): TimelineItem[] {
    const items: TimelineItem[] = [];

    // 1. Interactions
    let interSql = `SELECT i.*, p.name as person_name, p.photo_url as person_photo 
                    FROM interactions i 
                    JOIN people p ON i.person_id = p.id 
                    WHERE 1=1`;
    const interParams: any[] = [];
    if (filters?.person_id) {
      interSql += ` AND i.person_id = ?`;
      interParams.push(filters.person_id);
    }
    const interRows = this.db.prepare(interSql).all(...interParams) as any[];
    for (const r of interRows) {
      items.push({
        id: r.id,
        person_id: r.person_id,
        person_name: r.person_name,
        person_photo: r.person_photo,
        type: 'interaction',
        interaction_type: r.type,
        date: r.date,
        title: `Logged ${r.type}`,
        notes: r.notes,
        created_at: r.created_at,
      });
    }

    // 2. News
    let newsSql = `SELECT n.*, p.name as person_name, p.photo_url as person_photo 
                   FROM news n 
                   JOIN people p ON n.person_id = p.id 
                   WHERE 1=1`;
    const newsParams: any[] = [];
    if (filters?.person_id) {
      newsSql += ` AND n.person_id = ?`;
      newsParams.push(filters.person_id);
    }
    const newsRows = this.db.prepare(newsSql).all(...newsParams) as any[];
    for (const r of newsRows) {
      items.push({
        id: r.id,
        person_id: r.person_id,
        person_name: r.person_name,
        person_photo: r.person_photo,
        type: 'news',
        date: r.date,
        title: r.content,
        created_at: r.created_at,
      });
    }

    // 3. Completed Reminders
    let remSql = `SELECT r.*, p.name as person_name, p.photo_url as person_photo 
                  FROM reminders r 
                  JOIN people p ON r.person_id = p.id 
                  WHERE r.completed = 1`;
    const remParams: any[] = [];
    if (filters?.person_id) {
      remSql += ` AND r.person_id = ?`;
      remParams.push(filters.person_id);
    }
    const remRows = this.db.prepare(remSql).all(...remParams) as any[];
    for (const r of remRows) {
      const dateStr = r.completed_at ? r.completed_at.slice(0, 10) : r.due_date;
      items.push({
        id: r.id,
        person_id: r.person_id,
        person_name: r.person_name,
        person_photo: r.person_photo,
        type: 'reminder_completed',
        date: dateStr,
        title: `Completed reminder: ${r.title}`,
        created_at: r.completed_at || r.created_at,
      });
    }

    // Filter by type if provided
    let filtered = items;
    if (filters?.type && filters.type !== 'all') {
      filtered = items.filter((item) => item.type === filters.type);
    }

    // Sort newest first by date and created_at
    filtered.sort((a, b) => {
      const cmpDate = b.date.localeCompare(a.date);
      if (cmpDate !== 0) return cmpDate;
      return b.created_at.localeCompare(a.created_at);
    });

    return filtered;
  }
}
