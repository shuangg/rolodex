import { Router, Request, Response } from 'express';
import { RolodexRepo } from './repo';
import { CircleType, RelationshipType, InteractionType, ImportantDateType, GiftStatus } from '../shared/types';

export function createApiRouter(repo: RolodexRepo): Router {
  const router = Router();

  // --------------------------------------------------------------------------
  // PEOPLE
  // --------------------------------------------------------------------------

  router.get('/people', (req: Request, res: Response) => {
    try {
      const { circle, tag, search } = req.query;
      const people = repo.getAllPeople({
        circle: circle as CircleType | undefined,
        tag: tag as string | undefined,
        search: search as string | undefined,
      });
      res.json(people);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/people/:id', (req: Request, res: Response) => {
    try {
      const person = repo.getPersonById(req.params.id as string as string);
      if (!person) {
        return res.status(404).json({ error: 'Person not found' });
      }
      res.json(person);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/people', (req: Request, res: Response) => {
    try {
      const data = req.body;
      if (!data.name || !data.circle) {
        return res.status(400).json({ error: 'Name and circle are required' });
      }

      const id = data.id || `person_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const person = repo.createPerson({
        id,
        name: data.name,
        photo_url: data.photo_url || null,
        email: data.email || null,
        phone: data.phone || null,
        job_title: data.job_title || null,
        company: data.company || null,
        city: data.city || null,
        time_zone: data.time_zone || null,
        circle: data.circle,
        cadence_override_days: data.cadence_override_days != null ? Number(data.cadence_override_days) : null,
        check_ins_enabled: data.check_ins_enabled !== false,
        snooze_until: data.snooze_until || null,
        how_we_met: data.how_we_met || null,
        notes: data.notes || null,
        tags: Array.isArray(data.tags) ? data.tags : [],
        created_at: data.created_at,
        updated_at: data.updated_at,
      });

      res.status(201).json(person);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.put('/people/:id', (req: Request, res: Response) => {
    try {
      const updated = repo.updatePerson(req.params.id as string, req.body);
      if (!updated) {
        return res.status(404).json({ error: 'Person not found' });
      }
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.delete('/people/:id', (req: Request, res: Response) => {
    try {
      const deleted = repo.deletePerson(req.params.id as string);
      if (!deleted) {
        return res.status(404).json({ error: 'Person not found' });
      }
      res.json({ success: true, id: req.params.id as string });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Batch import endpoint
  router.post('/people/import', (req: Request, res: Response) => {
    try {
      const { items, action } = req.body as {
        items: Array<any>;
        action?: 'skip_duplicates' | 'overwrite_duplicates' | 'create_all';
      };

      if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'Items array is required' });
      }

      const existingPeople = repo.getAllPeople();
      const existingEmails = new Map(existingPeople.filter((p: any) => p.email).map((p: any) => [p.email!.toLowerCase().trim(), p]));
      const existingNames = new Map(existingPeople.map((p: any) => [p.name.toLowerCase().trim(), p]));

      const created: any[] = [];
      const updated: any[] = [];
      const skipped: any[] = [];

      for (const item of items) {
        if (!item.name) continue;

        const emailKey = item.email ? item.email.toLowerCase().trim() : null;
        const nameKey = item.name.toLowerCase().trim();

        const match = (emailKey && existingEmails.get(emailKey)) || existingNames.get(nameKey);

        if (match) {
          if (action === 'skip_duplicates') {
            skipped.push({ item, reason: 'Duplicate of ' + match.name });
            continue;
          } else if (action === 'overwrite_duplicates') {
            const upd = repo.updatePerson(match.id, {
              ...item,
              tags: Array.from(new Set([...match.tags, ...(item.tags || [])])),
            });
            updated.push(upd);
            continue;
          }
        }

        // Create new
        const id = item.id || `person_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        const p = repo.createPerson({
          id,
          name: item.name,
          photo_url: item.photo_url || null,
          email: item.email || null,
          phone: item.phone || null,
          job_title: item.job_title || null,
          company: item.company || null,
          city: item.city || null,
          time_zone: item.time_zone || null,
          circle: item.circle || 'wider',
          cadence_override_days: item.cadence_override_days != null ? Number(item.cadence_override_days) : null,
          check_ins_enabled: item.check_ins_enabled !== false,
          snooze_until: item.snooze_until || null,
          how_we_met: item.how_we_met || null,
          notes: item.notes || null,
          tags: Array.isArray(item.tags) ? item.tags : [],
        });
        created.push(p);
      }

      res.json({
        imported_count: created.length + updated.length,
        created,
        updated,
        skipped,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --------------------------------------------------------------------------
  // INTERACTIONS
  // --------------------------------------------------------------------------

  router.get('/people/:id/interactions', (req: Request, res: Response) => {
    try {
      const list = repo.getInteractionsForPerson(req.params.id as string);
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/interactions', (req: Request, res: Response) => {
    try {
      const data = req.body;
      if (!data.person_id || !data.type || !data.date) {
        return res.status(400).json({ error: 'person_id, type and date are required' });
      }

      const id = data.id || `inter_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const inter = repo.createInteraction({
        id,
        person_id: data.person_id,
        type: data.type as InteractionType,
        date: data.date,
        notes: data.notes || null,
        created_at: data.created_at,
      });

      res.status(201).json(inter);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.delete('/interactions/:id', (req: Request, res: Response) => {
    try {
      const ok = repo.deleteInteraction(req.params.id as string);
      if (!ok) return res.status(404).json({ error: 'Interaction not found' });
      res.json({ success: true, id: req.params.id as string });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --------------------------------------------------------------------------
  // IMPORTANT DATES
  // --------------------------------------------------------------------------

  router.get('/important-dates', (_req: Request, res: Response) => {
    try {
      const dates = repo.getAllImportantDates();
      res.json(dates);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/people/:id/important-dates', (req: Request, res: Response) => {
    try {
      const dates = repo.getImportantDatesForPerson(req.params.id as string);
      res.json(dates);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/important-dates', (req: Request, res: Response) => {
    try {
      const data = req.body;
      if (!data.person_id || !data.type || data.month == null || data.day == null) {
        return res.status(400).json({ error: 'person_id, type, month and day are required' });
      }

      const id = data.id || `date_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const created = repo.createImportantDate({
        id,
        person_id: data.person_id,
        type: data.type as ImportantDateType,
        title: data.title || null,
        month: Number(data.month),
        day: Number(data.day),
        year: data.year != null && data.year !== '' ? Number(data.year) : null,
        created_at: data.created_at,
      });

      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.delete('/important-dates/:id', (req: Request, res: Response) => {
    try {
      const ok = repo.deleteImportantDate(req.params.id as string);
      if (!ok) return res.status(404).json({ error: 'Important date not found' });
      res.json({ success: true, id: req.params.id as string });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --------------------------------------------------------------------------
  // FACTS
  // --------------------------------------------------------------------------

  router.get('/people/:id/facts', (req: Request, res: Response) => {
    try {
      const facts = repo.getFactsForPerson(req.params.id as string);
      res.json(facts);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/facts', (req: Request, res: Response) => {
    try {
      const data = req.body;
      if (!data.person_id || !data.fact) {
        return res.status(400).json({ error: 'person_id and fact are required' });
      }

      const id = data.id || `fact_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const created = repo.createFact({
        id,
        person_id: data.person_id,
        fact: data.fact,
        created_at: data.created_at,
      });

      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.delete('/facts/:id', (req: Request, res: Response) => {
    try {
      const ok = repo.deleteFact(req.params.id as string);
      if (!ok) return res.status(404).json({ error: 'Fact not found' });
      res.json({ success: true, id: req.params.id as string });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --------------------------------------------------------------------------
  // NEWS
  // --------------------------------------------------------------------------

  router.get('/people/:id/news', (req: Request, res: Response) => {
    try {
      const list = repo.getNewsForPerson(req.params.id as string);
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/news', (req: Request, res: Response) => {
    try {
      const data = req.body;
      if (!data.person_id || !data.content || !data.date) {
        return res.status(400).json({ error: 'person_id, content and date are required' });
      }

      const id = data.id || `news_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const created = repo.createNews({
        id,
        person_id: data.person_id,
        content: data.content,
        date: data.date,
        created_at: data.created_at,
      });

      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.delete('/news/:id', (req: Request, res: Response) => {
    try {
      const ok = repo.deleteNews(req.params.id as string);
      if (!ok) return res.status(404).json({ error: 'News item not found' });
      res.json({ success: true, id: req.params.id as string });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --------------------------------------------------------------------------
  // REMINDERS
  // --------------------------------------------------------------------------

  router.get('/reminders', (_req: Request, res: Response) => {
    try {
      const list = repo.getAllReminders();
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/people/:id/reminders', (req: Request, res: Response) => {
    try {
      const list = repo.getRemindersForPerson(req.params.id as string);
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/reminders', (req: Request, res: Response) => {
    try {
      const data = req.body;
      if (!data.person_id || !data.title || !data.due_date) {
        return res.status(400).json({ error: 'person_id, title and due_date are required' });
      }

      const id = data.id || `rem_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const created = repo.createReminder({
        id,
        person_id: data.person_id,
        title: data.title,
        due_date: data.due_date,
        completed: Boolean(data.completed),
        completed_at: data.completed_at || null,
        created_at: data.created_at,
      });

      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.put('/reminders/:id', (req: Request, res: Response) => {
    try {
      const updated = repo.updateReminder(req.params.id as string, req.body);
      if (!updated) return res.status(404).json({ error: 'Reminder not found' });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.delete('/reminders/:id', (req: Request, res: Response) => {
    try {
      const ok = repo.deleteReminder(req.params.id as string);
      if (!ok) return res.status(404).json({ error: 'Reminder not found' });
      res.json({ success: true, id: req.params.id as string });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --------------------------------------------------------------------------
  // GIFTS
  // --------------------------------------------------------------------------

  router.get('/people/:id/gifts', (req: Request, res: Response) => {
    try {
      const list = repo.getGiftsForPerson(req.params.id as string);
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/gifts', (req: Request, res: Response) => {
    try {
      const data = req.body;
      if (!data.person_id || !data.name) {
        return res.status(400).json({ error: 'person_id and name are required' });
      }

      const id = data.id || `gift_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const created = repo.createGift({
        id,
        person_id: data.person_id,
        name: data.name,
        status: (data.status as GiftStatus) || 'idea',
        occasion: data.occasion || null,
        date: data.date || null,
        notes: data.notes || null,
        created_at: data.created_at,
      });

      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.put('/gifts/:id', (req: Request, res: Response) => {
    try {
      const updated = repo.updateGift(req.params.id as string, req.body);
      if (!updated) return res.status(404).json({ error: 'Gift not found' });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.delete('/gifts/:id', (req: Request, res: Response) => {
    try {
      const ok = repo.deleteGift(req.params.id as string);
      if (!ok) return res.status(404).json({ error: 'Gift not found' });
      res.json({ success: true, id: req.params.id as string });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --------------------------------------------------------------------------
  // CONNECTIONS
  // --------------------------------------------------------------------------

  router.get('/people/:id/connections', (req: Request, res: Response) => {
    try {
      const list = repo.getConnectionsForPerson(req.params.id as string);
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/connections', (req: Request, res: Response) => {
    try {
      const data = req.body;
      if (!data.person_a_id || !data.person_b_id || !data.relationship_type) {
        return res.status(400).json({ error: 'person_a_id, person_b_id and relationship_type are required' });
      }

      if (data.person_a_id === data.person_b_id) {
        return res.status(400).json({ error: 'Cannot connect a person to themselves' });
      }

      const id = data.id || `conn_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const created = repo.createConnection({
        id,
        person_a_id: data.person_a_id,
        person_b_id: data.person_b_id,
        relationship_type: data.relationship_type as RelationshipType,
        custom_label: data.custom_label || null,
        created_at: data.created_at,
      });

      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.delete('/connections/:id', (req: Request, res: Response) => {
    try {
      const ok = repo.deleteConnection(req.params.id as string);
      if (!ok) return res.status(404).json({ error: 'Connection not found' });
      res.json({ success: true, id: req.params.id as string });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --------------------------------------------------------------------------
  // TIMELINE
  // --------------------------------------------------------------------------

  router.get('/timeline', (req: Request, res: Response) => {
    try {
      const { person_id, type } = req.query;
      const timeline = repo.getGlobalTimeline({
        person_id: person_id as string | undefined,
        type: type as string | undefined,
      });
      res.json(timeline);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
