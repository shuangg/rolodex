import type { CheckInStatus, Circle, InteractionType, ImportantDateType, GiftKind } from '../../server/lib/types'
import { format, parseISO, isValid, differenceInCalendarDays } from 'date-fns'

export const STATUS_LABEL: Record<CheckInStatus, string> = {
  in_touch: 'In touch',
  due_soon: 'Due soon',
  overdue: 'Overdue',
  snoozed: 'Snoozed',
  off: 'Check-ins off',
}

export const CIRCLE_LABEL: Record<Circle, string> = {
  inner: 'Inner',
  close: 'Close',
  wider: 'Wider',
  distant: 'Distant',
}

export const INTERACTION_META: Record<InteractionType, { label: string; verb: string }> = {
  call: { label: 'Call', verb: 'Called' },
  message: { label: 'Message', verb: 'Messaged' },
  email: { label: 'Email', verb: 'Emailed' },
  met: { label: 'Met up', verb: 'Met up' },
  other: { label: 'Other', verb: 'Other contact' },
}

export const DATE_TYPE_LABEL: Record<ImportantDateType, string> = {
  birthday: 'Birthday',
  anniversary: 'Anniversary',
  work_anniversary: 'Work anniversary',
  child_birthday: "Child's birthday",
  other: 'Important date',
}

export const GIFT_KIND_LABEL: Record<GiftKind, string> = {
  idea: 'Idea',
  given: 'Given',
  received: 'Received',
}

export function fmtDate(iso: string | null | undefined, fallback = '—'): string {
  if (!iso) return fallback
  const d = parseISO(iso)
  return isValid(d) ? format(d, 'd MMM yyyy') : fallback
}

export function fmtDateShort(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = parseISO(iso)
  return isValid(d) ? format(d, 'd MMM') : '—'
}

export function relativeDays(iso: string | null | undefined, fromToday?: string): string {
  if (!iso) return 'never contacted'
  const ref = fromToday ? parseISO(fromToday) : new Date()
  const diff = differenceInCalendarDays(parseISO(iso), ref)
  if (diff === 0) return 'today'
  if (diff === 1) return 'yesterday'
  if (diff === -1) return 'tomorrow'
  if (diff < 0) return `${-diff} days ago`
  return `in ${diff} days`
}

const AVATAR_COLORS = [
  '#209dd7',
  '#753991',
  '#d98a00',
  '#217a4b',
  '#cf4436',
  '#0f766e',
  '#5b6ee1',
  '#b1359b',
  '#8a6d1f',
  '#64748b',
]

export function avatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function localTimeIn(timezone: string | null | undefined): string | null {
  if (!timezone) return null
  try {
    return new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit' }).format(new Date())
  } catch {
    return null
  }
}

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}
