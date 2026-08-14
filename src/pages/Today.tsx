import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  BadgeCheck,
  Bell,
  Cake,
  History,
  LayoutDashboard,
  Phone,
  Sparkles,
} from 'lucide-react'
import { api, type StatsPayload, type TodayPayload } from '../api'
import type { PersonComputed } from '../../server/lib/types'
import { Avatar, EmptyState, StatusBadge } from '../components/ui'
import { LogInteractionModal } from '../components/LogInteractionModal'
import { interactionIcon } from '../components/LogInteractionModal'
import { dateTypeLabel } from '../../server/lib/importantDates'
import { fmtDate, relativeDays, INTERACTION_META, CIRCLE_LABEL } from '../lib/format'
import { useStore, useToast } from '../store'
import { format, parseISO } from 'date-fns'

export default function Today() {
  const { people, refresh, loaded } = useStore()
  const toast = useToast()
  const navigate = useNavigate()
  const [payload, setPayload] = useState<TodayPayload | null>(null)
  const [stats, setStats] = useState<StatsPayload | null>(null)
  const [logging, setLogging] = useState<PersonComputed | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadAll = useCallback(async () => {
    try {
      const [t, s] = await Promise.all([api.today(), api.stats()])
      setPayload(t)
      setStats(s)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll, people.length])

  const afterLog = async () => {
    await Promise.all([loadAll(), refresh()])
  }

  if (error) return <div className="page">Couldn’t load Today: {error}</div>
  if (!payload) return <div className="page muted">Loading…</div>

  const overdueCount = payload.to_contact.filter((p) => p.status === 'overdue').length
  const dueSoonCount = payload.to_contact.filter((p) => p.status === 'due_soon').length
  const remindersDue = payload.reminders.length
  const datesUpcoming = payload.upcoming_dates.length

  const peopleById = new Map(people.map((p) => [p.id, p]))
  const top = payload.to_contact[0]

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <span className="icon-sq" style={{ background: 'var(--amber-soft)', color: 'var(--amber-deep)' }}>
              <LayoutDashboard size={19} />
            </span>
            Today
          </h1>
          <p className="page-desc">
            {format(new Date(), 'EEEE d MMMM yyyy')} — what needs your attention.
          </p>
        </div>
      </div>

      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-num" style={{ color: 'var(--red)' }}>{overdueCount}</div>
          <div className="stat-label">
            <Phone size={13} /> overdue to contact
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: 'var(--amber-deep)' }}>{dueSoonCount}</div>
          <div className="stat-label">
            <History size={13} /> due within a week
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: 'var(--purple)' }}>{datesUpcoming}</div>
          <div className="stat-label">
            <Cake size={13} /> dates in 30 days
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: 'var(--blue-deep)' }}>{remindersDue}</div>
          <div className="stat-label">
            <Bell size={13} /> reminders open
          </div>
        </div>
      </div>

      {/* ---------- hero: who to contact ---------- */}
      <div className="hero">
        <div className="hero-head">
          <h2 className="hero-title">
            <Phone size={18} />
            Who to contact
          </h2>
          <div className="hero-count">
            {payload.to_contact.length === 0
              ? 'everyone is in touch — go enjoy your day'
              : top && top.status === 'overdue'
                ? `most overdue: ${top.name}${top.overdue_days ? ` · ${top.overdue_days} days` : ' · never contacted'}`
                : `${overdueCount} overdue · ${dueSoonCount} due soon`}
          </div>
        </div>
        {payload.to_contact.length === 0 ? (
          <div style={{ padding: '18px 4px', color: '#b9b9c3' }}>
            Nobody needs your attention right now. Everyone’s inside their check-in window — have a look at the{' '}
            <Link to="/circles" style={{ color: 'var(--amber)' }}>
              Circles board
            </Link>{' '}
            if you fancy getting ahead.
          </div>
        ) : (
          <div className="hero-list">
            {payload.to_contact.slice(0, 8).map((row) => {
              const person = peopleById.get(row.id)
              return (
                <div key={row.id} className="hero-row">
                  <div className="who" onClick={() => person && navigate(`/people/${row.id}`)} role="button" tabIndex={0}>
                    <Avatar name={row.name} photo={row.photo} />
                    <div className="grow">
                      <div className="row" style={{ gap: 8 }}>
                        <span className="name">{row.name}</span>
                        <span className="chip" style={{ background: 'rgba(255,255,255,0.12)', borderColor: 'transparent', color: '#d9d9e0' }}>
                          {CIRCLE_LABEL[row.circle]}
                        </span>
                      </div>
                      <div className="meta">
                        {row.last_contacted ? `last contacted ${relativeDays(row.last_contacted, payload.today)}` : 'never contacted'}
                        {row.latest_news ? ` · ${row.latest_news.text}` : ''}
                      </div>
                    </div>
                  </div>
                  <div className={`hero-urgency ${row.status === 'overdue' ? 'overdue' : 'due'}`}>
                    {row.status === 'overdue'
                      ? row.overdue_days > 0
                        ? `${row.overdue_days} days overdue`
                        : 'never contacted'
                      : `due ${relativeDays(row.next_due, payload.today)}`}
                  </div>
                  {person && (
                    <button className="btn btn-sm btn-amber" onClick={() => setLogging(person)}>
                      <Phone size={13} /> Log contact
                    </button>
                  )}
                </div>
              )
            })}
            {payload.to_contact.length > 8 && (
              <div style={{ padding: '10px 6px 0', borderTop: '1px solid rgba(255,255,255,0.09)' }}>
                <Link to="/people" style={{ color: 'var(--amber)', fontSize: 13, fontWeight: 600 }}>
                  and {payload.to_contact.length - 8} more →
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="today-grid">
        {/* ---------- upcoming dates ---------- */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <Cake size={16} /> Dates coming up
            </h2>
            <Link to="/calendar" className="small" style={{ textDecoration: 'none' }}>
              Calendar →
            </Link>
          </div>
          {payload.upcoming_dates.length === 0 ? (
            <EmptyState icon={<Cake />}>No birthdays or important dates in the next 30 days.</EmptyState>
          ) : (
            payload.upcoming_dates.slice(0, 7).map((e) => {
              const person = peopleById.get(e.person_id)
              return (
                <Link key={`${e.id}-${e.date}`} to={`/people/${e.person_id}`} className="upcoming-item" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="date-pill">
                    <span className="mon">{format(parseISO(e.date), 'MMM')}</span>
                    <span className="day">{format(parseISO(e.date), 'd')}</span>
                  </div>
                  <Avatar name={e.person_name} photo={person?.photo} size="sm" />
                  <div className="grow">
                    <div style={{ fontWeight: 600 }}>
                      {e.person_name}
                      {e.milestone && (
                        <span className="badge status-due_soon" style={{ marginLeft: 8 }}>
                          turns {e.age_turning}!
                        </span>
                      )}
                    </div>
                    <div className="small muted">
                      {dateTypeLabel(e.type, e.label)}
                      {e.age_turning != null && !e.milestone ? ` · turns ${e.age_turning}` : ''}
                    </div>
                  </div>
                  <span className="small muted">{relativeDays(e.date, payload.today)}</span>
                </Link>
              )
            })
          )}
        </div>

        {/* ---------- reminders ---------- */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <Bell size={16} /> Reminders
            </h2>
          </div>
          {payload.reminders.length === 0 ? (
            <EmptyState icon={<Bell />}>No reminders due — nothing on your list.</EmptyState>
          ) : (
            payload.reminders.slice(0, 7).map((r) => (
              <div key={r.id} className="list-row">
                <button
                  className="reminder-check"
                  title="Mark done"
                  onClick={async () => {
                    await api.setReminderDone(r.id, true)
                    await afterLog()
                    toast.push('Reminder done — nice')
                  }}
                >
                  <BadgeCheck size={0} />
                </button>
                <div className="body">
                  <div style={{ fontWeight: 600 }}>{r.text}</div>
                  <div className="small muted">
                    <Link to={`/people/${r.person_id}`}>{r.person_name}</Link> · due {fmtDate(r.due_date)} ·{' '}
                    <span style={{ color: r.overdue ? 'var(--red)' : undefined, fontWeight: r.overdue ? 700 : 400 }}>
                      {r.due_today ? 'today' : relativeDays(r.due_date, payload.today)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ---------- charts ---------- */}
        <div className="card card-pad span2">
          <h2 className="card-title" style={{ marginBottom: 14 }}>
            <Sparkles size={16} /> How you’re doing
          </h2>
          {stats ? (
            <div className="calendar-wrap" style={{ gridTemplateColumns: '3fr 2fr' }}>
              <div>
                <div className="small muted" style={{ fontWeight: 700, marginBottom: 6 }}>
                  Interactions logged per month
                </div>
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={stats.months} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--muted)' }} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: 'var(--surface-2)' }} contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', fontSize: 12 }} />
                    <Bar dataKey="count" name="Interactions" fill="var(--blue)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <div className="small muted" style={{ fontWeight: 700, marginBottom: 6 }}>
                  People per circle, by check-in status
                </div>
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={stats.circles} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--muted)' }} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: 'var(--surface-2)' }} contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="in_touch" name="In touch" stackId="s" fill="#9cc3a8" radius={0} />
                    <Bar dataKey="due_soon" name="Due soon" stackId="s" fill="var(--amber)" />
                    <Bar dataKey="overdue" name="Overdue" stackId="s" fill="var(--red)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="snoozed" name="Snoozed" stackId="s" fill="#c9c9d2" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="muted small">Loading charts…</div>
          )}
        </div>

        {/* ---------- recent activity ---------- */}
        <div className="card span2">
          <div className="card-header">
            <h2 className="card-title">
              <History size={16} /> Recent activity
            </h2>
            <Link to="/timeline" className="small" style={{ textDecoration: 'none' }}>
              Full timeline →
            </Link>
          </div>
          {payload.recent.length === 0 ? (
            <EmptyState icon={<History />}>Nothing logged yet — record an interaction and it’ll show up here.</EmptyState>
          ) : (
            <div className="feed">
              {payload.recent.slice(0, 8).map((e) => {
                const person = peopleById.get(e.person_id)
                return (
                  <div key={e.id} className="feed-item">
                    <Avatar name={e.person_name} photo={person?.photo} />
                    <div className="feed-body">
                      <div className="feed-top">
                        <Link className="feed-person" to={`/people/${e.person_id}`}>
                          {e.person_name}
                        </Link>
                        <span className="feed-type">
                          {e.kind === 'interaction' && e.interaction_type
                            ? INTERACTION_META[e.interaction_type].verb
                            : e.kind === 'news'
                              ? 'news recorded'
                              : 'reminder completed'}
                        </span>
                        <span className="feed-date">
                          {fmtDate(e.date)} · {relativeDays(e.date, payload.today)}
                        </span>
                      </div>
                      {e.text && <div className="feed-text">{e.text}</div>}
                    </div>
                    <div className="feed-icon kind-other">{interactionIcon(e.interaction_type)}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {logging && <LogInteractionModal person={logging} onClose={() => setLogging(null)} onSaved={afterLog} />}
      {!loaded && <div />}
    </div>
  )
}
