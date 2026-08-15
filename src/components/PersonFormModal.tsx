import { useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import { Modal } from "./Modal";
import { api } from "../api";
import { Avatar } from "./Avatar";
import type { Circle, PersonWithMeta } from "../types";
import { CIRCLE_LABELS } from "../types";

interface PersonFormModalProps {
  person?: PersonWithMeta | null;
  onClose: () => void;
  onSaved: () => void;
}

const EMPTY = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  jobTitle: "",
  company: "",
  city: "",
  timeZone: "",
  circle: "wider" as Circle,
  cadenceOverrideDays: "",
  checkinsOptedOut: false,
  snoozeUntil: "",
  howMet: "",
  whereMet: "",
  whenMet: "",
  notes: "",
  tags: "",
};

export function PersonFormModal({ person, onClose, onSaved }: PersonFormModalProps) {
  const [form, setForm] = useState(() => ({
    ...EMPTY,
    ...(person
      ? {
          firstName: person.firstName,
          lastName: person.lastName ?? "",
          email: person.email ?? "",
          phone: person.phone ?? "",
          jobTitle: person.jobTitle ?? "",
          company: person.company ?? "",
          city: person.city ?? "",
          timeZone: person.timeZone ?? "",
          circle: person.circle,
          cadenceOverrideDays: person.cadenceOverrideDays != null ? String(person.cadenceOverrideDays) : "",
          checkinsOptedOut: person.checkinsOptedOut,
          snoozeUntil: person.snoozeUntil ?? "",
          howMet: person.howMet ?? "",
          whereMet: person.whereMet ?? "",
          whenMet: person.whenMet ?? "",
          notes: person.notes ?? "",
          tags: person.tags.join(", "),
        }
      : {}),
  }));
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const payload = () => ({
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim() || null,
    email: form.email.trim() || null,
    phone: form.phone.trim() || null,
    jobTitle: form.jobTitle.trim() || null,
    company: form.company.trim() || null,
    city: form.city.trim() || null,
    timeZone: form.timeZone.trim() || null,
    circle: form.circle,
    cadenceOverrideDays: form.cadenceOverrideDays ? Number(form.cadenceOverrideDays) : null,
    checkinsOptedOut: form.checkinsOptedOut,
    snoozeUntil: form.snoozeUntil || null,
    howMet: form.howMet.trim() || null,
    whereMet: form.whereMet.trim() || null,
    whenMet: form.whenMet.trim() || null,
    notes: form.notes.trim() || null,
    tags: form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
  });

  const save = async () => {
    if (!form.firstName.trim()) {
      setError("First name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (person) {
        await api.updatePerson(person.id, payload());
        if (photoFile) await api.uploadPhoto(person.id, photoFile);
      } else {
        const created = await api.createPerson(payload());
        if (photoFile) await api.uploadPhoto(created.id, photoFile);
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setSaving(false);
    }
  };

  const removePhoto = async () => {
    if (!person) return;
    await api.deletePhoto(person.id);
    onSaved();
  };

  return (
    <Modal
      title={person ? "Edit person" : "Add a person"}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : person ? "Save changes" : "Add person"}
          </button>
        </>
      }
    >
      <div className="stack">
        <div className="row">
          {photoFile ? (
            <img className="avatar avatar-xl" src={URL.createObjectURL(photoFile)} alt="Photo preview" />
          ) : person ? (
            <Avatar person={person} size="xl" />
          ) : (
            <span className="avatar avatar-xl avatar-fallback" style={{ background: "#e8eaee" }} aria-hidden="true">
              ?
            </span>
          )}
          <div className="stack" style={{ gap: 8 }}>
            <label className="btn btn-sm">
              <Camera size={14} />
              Upload photo
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {person?.hasPhoto ? (
              <button className="btn btn-sm btn-danger" onClick={removePhoto}>
                <Trash2 size={14} />
                Remove photo
              </button>
            ) : null}
          </div>
        </div>

        <div className="form-grid">
          <div className="field">
            <label className="label" htmlFor="pf-first">First name</label>
            <input id="pf-first" className="input" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />
          </div>
          <div className="field">
            <label className="label" htmlFor="pf-last">Last name</label>
            <input id="pf-last" className="input" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />
          </div>
          <div className="field">
            <label className="label" htmlFor="pf-email">Email</label>
            <input id="pf-email" className="input" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div className="field">
            <label className="label" htmlFor="pf-phone">Phone</label>
            <input id="pf-phone" className="input" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div className="field">
            <label className="label" htmlFor="pf-company">Company</label>
            <input id="pf-company" className="input" value={form.company} onChange={(e) => set("company", e.target.value)} />
          </div>
          <div className="field">
            <label className="label" htmlFor="pf-job">Job title</label>
            <input id="pf-job" className="input" value={form.jobTitle} onChange={(e) => set("jobTitle", e.target.value)} />
          </div>
          <div className="field">
            <label className="label" htmlFor="pf-city">City</label>
            <input id="pf-city" className="input" value={form.city} onChange={(e) => set("city", e.target.value)} />
          </div>
          <div className="field">
            <label className="label" htmlFor="pf-tz">Time zone</label>
            <input id="pf-tz" className="input" value={form.timeZone} onChange={(e) => set("timeZone", e.target.value)} />
          </div>
          <div className="field">
            <label className="label" htmlFor="pf-circle">Circle</label>
            <select id="pf-circle" className="select" value={form.circle} onChange={(e) => set("circle", e.target.value as Circle)}>
              {(Object.keys(CIRCLE_LABELS) as Circle[]).map((c) => (
                <option key={c} value={c}>
                  {CIRCLE_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="label" htmlFor="pf-cadence">Check-in cadence (days, override)</label>
            <input
              id="pf-cadence"
              className="input"
              type="number"
              min={1}
              placeholder="From circle"
              value={form.cadenceOverrideDays}
              onChange={(e) => set("cadenceOverrideDays", e.target.value)}
            />
          </div>
          <div className="field full">
            <label className="checkbox-label">
              <input type="checkbox" checked={form.checkinsOptedOut} onChange={(e) => set("checkinsOptedOut", e.target.checked)} />
              Turn check-ins off for this person
            </label>
          </div>
          <div className="field full">
            <label className="label" htmlFor="pf-snooze">Snooze until</label>
            <input id="pf-snooze" className="input" type="date" value={form.snoozeUntil} onChange={(e) => set("snoozeUntil", e.target.value)} />
            <span className="hint">They stay on your list, but stop nudging you until this date.</span>
          </div>
          <div className="field">
            <label className="label" htmlFor="pf-how">How you met</label>
            <input id="pf-how" className="input" value={form.howMet} onChange={(e) => set("howMet", e.target.value)} />
          </div>
          <div className="field">
            <label className="label" htmlFor="pf-where">Where you met</label>
            <input id="pf-where" className="input" value={form.whereMet} onChange={(e) => set("whereMet", e.target.value)} />
          </div>
          <div className="field full">
            <label className="label" htmlFor="pf-when">When you met</label>
            <input id="pf-when" className="input" value={form.whenMet} onChange={(e) => set("whenMet", e.target.value)} />
          </div>
          <div className="field full">
            <label className="label" htmlFor="pf-tags">Tags</label>
            <input id="pf-tags" className="input" placeholder="family, university, cycling" value={form.tags} onChange={(e) => set("tags", e.target.value)} />
          </div>
          <div className="field full">
            <label className="label" htmlFor="pf-notes">Notes</label>
            <textarea id="pf-notes" className="textarea" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </div>
        {error ? <p className="error-text">{error}</p> : null}
      </div>
    </Modal>
  );
}
