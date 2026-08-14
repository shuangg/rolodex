import express from 'express'
import type { Repo } from '../db'
import { todayISO, nowISO } from '../lib/dateUtils'
import { CIRCLE_META } from '../lib/cadence'
import { upcomingDates, datesInMonth } from '../lib/importantDates'
import { filterPeople } from '../lib/search'
import {
  applyMapping,
  checkDuplicates,
  parseCSV,
  parseVCard,
  type DuplicateCheck,
  type ParsedPerson,
} from '../lib/import'
import type { Circle, PersonComputed } from '../lib/types'
import { format } from 'date-fns'

export function buildApi(repo: Repo) {
  const api = express.Router()
  api.use(express.json({ limit: '25mb' }))

  const notFound = (res: express.Response) => res.status(404).json({ error: 'Not found' })

  function serializePerson(p: PersonComputed, today: string) {
    return p
    void today
  }

  // ---------- people ----------
  api.get('/people', (req, res) => {
    let people = repo.listPeople()
    const { search, circle, tag } = req.query
    if (search || circle || tag) {
      people = filterPeople(people, {
        query: typeof search === 'string' ? search : undefined,
        circle: (circle as Circle) ?? undefined,
        tag: (tag as string) ?? undefined,
      })
    }
    res.json(people)
  })

  api.get('/people/:id', (req, res) => {
    const p = repo.getPerson(Number(req.params.id))
    if (!p) return notFound(res)
    res.json({
      person: p,
      interactions: repo.listInteractions(p.id),
      dates: repo.listDates(p.id),
      facts: repo.listFacts(p.id),
      news: repo.listNews(p.id),
      reminders: repo.listReminders(p.id),
      gifts: repo.listGifts(p.id),
      connections: repo.listConnections(p.id),
    })
  })

  api.post('/people', (req, res) => {
    const { name } = req.body ?? {}
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' })
    }
    const person = repo.createPerson(req.body)
    res.status(201).json(person)
  })

  api.patch('/people/:id', (req, res) => {
    const id = Number(req.params.id)
    if (!repo.getPerson(id)) return notFound(res)
    const patch = req.body ?? {}
    delete patch.id
    delete patch.created_at
    const person = repo.updatePerson(id, patch)
    res.json(person)
  })

  api.delete('/people/:id', (req, res) => {
    const ok = repo.deletePerson(Number(req.params.id))
    if (!ok) return notFound(res)
    res.json({ ok: true })
  })

  // ---------- interactions ----------
  api.post('/people/:id/interactions', (req, res) => {
    const id = Number(req.params.id)
    if (!repo.getPerson(id)) return notFound(res)
    const { type, date, notes } = req.body ?? {}
    if (!['call', 'message', 'email', 'met', 'other'].includes(type)) {
      return res.status(400).json({ error: 'Invalid interaction type' })
    }
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'A valid date (yyyy-mm-dd) is required' })
    }
    const created = repo.createInteraction(id, type, date, typeof notes === 'string' && notes.trim() ? notes : null)
    res.status(201).json(created)
  })

  api.delete('/interactions/:id', (req, res) => {
    res.json({ ok: repo.deleteInteraction(Number(req.params.id)) })
  })

  // ---------- important dates ----------
  api.post('/people/:id/dates', (req, res) => {
    const id = Number(req.params.id)
    if (!repo.getPerson(id)) return notFound(res)
    const { type, label, month, day, year } = req.body ?? {}
    const validTypes = ['birthday', 'anniversary', 'work_anniversary', 'child_birthday', 'other']
    if (!validTypes.includes(type)) return res.status(400).json({ error: 'Invalid date type' })
    if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(day) || day < 1 || day > 31) {
      return res.status(400).json({ error: 'Invalid month/day' })
    }
    if (year != null && !Number.isInteger(year)) return res.status(400).json({ error: 'Invalid year' })
    try {
      const created = repo.createDate(id, type, typeof label === 'string' && label ? label : null, month, day, year ?? null)
      res.status(201).json(created)
    } catch (e) {
      res.status(400).json({ error: (e as Error).message })
    }
  })

  api.delete('/dates/:id', (req, res) => {
    res.json({ ok: repo.deleteDate(Number(req.params.id)) })
  })

  // ---------- facts ----------
  api.post('/people/:id/facts', (req, res) => {
    const id = Number(req.params.id)
    if (!repo.getPerson(id)) return notFound(res)
    const { text } = req.body ?? {}
    if (typeof text !== 'string' || !text.trim()) return res.status(400).json({ error: 'Text is required' })
    res.status(201).json(repo.createFact(id, text.trim()))
  })

  api.delete('/facts/:id', (req, res) => {
    res.json({ ok: repo.deleteFact(Number(req.params.id)) })
  })

  // ---------- news ----------
  api.post('/people/:id/news', (req, res) => {
    const id = Number(req.params.id)
    if (!repo.getPerson(id)) return notFound(res)
    const { text, date } = req.body ?? {}
    if (typeof text !== 'string' || !text.trim()) return res.status(400).json({ error: 'Text is required' })
    const d = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : todayISO()
    res.status(201).json(repo.createNews(id, text.trim(), d))
  })

  api.delete('/news/:id', (req, res) => {
    res.json({ ok: repo.deleteNews(Number(req.params.id)) })
  })

  // ---------- reminders ----------
  api.post('/people/:id/reminders', (req, res) => {
    const id = Number(req.params.id)
    if (!repo.getPerson(id)) return notFound(res)
    const { text, due_date } = req.body ?? {}
    if (typeof text !== 'string' || !text.trim()) return res.status(400).json({ error: 'Text is required' })
    if (typeof due_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(due_date)) {
      return res.status(400).json({ error: 'A valid due date (yyyy-mm-dd) is required' })
    }
    res.status(201).json(repo.createReminder(id, text.trim(), due_date))
  })

  api.patch('/reminders/:id', (req, res) => {
    const { done } = req.body ?? {}
    const updated = repo.setReminderDone(Number(req.params.id), !!done)
    if (!updated) return notFound(res)
    res.json(updated)
  })

  api.delete('/reminders/:id', (req, res) => {
    res.json({ ok: repo.deleteReminder(Number(req.params.id)) })
  })

  // ---------- gifts ----------
  api.post('/people/:id/gifts', (req, res) => {
    const id = Number(req.params.id)
    if (!repo.getPerson(id)) return notFound(res)
    const { name, kind, occasion, date } = req.body ?? {}
    if (typeof name !== 'string' || !name.trim()) return res.status(400).json({ error: 'Name is required' })
    if (!['idea', 'given', 'received'].includes(kind)) return res.status(400).json({ error: 'Invalid gift kind' })
    const d = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : todayISO()
    res.status(201).json(repo.createGift(id, name.trim(), kind, occasion || null, d))
  })

  api.patch('/gifts/:id', (req, res) => {
    const updated = repo.updateGift(Number(req.params.id), req.body ?? {})
    if (!updated) return notFound(res)
    res.json(updated)
  })

  api.delete('/gifts/:id', (req, res) => {
    res.json({ ok: repo.deleteGift(Number(req.params.id)) })
  })

  // ---------- connections ----------
  api.post('/people/:id/connections', (req, res) => {
    const a = Number(req.params.id)
    if (!repo.getPerson(a)) return notFound(res)
    const { other_id, kind, a_is_parent, label, inverse_label, note } = req.body ?? {}
    const b = Number(other_id)
    if (!b || !repo.getPerson(b) || a === b) return res.status(400).json({ error: 'A valid other person is required' })
    const validKinds = ['partner', 'parent_child', 'sibling', 'colleague', 'other']
    if (!validKinds.includes(kind)) return res.status(400).json({ error: 'Invalid connection kind' })
    const created = repo.createConnection(a, b, kind, !!a_is_parent, label || null, inverse_label || null, note || null)
    res.status(201).json(created)
  })

  api.delete('/connections/:id', (req, res) => {
    res.json({ ok: repo.deleteConnection(Number(req.params.id)) })
  })

  // ---------- timeline ----------
  api.get('/timeline', (req, res) => {
    const personId = req.query.person ? Number(req.query.person) : null
    const kind = typeof req.query.kind === 'string' && req.query.kind !== 'all' ? req.query.kind : null
    res.json(repo.timeline(personId, kind))
  })

  // ---------- calendar ----------
  api.get('/calendar', (req, res) => {
    const year = Number(req.query.year) || new Date().getFullYear()
    const month = Number(req.query.month) || new Date().getMonth() + 1
    const all = repo.listAllDates()
    res.json({
      year,
      month,
      events: datesInMonth(all, year, month),
      upcoming: upcomingDates(all, 30),
    })
  })

  // ---------- today ----------
  api.get('/today', (req, res) => {
    const today = todayISO()
    const people = repo.listPeople()
    const toContact = people
      .filter((p) => p.status === 'overdue' || p.status === 'due_soon')
      .sort((a, b) => {
        // most overdue first; never-contacted sinks to the top of urgency by name
        const rankA = a.last_contacted == null ? 1e9 : overdueDays(a)
        const rankB = b.last_contacted == null ? 1e9 : overdueDays(b)
        if (rankA !== rankB) return rankB - rankA
        return a.name.localeCompare(b.name)
      })
      .map((p) => ({
        id: p.id,
        name: p.name,
        circle: p.circle,
        photo: p.photo,
        status: p.status,
        last_contacted: p.last_contacted,
        next_due: p.next_due,
        latest_news: p.latest_news,
        overdue_days:
          p.status === 'overdue' ? Math.max(0, daysBetween(p.next_due!, today)) : 0,
      }))
    const dates = upcomingDates(repo.listAllDates(), 30)
    const reminders = repo
      .listOpenReminders()
      .map((r) => ({ ...r, overdue: r.due_date < today, due_today: r.due_date === today }))
    const recent = repo.timeline(null, null).slice(0, 30)
    res.json({ today, to_contact: toContact, upcoming_dates: dates, reminders, recent })
  })

  function overdueDays(p: PersonComputed): number {
    if (!p.next_due) return 0
    return daysBetween(p.next_due, todayISO())
  }

  function daysBetween(a: string, b: string): number {
    return Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000)
  }

  // ---------- stats ----------
  api.get('/stats', (req, res) => {
    const now = new Date()
    const months: { key: string; label: string; count: number }[] = []
    const all = repo.db
      .prepare(`SELECT date FROM interactions`)
      .all() as { date: string }[]
    const counts = new Map<string, number>()
    for (const r of all) {
      const key = r.date.slice(0, 7)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = format(d, 'yyyy-MM')
      months.push({ key, label: format(d, 'MMM yy'), count: counts.get(key) ?? 0 })
    }

    const people = repo.listPeople()
    const circles = (Object.keys(CIRCLE_META) as Circle[]).map((c) => {
      const inCircle = people.filter((p) => p.circle === c)
      return {
        circle: c,
        label: CIRCLE_META[c].label,
        total: inCircle.length,
        in_touch: inCircle.filter((p) => p.status === 'in_touch').length,
        due_soon: inCircle.filter((p) => p.status === 'due_soon').length,
        overdue: inCircle.filter((p) => p.status === 'overdue').length,
        snoozed: inCircle.filter((p) => p.status === 'snoozed').length,
        off: inCircle.filter((p) => p.status === 'off').length,
      }
    })
    res.json({ months, circles })
  })

  // ---------- import ----------
  api.post('/import/parse', (req, res) => {
    const { filename, content } = req.body ?? {}
    if (typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'A file is required' })
    }
    const isVcf = /\.vcf$/i.test(String(filename ?? '')) || /^BEGIN:VCARD/im.test(content.trim())
    const existing = repo.listPeople().map((p) => ({ id: p.id, name: p.name, email: p.email }))

    if (isVcf) {
      const people = parseVCard(content)
      const rows = people.map((p, i) => ({
        index: i,
        person: p,
        duplicate: checkDuplicates(p, existing),
      }))
      return res.json({ format: 'vcf', rows })
    }

    const parsed = parseCSV(content)
    const { people, skipped } = applyMapping(parsed, parsed.suggestedMapping ?? {})
    const rows = people.map((p, i) => ({
      index: i,
      person: p,
      duplicate: checkDuplicates(p, existing),
    }))
    res.json({ format: 'csv', headers: parsed.headers, raw_rows: parsed.rows, suggested_mapping: parsed.suggestedMapping, rows, skipped })
  })

  // Remap CSV with a user-supplied mapping
  api.post('/import/remap', (req, res) => {
    const { headers, raw_rows, mapping } = req.body ?? {}
    if (!Array.isArray(headers) || !Array.isArray(raw_rows) || typeof mapping !== 'object') {
      return res.status(400).json({ error: 'Invalid remap request' })
    }
    const parsed = { format: 'csv' as const, headers, rows: raw_rows, people: [], suggestedMapping: null }
    const { people } = applyMapping(parsed, mapping)
    const existing = repo.listPeople().map((p) => ({ id: p.id, name: p.name, email: p.email }))
    const rows = people.map((p, i) => ({ index: i, person: p, duplicate: checkDuplicates(p, existing) }))
    res.json({ rows })
  })

  api.post('/import/apply', (req, res) => {
    const { people } = req.body ?? {}
    if (!Array.isArray(people) || people.length === 0) {
      return res.status(400).json({ error: 'No people to import' })
    }
    const existing = repo.listPeople().map((p) => ({ id: p.id, name: p.name, email: p.email }))
    const created: { id: number; name: string }[] = []
    const skipped: DuplicateCheck[] = []
    repo.db.exec('BEGIN')
    try {
      for (const p of people as ParsedPerson[]) {
        if (checkDuplicates(p, existing).isDuplicate) {
          skipped.push(checkDuplicates(p, existing))
          continue
        }
        const person = repo.createPerson({
          name: p.name,
          email: p.email,
          phone: p.phone,
          job_title: p.job_title,
          company: p.company,
          city: p.city,
          notes: p.notes,
          tags: ['imported'],
        })
        created.push({ id: person.id, name: person.name })
        existing.push({ id: person.id, name: person.name, email: person.email })
        if (p.birthday) {
          const m = p.birthday.match(/^(\d{4})-(\d{2})-(\d{2})$/)
          if (m) {
            repo.createDate(person.id, 'birthday', null, Number(m[2]), Number(m[3]), Number(m[1]))
          } else {
            const m2 = p.birthday.match(/^--(\d{2})-(\d{2})$/)
            if (m2) repo.createDate(person.id, 'birthday', null, Number(m2[1]), Number(m2[2]), null)
          }
        }
      }
      repo.db.exec('COMMIT')
    } catch (e) {
      repo.db.exec('ROLLBACK')
      return res.status(500).json({ error: (e as Error).message })
    }
    res.status(201).json({ created, skipped: skipped.length })
  })

  // ---------- misc ----------
  api.get('/tags', (_req, res) => {
    res.json(repo.allTags())
  })

  api.get('/health', (_req, res) => {
    res.json({ ok: true, now: nowISO() })
  })

  void serializePerson
  return api
}
