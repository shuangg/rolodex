import { useRef, useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import type { Circle, PersonInput } from '../../server/lib/types'
import type { PersonComputed } from '../../server/lib/types'
import { api } from '../api'
import { Modal, Avatar } from './ui'
import { CIRCLE_LABEL } from '../lib/format'
import { useToast, useStore } from '../store'

const COMMON_TZ = [
  'Europe/London', 'Europe/Dublin', 'Europe/Lisbon', 'Europe/Paris', 'Europe/Berlin', 'Europe/Amsterdam',
  'Europe/Stockholm', 'Europe/Madrid', 'Europe/Rome', 'Europe/Athens', 'Europe/Prague', 'Europe/Warsaw',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Vancouver',
  'America/Toronto', 'America/Sao_Paulo', 'America/Argentina/Buenos_Aires', 'Asia/Jerusalem', 'Asia/Dubai',
  'Asia/Kolkata', 'Asia/Tokyo', 'Asia/Seoul', 'Asia/Singapore', 'Australia/Sydney', 'Africa/Accra',
  'Africa/Casablanca', 'Pacific/Auckland',
]

export function PersonForm({
  existing,
  onClose,
  onSaved,
}: {
  existing?: PersonComputed
  onClose: () => void
  onSaved?: (person: PersonComputed) => void
}) {
  const { refresh } = useStore()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(existing?.name ?? '')
  const [email, setEmail] = useState(existing?.email ?? '')
  const [phone, setPhone] = useState(existing?.phone ?? '')
  const [jobTitle, setJobTitle] = useState(existing?.job_title ?? '')
  const [company, setCompany] = useState(existing?.company ?? '')
  const [city, setCity] = useState(existing?.city ?? '')
  const [timezone, setTimezone] = useState(existing?.timezone ?? '')
  const [circle, setCircle] = useState<Circle>(existing?.circle ?? 'close')
  const [tags, setTags] = useState((existing?.tags ?? []).join(', '))
  const [howMet, setHowMet] = useState(existing?.how_met ?? '')
  const [metWhere, setMetWhere] = useState(existing?.met_where ?? '')
  const [metOn, setMetOn] = useState(existing?.met_on ?? '')
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [photo, setPhoto] = useState<string | null>(existing?.photo ?? null)
  const [cadenceOverride, setCadenceOverride] = useState<string>(
    existing?.cadence_override_days != null ? String(existing.cadence_override_days) : ''
  )
  const [checkinsOff, setCheckinsOff] = useState(existing?.checkins_off ?? false)
  const [snoozedUntil, setSnoozedUntil] = useState(existing?.snoozed_until ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onPickPhoto = (f: File | null) => {
    if (!f) return
    if (f.size > 5 * 1024 * 1024) {
      setError('Photo is too large — please use one under 5 MB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setPhoto(String(reader.result))
    reader.readAsDataURL(f)
  }

  const save = async () => {
    if (!name.trim()) {
      setError('A name is required')
      return
    }
    setSaving(true)
    setError(null)
    const body: Partial<PersonInput> = {
      name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      job_title: jobTitle.trim() || null,
      company: company.trim() || null,
      city: city.trim() || null,
      timezone: timezone.trim() || null,
      circle,
      tags: tags
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
      how_met: howMet.trim() || null,
      met_where: metWhere.trim() || null,
      met_on: metOn || null,
      notes: notes.trim() || null,
      photo,
      cadence_override_days: cadenceOverride ? Math.max(1, Number(cadenceOverride)) : null,
      checkins_off: checkinsOff,
      snoozed_until: snoozedUntil || null,
    }
    try {
      const saved = existing ? await api.updatePerson(existing.id, body) : await api.createPerson(body)
      await refresh()
      toast.push(existing ? `${saved.name} updated` : `${saved.name} added to your Rolodex`)
      onSaved?.(saved)
      onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      large
      title={existing ? `Edit ${existing.name}` : 'Add a person'}
      icon={<ImagePlus size={17} className="lucide" style={{ color: 'var(--blue)' }} />}
      onClose={onClose}
      footer={
        <>
          {error && <span style={{ color: 'var(--red)', marginRight: 'auto', fontSize: 13 }}>{error}</span>}
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : existing ? 'Save changes' : 'Add person'}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', gap: 18, marginBottom: 18, alignItems: 'center' }}>
        <Avatar name={name || 'New Person'} photo={photo} size="xl" />
        <div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-sm" onClick={() => fileRef.current?.click()} type="button">
              <ImagePlus size={14} /> Upload photo
            </button>
            {photo && (
              <button className="btn btn-sm" onClick={() => setPhoto(null)} type="button">
                <Trash2 size={14} /> Remove
              </button>
            )}
          </div>
          <div className="hint" style={{ fontSize: 12, color: 'var(--muted)', marginTop: 5 }}>
            Without a photo we’ll use their initials on a colour of their own.
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => onPickPhoto(e.target.files?.[0] ?? null)}
          />
        </div>
      </div>

      <div className="form-grid">
        <div className="field span2">
          <label>Name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Lovelace" autoFocus />
        </div>
        <div className="field">
          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ada@example.com" />
        </div>
        <div className="field">
          <label>Phone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+44 20 7000 0000" />
        </div>
        <div className="field">
          <label>Job title</label>
          <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Product Designer" />
        </div>
        <div className="field">
          <label>Company</label>
          <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Figma" />
        </div>
        <div className="field">
          <label>City</label>
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="London" />
        </div>
        <div className="field">
          <label>Time zone</label>
          <input list="tz-list" value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="Europe/London" />
          <datalist id="tz-list">
            {COMMON_TZ.map((tz) => (
              <option key={tz} value={tz} />
            ))}
          </datalist>
        </div>
        <div className="field span2">
          <label>Circle</label>
          <div className="row wrap" style={{ gap: 6 }}>
            {(['inner', 'close', 'wider', 'distant'] as Circle[]).map((c) => (
              <button key={c} type="button" className={`btn btn-sm${circle === c ? ' btn-blue' : ''}`} onClick={() => setCircle(c)}>
                {CIRCLE_LABEL[c]}
              </button>
            ))}
          </div>
          <div className="hint">
            Circle sets the check-in cadence: Inner monthly · Close quarterly · Wider every six months · Distant yearly.
          </div>
        </div>
        <div className="field span2">
          <label>Tags</label>
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="family, university, cycling" />
          <div className="hint">Comma-separated — filter the People table by them later.</div>
        </div>
        <div className="field">
          <label>How you met</label>
          <input value={howMet} onChange={(e) => setHowMet(e.target.value)} placeholder="University flatmates" />
        </div>
        <div className="field">
          <label>Where you met</label>
          <input value={metWhere} onChange={(e) => setMetWhere(e.target.value)} placeholder="Manchester" />
        </div>
        <div className="field">
          <label>When you met</label>
          <input type="date" value={metOn} onChange={(e) => setMetOn(e.target.value)} />
        </div>
        <div className="field">
          <label>Check-in cadence override (days)</label>
          <input
            type="number"
            min={1}
            value={cadenceOverride}
            onChange={(e) => setCadenceOverride(e.target.value)}
            placeholder="Circle default"
          />
          <div className="hint">Leave empty to use the circle’s cadence.</div>
        </div>
        <div className="field">
          <label>Snooze check-ins until</label>
          <input type="date" value={snoozedUntil} onChange={(e) => setSnoozedUntil(e.target.value)} />
          <div className="hint">They stay in your list but stop nudging you until this date.</div>
        </div>
        <div className="field" style={{ alignSelf: 'end' }}>
          <label style={{ fontWeight: 400, display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" checked={checkinsOff} onChange={(e) => setCheckinsOff(e.target.checked)} style={{ width: 'auto' }} />
            Turn check-ins off for this person
          </label>
        </div>
        <div className="field span2">
          <label>Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Freeform notes about them" />
        </div>
      </div>
    </Modal>
  )
}
