import { useEffect, useState, type FormEvent } from "react";
import type { Circle, PersonInput, PersonListItem } from "@shared/types";
import { CIRCLE_CADENCE_LABELS, CIRCLE_LABELS, CIRCLES } from "@shared/types";
import { TIMEZONES } from "@shared/copy";
import { Button, Field, inputClass } from "./ui";

const empty: PersonInput = {
  name: "",
  email: "",
  phone: "",
  jobTitle: "",
  company: "",
  city: "",
  timezone: "",
  circle: "wider",
  cadenceOverrideDays: null,
  checkinsEnabled: true,
  snoozeUntil: "",
  howMet: "",
  whereMet: "",
  whenMet: "",
  notes: "",
  tags: [],
};

export function PersonForm({
  person,
  onSave,
  onCancel,
}: {
  person?: PersonListItem;
  onSave: (input: PersonInput, photo?: File | null) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<PersonInput>(empty);
  const [tagText, setTagText] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!person) {
      setForm(empty);
      setTagText("");
      return;
    }
    setForm({
      name: person.name,
      email: person.email ?? "",
      phone: person.phone ?? "",
      jobTitle: person.jobTitle ?? "",
      company: person.company ?? "",
      city: person.city ?? "",
      timezone: person.timezone ?? "",
      circle: person.circle,
      cadenceOverrideDays: person.cadenceOverrideDays,
      checkinsEnabled: person.checkinsEnabled,
      snoozeUntil: person.snoozeUntil ?? "",
      howMet: person.howMet ?? "",
      whereMet: person.whereMet ?? "",
      whenMet: person.whenMet ?? "",
      notes: person.notes ?? "",
      tags: person.tags,
    });
    setTagText(person.tags.join(", "));
  }, [person]);

  function set<K extends keyof PersonInput>(key: K, value: PersonInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("A name is required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onSave(
        {
          ...form,
          tags: tagText
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        },
        photo,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      <Field label="Name">
        <input className={`${inputClass} w-full`} value={form.name} onChange={(e) => set("name", e.target.value)} required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Email">
          <input className={inputClass} value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <Field label="Phone">
          <input className={inputClass} value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Job title">
          <input className={inputClass} value={form.jobTitle ?? ""} onChange={(e) => set("jobTitle", e.target.value)} />
        </Field>
        <Field label="Company">
          <input className={inputClass} value={form.company ?? ""} onChange={(e) => set("company", e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="City">
          <input className={inputClass} value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} />
        </Field>
        <Field label="Time zone">
          <select className={inputClass} value={form.timezone ?? ""} onChange={(e) => set("timezone", e.target.value)}>
            <option value="">Unknown</option>
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Circle">
          <select className={inputClass} value={form.circle} onChange={(e) => set("circle", e.target.value as Circle)}>
            {CIRCLES.map((c) => (
              <option key={c} value={c}>
                {CIRCLE_LABELS[c]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Check-in cadence">
          <select
            className={inputClass}
            value={form.checkinsEnabled === false ? "off" : form.cadenceOverrideDays == null ? "default" : String(form.cadenceOverrideDays)}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "off") {
                set("checkinsEnabled", false);
                set("cadenceOverrideDays", null);
              } else if (v === "default") {
                set("checkinsEnabled", true);
                set("cadenceOverrideDays", null);
              } else {
                set("checkinsEnabled", true);
                set("cadenceOverrideDays", Number(v));
              }
            }}
          >
            <option value="default">Circle default ({CIRCLE_CADENCE_LABELS[form.circle]})</option>
            <option value="14">Every 2 weeks</option>
            <option value="30">Monthly</option>
            <option value="91">Quarterly</option>
            <option value="182">Every 6 months</option>
            <option value="365">Yearly</option>
            <option value="off">Turn check-ins off</option>
          </select>
        </Field>
      </div>
      <Field label="Snooze until">
        <input type="date" className={inputClass} value={form.snoozeUntil ?? ""} onChange={(e) => set("snoozeUntil", e.target.value)} />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="How you met">
          <input className={inputClass} value={form.howMet ?? ""} onChange={(e) => set("howMet", e.target.value)} />
        </Field>
        <Field label="Where">
          <input className={inputClass} value={form.whereMet ?? ""} onChange={(e) => set("whereMet", e.target.value)} />
        </Field>
        <Field label="When">
          <input type="date" className={inputClass} value={form.whenMet ?? ""} onChange={(e) => set("whenMet", e.target.value)} />
        </Field>
      </div>
      <Field label="Notes">
        <textarea className={inputClass} rows={3} value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
      </Field>
      <Field label="Tags">
        <input
          className={inputClass}
          value={tagText}
          onChange={(e) => setTagText(e.target.value)}
          placeholder="family, university, cycling"
        />
      </Field>
      <Field label="Photo">
        <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
      </Field>
      {error ? <p className="text-sm text-overdue">{error}</p> : null}
      <div className="mt-2 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
