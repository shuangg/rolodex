import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  BadgeCheck,
  Cake,
  CalendarDays,
  Clock3,
  Gift,
  ArrowRight,
  Link2,
  Mail,
  MapPin,
  Megaphone,
  Pencil,
  Phone,
  Plus,
  Sparkles,
  StickyNote,
  Bell,
  Trash2,
  Users2,
  X,
} from 'lucide-react'
import { api, type PersonDetail } from '../api'
import type { ConnectionKind, GiftKind, ImportantDateType, PersonComputed } from '../../server/lib/types'
import { CIRCLE_META } from '../../server/lib/cadence'
import { nextOccurrence, currentAge, dateTypeLabel } from '../../server/lib/importantDates'
import { Avatar, CircleChip, EmptyState, Modal, StatusBadge } from '../components/ui'
import { PersonForm } from '../components/PersonForm'
import { LogInteractionModal, interactionIcon } from '../components/LogInteractionModal'
import { useStore, useToast } from '../store'
import { DATE_TYPE_LABEL, fmtDate, localTimeIn, relativeDays, todayISO } from '../lib/format'

type QuickModal =
  | 'news'
  | 'fact'
  | 'date'
  | 'reminder'
  | 'gift'
  | 'connection'
  | 'log'
  | 'edit'
  | null

export default function PersonDetail() {
  const { id } = useParams()
  const personId = Number(id)
  const navigate = useNavigate()
  const { people, refresh } = useStore()
  const toast = useToast()
  const [detail, setDetail] = useState<PersonDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [modal, setModal] = useState<QuickModal>(null)

  const load = useCallback(async () => {
    try {
      const d = await api.getPerson(personId)
      setDetail(d)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [personId])

  useEffect(() => {
    load()
  }, [load])

  const after = async () => {
    await Promise.all([load(), refresh()])
  }

  const timeline = useMemo(() => {
    const items: { key: string; kind: 'interaction' | 'news' | 'reminder_done'; date: string; icon: React.ReactNode; label: string; text: string; interactionId?: number }[] = []
    if (!detail) return items
    for (const i of detail.interactions) {
      items.push({
        key: `i-${i.id}`,
        kind: 'interaction',
        date: i.date,
        icon: interactionIcon(i.type),
        label: i.type === 'met' ? 'Met up' : i.type === 'call' ? 'Called' : i.type === 'message' ? 'Messaged' : i.type === 'email' ? 'Emailed' : 'Other contact',
        text: i.notes ?? '',
        interactionId: i.id,
      })
    }
    for (const n of detail.news) {
      items.push({ key: `n-${n.id}`, kind: 'news', date: n.date, icon: <Megaphone size={15} />, label: 'News', text: n.text })
    }
    for (const r of detail.reminders.filter((r) => r.done)) {
      items.push({
        key: `r-${r.id}`,
        kind: 'reminder_done',
        date: r.done_at?.slice(0, 10) ?? r.due_date,
        icon: <BadgeCheck size={15} />,
        label: 'Reminder done',
        text: r.text,
      })
    }
    return items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  }, [detail])

  if (error) return <div className="page">Couldn’t load this person: {error}</div>
  if (!detail) return <div className="page muted">Loading…</div>

  const { person } = detail
  const timezoneTime = localTimeIn(person.timezone)
  const openReminders = detail.reminders.filter((r) => !r.done)
  const giftIdeas = detail.gifts.filter((g) => g.kind === 'idea')
  const today = todayISO()

  // Surface gift ideas when an important date is coming up within 30 days
  const soonestDate = detail.dates
    .map((d) => ({ d, occ: nextOccurrence(d, today) }))
    .sort((a, b) => (a.occ.date < b.occ.date ? -1 : 1))
    .find(({ occ }) => occ.date <= addDays(today, 30) && occ.date >= today)

  const cadenceText = person.checkins_off
    ? 'Check-ins are off for this person'
    : `${CIRCLE_META[person.circle].label} circle · check in ${CIRCLE_META[person.circle].cadenceDescription.toLowerCase()}${
        person.cadence_override_days ? ` (overridden: every ${person.cadence_override_days} days)` : ''
      }`

  return (
    <div className="page">
      <div className="person-head">
        <Avatar name={person.name} photo={person.photo} size="xl" />
        <div className="person-head-main">
          <h1 className="person-name">{person.name}</h1>
          <div className="person-sub">
            {person.job_title && <span>{person.job_title}</span>}
            {person.company && (
              <span>
                {person.job_title ? ' at ' : ''}
                <strong>{person.company}</strong>
              </span>
            )}
            {(person.job_title || person.company) && (person.city || timezoneTime) && <span>·</span>}
            {person.city && (
              <span className="row" style={{ gap: 4 }}>
                <MapPin size={13} /> {person.city}
              </span>
            )}
            {timezoneTime && (
              <span className="row" style={{ gap: 4 }} title={`Their time zone: ${person.timezone}`}>
                <Clock3 size={13} /> {timezoneTime} their time
              </span>
            )}
          </div>
          <div className="row wrap" style={{ marginTop: 10, gap: 8 }}>
            <StatusBadge
              status={person.status}
              title={cadenceText}
            />
            <CircleChip circle={person.circle} />
            {person.tags.map((t) => (
              <span key={t} className="chip">
                {t}
              </span>
            ))}
          </div>
          <div className="small muted" style={{ marginTop: 6 }}>
            {cadenceText}
            {person.status === 'overdue' && person.next_due && ` · was due ${fmtDate(person.next_due)} (${relativeDays(person.next_due)})`}
            {person.status === 'due_soon' && person.next_due && ` · due ${fmtDate(person.next_due)}`}
            {person.status === 'snoozed' && person.snoozed_until && ` · snoozed until ${fmtDate(person.snoozed_until)}`}
          </div>
        </div>
        <div className="person-actions">
          <button className="btn btn-blue" onClick={() => setModal('log')}>
            <Phone size={15} /> Log interaction
          </button>
          <button className="btn" onClick={() => setModal('edit')}>
            <Pencil size={15} /> Edit
          </button>
        </div>
      </div>

      {person.snoozed_until && person.status === 'snoozed' && (
        <div className="snooze-banner" style={{ marginTop: 18 }}>
          <Clock3 size={15} />
          Snoozed until {fmtDate(person.snoozed_until)} — they won’t nudge you on Today until then.
        </div>
      )}

      {person.latest_news && (
        <div className="news-banner" style={{ marginTop: 18 }}>
          <Megaphone size={17} />
          <div>
            <div className="text">{person.latest_news.text}</div>
            <div className="when">
              Latest news · {fmtDate(person.latest_news.date)} · {relativeDays(person.latest_news.date)}
            </div>
          </div>
        </div>
      )}

      <div className="person-layout">
        {/* -------- main column -------- */}
        <div className="person-col">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                <StickyNote size={16} /> Timeline
              </h2>
              <span className="card-sub">everything logged with {person.name.split(' ')[0]}, newest first</span>
            </div>
            {timeline.length === 0 ? (
              <EmptyState icon={<StickyNote />}>Nothing logged yet — log an interaction to start their story.</EmptyState>
            ) : (
              <div className="feed">
                {timeline.map((item) => (
                  <div key={item.key} className="feed-item">
                    <div className={`feed-icon kind-${item.kind === 'interaction' ? 'other' : item.kind === 'news' ? 'news' : 'reminder_done'}`}>
                      {item.kind === 'interaction' ? interactionIcon(detail.interactions.find((i) => i.id === item.interactionId)?.type ?? null) : item.icon}
                    </div>
                    <div className="feed-body">
                      <div className="feed-top">
                        <span className="feed-type" style={{ fontWeight: 700, color: 'var(--text)' }}>
                          {item.label}
                        </span>
                        <span className="feed-date">
                          {fmtDate(item.date)} · {relativeDays(item.date)}
                        </span>
                      </div>
                      {item.text && <div className="feed-text">{item.text}</div>}
                    </div>
                    {item.interactionId != null && (
                      <button
                        className="icon-btn danger"
                        title="Delete interaction"
                        onClick={async () => {
                          await api.deleteInteraction(item.interactionId!)
                          await after()
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                <Sparkles size={16} /> Facts worth remembering
              </h2>
              <button className="btn btn-sm" onClick={() => setModal('fact')}>
                <Plus size={13} /> Add fact
              </button>
            </div>
            {detail.facts.length === 0 ? (
              <EmptyState icon={<Sparkles />}>No facts yet — small, durable things: “allergic to shellfish”, “supports Arsenal”.</EmptyState>
            ) : (
              <div style={{ padding: '12px 20px' }}>
                {detail.facts.map((f) => (
                  <div key={f.id} className="fact-row row">
                    <Sparkles size={13} />
                    <span className="grow">{f.text}</span>
                    <button
                      className="icon-btn danger"
                      onClick={async () => {
                        await api.deleteFact(f.id)
                        await after()
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                <Megaphone size={16} /> News
              </h2>
              <button className="btn btn-sm" onClick={() => setModal('news')}>
                <Plus size={13} /> Add news
              </button>
            </div>
            {detail.news.length === 0 ? (
              <EmptyState icon={<Megaphone />}>No news recorded — the latest shows at the top of their page.</EmptyState>
            ) : (
              <div className="feed">
                {detail.news.map((n) => (
                  <div key={n.id} className="feed-item">
                    <div className="feed-icon kind-news">
                      <Megaphone size={15} />
                    </div>
                    <div className="feed-body">
                      <div className="feed-text" style={{ fontWeight: 600 }}>
                        {n.text}
                      </div>
                      <div className="feed-date">{fmtDate(n.date)}</div>
                    </div>
                    <button
                      className="icon-btn danger"
                      onClick={async () => {
                        await api.deleteNews(n.id)
                        await after()
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* -------- side column -------- */}
        <div className="person-col">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Details</h2>
            </div>
            <div style={{ padding: '10px 20px 14px' }}>
              <DetailRow icon={<Mail size={14} />} k="Email" v={person.email} />
              <DetailRow icon={<Phone size={14} />} k="Phone" v={person.phone} />
              <DetailRow icon={<MapPin size={14} />} k="City" v={person.city} />
              <DetailRow icon={<Clock3 size={14} />} k="Time zone" v={person.timezone} />
              <DetailRow icon={<Users2 size={14} />} k="Circle" v={CIRCLE_META[person.circle].label} />
              <DetailRow icon={<ArrowRight size={14} />} k="How we met" v={[person.how_met, person.met_where, person.met_on ? fmtDate(person.met_on) : null].filter(Boolean).join(' · ')} />
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                <Cake size={16} /> Important dates
              </h2>
              <button className="btn btn-sm" onClick={() => setModal('date')}>
                <Plus size={13} /> Add date
              </button>
            </div>
            {detail.dates.length === 0 ? (
              <EmptyState icon={<Cake />}>No dates yet — birthdays, anniversaries, the works.</EmptyState>
            ) : (
              <div>
                {detail.dates.map((d) => {
                  const occ = nextOccurrence(d, today)
                  const age = currentAge(d, today)
                  return (
                    <div key={d.id} className="list-row">
                      <div className="date-pill">
                        <span className="mon">{monthShort(d.month)}</span>
                        <span className="day">{d.day}</span>
                      </div>
                      <div className="body">
                        <div style={{ fontWeight: 600 }}>
                          {dateTypeLabel(d.type, d.label)}
                          {occ.milestone && (
                            <span className="badge status-due_soon" style={{ marginLeft: 8 }}>
                              turns {occ.ageTurning} — milestone!
                            </span>
                          )}
                        </div>
                        <div className="small muted">
                          {d.year ? `Born/started ${d.year} · ` : ''}
                          {age != null ? `${age} now, ` : ''}
                          next: {fmtDate(occ.date)} ({relativeDays(occ.date)})
                        </div>
                      </div>
                      <button
                        className="icon-btn danger actions"
                        onClick={async () => {
                          await api.deleteDate(d.id)
                          await after()
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                <Bell size={16} /> Reminders
              </h2>
              <button className="btn btn-sm" onClick={() => setModal('reminder')}>
                <Plus size={13} /> Add reminder
              </button>
            </div>
            {openReminders.length === 0 ? (
              <EmptyState icon={<Bell />}>Nothing to do — set a reminder and it’ll appear on Today too.</EmptyState>
            ) : (
              <div>
                {openReminders.map((r) => (
                  <div key={r.id} className="list-row">
                    <button
                      className={`reminder-check${r.done ? ' done' : ''}`}
                      title="Mark done"
                      onClick={async () => {
                        await api.setReminderDone(r.id, true)
                        await after()
                        toast.push('Reminder done — nice')
                      }}
                    >
                      {r.done && <BadgeCheck size={12} />}
                    </button>
                    <div className="body">
                      <div style={{ fontWeight: 600 }}>{r.text}</div>
                      <div className={`small ${r.due_date < today ? 'reminder-overdue' : 'muted'}`}>
                        due {fmtDate(r.due_date)} · {relativeDays(r.due_date)}
                      </div>
                    </div>
                    <button
                      className="icon-btn danger actions"
                      onClick={async () => {
                        await api.deleteReminder(r.id)
                        await after()
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {detail.reminders.some((r) => r.done) && (
              <div style={{ padding: '6px 20px 12px' }}>
                <div className="small muted" style={{ fontWeight: 700, marginBottom: 4 }}>
                  Done
                </div>
                {detail.reminders
                  .filter((r) => r.done)
                  .map((r) => (
                    <div key={r.id} className="fact-row">
                      <BadgeCheck size={13} style={{ color: 'var(--green)' }} />
                      <span className="reminder-done-text grow">{r.text}</span>
                      <button
                        className="icon-btn danger"
                        style={{ opacity: 1 }}
                        onClick={async () => {
                          await api.deleteReminder(r.id)
                          await after()
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                <Gift size={16} /> Gifts
              </h2>
              <button className="btn btn-sm" onClick={() => setModal('gift')}>
                <Plus size={13} /> Add gift
              </button>
            </div>
            {soonestDate && giftIdeas.length > 0 && (
              <div className="gift-surface">
                <div style={{ fontWeight: 700, display: 'flex', gap: 7, alignItems: 'center' }}>
                  <Cake size={14} /> {dateTypeLabel(soonestDate.d.type, soonestDate.d.label)} in{' '}
                  {soonestDate.occ.date === today ? 'today' : `in ${relativeDays(soonestDate.occ.date).replace('in ', '')}`}
                </div>
                <div className="small" style={{ marginTop: 3, color: 'var(--amber-deep)' }}>
                  Gift ideas: {giftIdeas.map((g) => g.name).join(' · ')}
                </div>
              </div>
            )}
            {detail.gifts.length === 0 ? (
              <EmptyState icon={<Gift />}>No gifts recorded — ideas, things given, things received.</EmptyState>
            ) : (
              <div>
                {[...detail.gifts]
                  .sort((a, b) => (a.date < b.date ? 1 : -1))
                  .map((g) => (
                    <div key={g.id} className="list-row">
                      <div className="body">
                        <div className="row" style={{ gap: 8 }}>
                          <span className={`gift-kind gift-${g.kind}`}>{g.kind}</span>
                          <span style={{ fontWeight: 600 }}>{g.name}</span>
                        </div>
                        <div className="small muted">
                          {g.occasion ? `${g.occasion} · ` : ''}
                          {fmtDate(g.date)}
                        </div>
                      </div>
                      {g.kind === 'idea' && (
                        <button
                          className="btn btn-sm actions"
                          title="Mark as given"
                          onClick={async () => {
                            await api.updateGift(g.id, { kind: 'given', date: todayISO() })
                            await after()
                          }}
                        >
                          Mark given
                        </button>
                      )}
                      <button
                        className="icon-btn danger actions"
                        onClick={async () => {
                          await api.deleteGift(g.id)
                          await after()
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                <Link2 size={16} /> Connections
              </h2>
              <button className="btn btn-sm" onClick={() => setModal('connection')}>
                <Plus size={13} /> Add connection
              </button>
            </div>
            {detail.connections.length === 0 ? (
              <EmptyState icon={<Link2 />}>No connections — link partners, family, colleagues.</EmptyState>
            ) : (
              <div>
                {detail.connections.map((c) => (
                  <div key={c.id} className="list-row">
                    <Avatar name={c.other_name} size="sm" />
                    <div className="body">
                      <Link to={`/people/${c.other_id}`} style={{ fontWeight: 600, textDecoration: 'none' }}>
                        {c.other_name}
                      </Link>
                      <div className="small muted">{c.description}</div>
                    </div>
                    <button
                      className="icon-btn danger actions"
                      onClick={async () => {
                        await api.deleteConnection(c.id)
                        await after()
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {person.notes && (
            <div className="card card-pad">
              <h2 className="card-title" style={{ marginBottom: 8 }}>
                <StickyNote size={16} /> Notes
              </h2>
              <p className="muted" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                {person.notes}
              </p>
            </div>
          )}
        </div>
      </div>

      {modal === 'edit' && <PersonForm existing={person} onClose={() => setModal(null)} onSaved={() => load()} />}
      {modal === 'log' && (
        <LogInteractionModal
          person={person}
          onClose={() => setModal(null)}
          onSaved={() => after()}
        />
      )}
      {modal === 'news' && <AddNewsModal person={person} onClose={() => setModal(null)} onSaved={after} />}
      {modal === 'fact' && <AddFactModal personId={person.id} onClose={() => setModal(null)} onSaved={after} />}
      {modal === 'date' && <AddDateModal personId={person.id} onClose={() => setModal(null)} onSaved={after} />}
      {modal === 'reminder' && <AddReminderModal personId={person.id} onClose={() => setModal(null)} onSaved={after} />}
      {modal === 'gift' && <AddGiftModal personId={person.id} onClose={() => setModal(null)} onSaved={after} />}
      {modal === 'connection' && (
        <AddConnectionModal person={person} people={people} onClose={() => setModal(null)} onSaved={after} />
      )}
    </div>
  )
}

function DetailRow({ icon, k, v }: { icon: React.ReactNode; k: string; v: string | null }) {
  return (
    <div className="detail-row">
      <span className="k row" style={{ gap: 6 }}>
        <span style={{ color: 'var(--muted)', display: 'inline-flex' }}>{icon}</span>
        {k}
      </span>
      <span className="v">{v || '—'}</span>
    </div>
  )
}

function monthShort(m: number): string {
  return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/* ---------- quick-add modals ---------- */

function AddNewsModal({ person, onClose, onSaved }: { person: PersonComputed; onClose: () => void; onSaved: () => Promise<void> }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <Modal
      title={`Record news about ${person.name.split(' ')[0]}`}
      icon={<Megaphone size={17} className="lucide" style={{ color: 'var(--purple)' }} />}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            disabled={!text.trim() || busy}
            onClick={async () => {
              setBusy(true)
              await api.addNews(person.id, text.trim())
              await onSaved()
              onClose()
            }}
          >
            Save news
          </button>
        </>
      }
    >
      <div className="field">
        <label>What’s new with them?</label>
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Started at Figma. Moved to Berlin. Second baby due in March…"
        />
        <div className="hint">The newest piece of news becomes their “latest news”, shown here and in the People table.</div>
      </div>
    </Modal>
  )
}

function AddFactModal({ personId, onClose, onSaved }: { personId: number; onClose: () => void; onSaved: () => Promise<void> }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <Modal
      title="Add a fact worth remembering"
      icon={<Sparkles size={17} className="lucide" style={{ color: 'var(--amber-deep)' }} />}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            disabled={!text.trim() || busy}
            onClick={async () => {
              setBusy(true)
              await api.addFact(personId, text.trim())
              await onSaved()
              onClose()
            }}
          >
            Save fact
          </button>
        </>
      }
    >
      <div className="field">
        <label>Fact</label>
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Allergic to shellfish. Partner is Sam. Supports Arsenal."
        />
        <div className="hint">Small and durable — unlike news, facts don’t go stale.</div>
      </div>
    </Modal>
  )
}

function AddDateModal({ personId, onClose, onSaved }: { personId: number; onClose: () => void; onSaved: () => Promise<void> }) {
  const [type, setType] = useState<ImportantDateType>('birthday')
  const [label, setLabel] = useState('')
  const [day, setDay] = useState('')
  const [month, setMonth] = useState('')
  const [year, setYear] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    setError(null)
    const m = Number(month)
    const d = Number(day)
    if (!m || m < 1 || m > 12 || !d || d < 1 || d > 31) {
      setError('Please give a valid day and month')
      return
    }
    const y = year ? Number(year) : null
    if (y != null && (y < 1850 || y > 2100)) {
      setError('Year looks off — between 1850 and 2100 please')
      return
    }
    setBusy(true)
    try {
      await api.addDate(personId, { type, label: label.trim() || null, month: m, day: d, year: y })
      await onSaved()
      onClose()
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <Modal
      title="Add an important date"
      icon={<Cake size={17} className="lucide" style={{ color: 'var(--amber-deep)' }} />}
      onClose={onClose}
      footer={
        <>
          {error && <span style={{ color: 'var(--red)', marginRight: 'auto', fontSize: 13 }}>{error}</span>}
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={busy}>
            Save date
          </button>
        </>
      }
    >
      <div className="form-grid">
        <div className="field">
          <label>Type</label>
          <select value={type} onChange={(e) => setType(e.target.value as ImportantDateType)}>
            {(Object.keys(DATE_TYPE_LABEL) as ImportantDateType[]).map((t) => (
              <option key={t} value={t}>
                {DATE_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Label {type === 'child_birthday' || type === 'other' ? '(e.g. child’s name)' : '(optional)'}</label>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={type === 'child_birthday' ? 'Louise' : ''} />
        </div>
        <div className="field">
          <label>Day *</label>
          <input type="number" min={1} max={31} value={day} onChange={(e) => setDay(e.target.value)} placeholder="14" />
        </div>
        <div className="field">
          <label>Month *</label>
          <select value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="">—</option>
            {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(
              (m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              )
            )}
          </select>
        </div>
        <div className="field">
          <label>Year (optional)</label>
          <input type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="1990" />
          <div className="hint">With a year we can show their age and flag milestone birthdays.</div>
        </div>
      </div>
    </Modal>
  )
}

function AddReminderModal({ personId, onClose, onSaved }: { personId: number; onClose: () => void; onSaved: () => Promise<void> }) {
  const [text, setText] = useState('')
  const [due, setDue] = useState(todayISO())
  const [busy, setBusy] = useState(false)
  return (
    <Modal
      title="Set a reminder"
      icon={<Bell size={17} className="lucide" style={{ color: 'var(--blue)' }} />}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            disabled={!text.trim() || !due || busy}
            onClick={async () => {
              setBusy(true)
              await api.addReminder(personId, text.trim(), due)
              await onSaved()
              onClose()
            }}
          >
            Save reminder
          </button>
        </>
      }
    >
      <div className="form-grid">
        <div className="field span2">
          <label>What needs doing?</label>
          <input autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Book a table for her birthday" />
        </div>
        <div className="field span2">
          <label>Due date</label>
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          <div className="hint">Reminders due or overdue show up on Today.</div>
        </div>
      </div>
    </Modal>
  )
}

function AddGiftModal({ personId, onClose, onSaved }: { personId: number; onClose: () => void; onSaved: () => Promise<void> }) {
  const [name, setName] = useState('')
  const [kind, setKind] = useState<GiftKind>('idea')
  const [occasion, setOccasion] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <Modal
      title="Add a gift"
      icon={<Gift size={17} className="lucide" style={{ color: 'var(--purple)' }} />}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            disabled={!name.trim() || busy}
            onClick={async () => {
              setBusy(true)
              await api.addGift(personId, { name: name.trim(), kind, occasion: occasion.trim() || null, date: todayISO() })
              await onSaved()
              onClose()
            }}
          >
            Save gift
          </button>
        </>
      }
    >
      <div className="form-grid">
        <div className="field span2">
          <label>What?</label>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ceramic ramen bowl set" />
        </div>
        <div className="field">
          <label>Kind</label>
          <select value={kind} onChange={(e) => setKind(e.target.value as GiftKind)}>
            <option value="idea">Idea (not given yet)</option>
            <option value="given">Given to them</option>
            <option value="received">Received from them</option>
          </select>
        </div>
        <div className="field">
          <label>Occasion</label>
          <input value={occasion} onChange={(e) => setOccasion(e.target.value)} placeholder="Birthday" />
        </div>
      </div>
    </Modal>
  )
}

const KIND_OPTIONS: { value: ConnectionKind; label: string }[] = [
  { value: 'partner', label: 'Partner of' },
  { value: 'parent_child', label: 'Parent / child of' },
  { value: 'sibling', label: 'Sibling of' },
  { value: 'colleague', label: 'Colleague of' },
  { value: 'other', label: 'Other' },
]

function AddConnectionModal({
  person,
  people,
  onClose,
  onSaved,
}: {
  person: PersonComputed
  people: PersonComputed[]
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const others = people.filter((p) => p.id !== person.id)
  const [otherId, setOtherId] = useState<number | ''>('')
  const [kind, setKind] = useState<ConnectionKind>('partner')
  const [aIsParent, setAIsParent] = useState(true)
  const [label, setLabel] = useState('')
  const [inverseLabel, setInverseLabel] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const otherName = others.find((p) => p.id === otherId)?.name ?? ''

  const save = async () => {
    if (!otherId) {
      setError('Pick a person to connect')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await api.addConnection(person.id, {
        other_id: Number(otherId),
        kind,
        a_is_parent: kind === 'parent_child' ? aIsParent : false,
        label: kind === 'other' && label.trim() ? `${label.trim()} ${otherName}`.replace('{name}', otherName) : kind === 'other' ? `Connected to ${otherName}` : null,
        inverse_label: kind === 'other' && inverseLabel.trim() ? `${inverseLabel.trim()} ${person.name}`.replace('{name}', person.name) : kind === 'other' ? `Connected to ${person.name}` : null,
        note: kind === 'colleague' && note.trim() ? note.trim() : null,
      })
      await onSaved()
      onClose()
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <Modal
      title={`Connect ${person.name.split(' ')[0]} to someone`}
      icon={<Link2 size={17} className="lucide" style={{ color: 'var(--blue)' }} />}
      onClose={onClose}
      footer={
        <>
          {error && <span style={{ color: 'var(--red)', marginRight: 'auto', fontSize: 13 }}>{error}</span>}
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={busy}>
            Save connection
          </button>
        </>
      }
    >
      <div className="form-grid">
        <div className="field span2">
          <label>Person</label>
          <select value={otherId} onChange={(e) => setOtherId(Number(e.target.value) || '')}>
            <option value="">— choose —</option>
            {others.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field span2">
          <label>Relationship</label>
          <select value={kind} onChange={(e) => setKind(e.target.value as ConnectionKind)}>
            {KIND_OPTIONS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </div>
        {kind === 'parent_child' && otherId !== '' && (
          <div className="field span2">
            <label>Who is the parent?</label>
            <div className="row" style={{ gap: 8 }}>
              <label className="row" style={{ gap: 6, cursor: 'pointer', fontWeight: 400 }}>
                <input type="radio" checked={aIsParent} onChange={() => setAIsParent(true)} /> {person.name} is the parent
              </label>
              <label className="row" style={{ gap: 6, cursor: 'pointer', fontWeight: 400 }}>
                <input type="radio" checked={!aIsParent} onChange={() => setAIsParent(false)} /> {otherName} is the parent
              </label>
            </div>
          </div>
        )}
        {kind === 'colleague' && (
          <div className="field span2">
            <label>Where? (optional)</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="at Fabrikam, years ago" />
          </div>
        )}
        {kind === 'other' && (
          <>
            <div className="field">
              <label>On {person.name.split(' ')[0]}’s page</label>
              <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={`e.g. “Introduced me to” ${otherName || '…'}`} />
            </div>
            <div className="field">
              <label>On {otherName ? otherName.split(' ')[0] : 'their'}’s page</label>
              <input value={inverseLabel} onChange={(e) => setInverseLabel(e.target.value)} placeholder={`e.g. “Introduced me to” ${person.name.split(' ')[0]}`} />
            </div>
          </>
        )}
      </div>
      <div className="hint" style={{ marginTop: 8 }}>
        Connections appear on both people’s pages, reading correctly from each side.
      </div>
    </Modal>
  )
}
