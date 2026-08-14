import { useState } from 'react'
import { CalendarDays, Mail, MessageSquare, Phone, PhoneCall, UserRound, Coffee } from 'lucide-react'
import type { InteractionType, PersonComputed } from '../../server/lib/types'
import { api } from '../api'
import { Modal } from './ui'
import { todayISO, INTERACTION_META } from '../lib/format'
import { useToast } from '../store'

const ICONS: Record<InteractionType, React.ReactNode> = {
  call: <PhoneCall size={15} />,
  message: <MessageSquare size={15} />,
  email: <Mail size={15} />,
  met: <Coffee size={15} />,
  other: <UserRound size={15} />,
}

export function interactionIcon(type: InteractionType | null): React.ReactNode {
  if (type == null) return <UserRound size={15} />
  return ICONS[type]
}

export function LogInteractionModal({
  person,
  onClose,
  onSaved,
}: {
  person: PersonComputed
  onClose: () => void
  onSaved?: () => void
}) {
  const [type, setType] = useState<InteractionType>('call')
  const [date, setDate] = useState(todayISO())
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const toast = useToast()

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      await api.addInteraction(person.id, type, date, notes.trim())
      toast.push(`Logged a ${INTERACTION_META[type].label.toLowerCase()} with ${person.name.split(' ')[0]} — the clock is reset`)
      onSaved?.()
      onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={`Log an interaction with ${person.name.split(' ')[0]}`}
      icon={<Phone size={17} className="lucide" style={{ color: 'var(--blue)' }} />}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={save} disabled={saving || !date}>
            {saving ? 'Saving…' : 'Save interaction'}
          </button>
        </>
      }
    >
      {error && <p style={{ color: 'var(--red)' }}>{error}</p>}
      <div className="form-grid">
        <div className="field">
          <label>Type</label>
          <div className="row wrap" style={{ gap: 6 }}>
            {(Object.keys(INTERACTION_META) as InteractionType[]).map((t) => (
              <button
                key={t}
                className={`btn btn-sm${type === t ? ' btn-blue' : ''}`}
                onClick={() => setType(t)}
                type="button"
              >
                {ICONS[t]}
                {INTERACTION_META[t].label}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label>Date</label>
          <div className="row">
            <CalendarDays size={15} color="var(--muted)" />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ flex: 1 }} />
          </div>
        </div>
        <div className="field span2">
          <label>What did you talk about?</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes on the conversation — the little things worth remembering"
            autoFocus
          />
        </div>
      </div>
    </Modal>
  )
}
