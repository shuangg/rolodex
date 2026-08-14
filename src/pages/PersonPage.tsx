import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Cake,
  Gift,
  Mail,
  MessageSquare,
  Pencil,
  Phone,
  Trash2,
  Users,
} from "lucide-react";
import { CIRCLE_LABELS, DATE_TYPE_LABELS, GIFT_STATUS_LABELS, INTERACTION_LABELS, INTERACTION_TYPES } from "@shared/types";
import type { ConnectionType, DateType, GiftStatus, InteractionType } from "@shared/types";
import { upcomingWithin, ageThisYear, isMilestoneAge, nextOccurrence } from "@shared/dates";
import { cadenceLabel } from "@shared/checkin";
import { format } from "date-fns";
import {
  createConnection,
  createFact,
  createGift,
  createImportantDate,
  createInteraction,
  createNews,
  createReminder,
  deleteConnection,
  deleteFact,
  deleteGift,
  deleteImportantDate,
  deletePerson,
  deleteReminder,
  fetchPeople,
  fetchPerson,
  updateGift,
  updatePerson,
  updateReminder,
  uploadPhoto,
} from "../api";
import type { PersonInput } from "@shared/types";
import { ago, localTime, prettyDate, statusCopy, todayIso } from "../lib/format";
import { Avatar } from "../components/Avatar";
import { PersonForm } from "../components/PersonForm";
import { Button, EmptyState, Field, Modal, SectionTitle, StatusBadge, inputClass } from "../components/ui";

const typeIcons: Record<InteractionType, typeof Phone> = {
  call: Phone,
  message: MessageSquare,
  email: Mail,
  meetup: Users,
  other: MessageSquare,
};

export function PersonPage() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const detail = useQuery({ queryKey: ["person", id], queryFn: () => fetchPerson(id) });
  const people = useQuery({ queryKey: ["people"], queryFn: () => fetchPeople() });
  const [modal, setModal] = useState<
    | "edit"
    | "interaction"
    | "news"
    | "fact"
    | "gift"
    | "reminder"
    | "date"
    | "connection"
    | "delete"
    | null
  >(null);

  const refresh = () => qc.invalidateQueries();

  const savePerson = useMutation({
    mutationFn: async ({ input, photo }: { input: PersonInput; photo?: File | null }) => {
      await updatePerson(id, input);
      if (photo) await uploadPhoto(id, photo);
    },
    onSuccess: () => {
      refresh();
      setModal(null);
    },
  });

  if (detail.isLoading) return <p className="text-muted">Loading…</p>;
  if (!detail.data) return <p>That person is not in your Rolodex.</p>;

  const { person, interactions, facts, news, importantDates, reminders, gifts, connections } = detail.data;
  const soon = importantDates.some((d) => upcomingWithin(d.month, d.day, 30));
  const ideas = gifts.filter((g) => g.status === "idea");

  return (
    <div className="mx-auto max-w-5xl">
      <Link to="/people" className="text-sm font-semibold text-muted hover:text-ink">
        ← People
      </Link>

      <header className="mt-4 flex flex-wrap items-start gap-6">
        <Avatar person={person} size={112} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-serif text-4xl">{person.name}</h1>
              <p className="mt-1 text-muted">
                {[person.jobTitle, person.company].filter(Boolean).join(" · ")}
                {person.city ? ` · ${person.city}` : ""}
              </p>
              {person.timezone ? (
                <p className="text-sm text-muted">
                  It is {localTime(person.timezone)} in {person.city || person.timezone.replace(/_/g, " ")}
                </p>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setModal("edit")}>
                <Pencil size={16} /> Edit
              </Button>
              <Button variant="danger" onClick={() => setModal("delete")}>
                <Trash2 size={16} /> Delete
              </Button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-paper px-3 py-1 text-sm font-semibold">{CIRCLE_LABELS[person.circle]}</span>
            <StatusBadge status={person.checkInStatus} />
            {person.checkInStatus && person.checkInStatus !== "in_touch" ? (
              <span className="text-sm text-muted">{statusCopy(person.daysUntilDue, person.checkInStatus)}</span>
            ) : null}
            <span className="text-sm text-muted">
              Last contacted {person.lastContacted ? ago(person.lastContacted) : "never"}
            </span>
            <span className="text-sm text-muted">
              {cadenceLabel(person.circle, person.cadenceOverrideDays, person.checkinsEnabled)}
            </span>
          </div>
          {person.tags.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {person.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-paper px-2 py-0.5 text-xs font-semibold text-purple">
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </header>

      {soon && ideas.length > 0 ? (
        <div className="mt-6 rounded-2xl bg-due-bg px-5 py-4">
          <div className="flex items-center gap-2 font-semibold text-due">
            <Gift size={18} /> Gift ideas for an upcoming date
          </div>
          <ul className="mt-2 list-disc pl-6 text-sm">
            {ideas.map((g) => (
              <li key={g.id}>
                {g.description}
                {g.occasion ? ` · ${g.occasion}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {news[0] ? (
        <div className="mt-6 rounded-2xl bg-card px-5 py-4 ring-1 ring-line">
          <SectionTitle>Latest news</SectionTitle>
          <p className="font-serif text-xl">{news[0].content}</p>
          <p className="mt-1 text-sm text-muted">{prettyDate(news[0].date)}</p>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        <Button onClick={() => setModal("interaction")}>Log interaction</Button>
        <Button variant="secondary" onClick={() => setModal("news")}>
          Add news
        </Button>
        <Button variant="secondary" onClick={() => setModal("fact")}>
          Add fact
        </Button>
        <Button variant="secondary" onClick={() => setModal("date")}>
          Add date
        </Button>
        <Button variant="secondary" onClick={() => setModal("gift")}>
          Add gift
        </Button>
        <Button variant="secondary" onClick={() => setModal("reminder")}>
          Set reminder
        </Button>
        <Button variant="secondary" onClick={() => setModal("connection")}>
          Add connection
        </Button>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl bg-card p-5 ring-1 ring-line">
          <SectionTitle>Details</SectionTitle>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted">Email</dt>
            <dd>{person.email || "—"}</dd>
            <dt className="text-muted">Phone</dt>
            <dd>{person.phone || "—"}</dd>
            <dt className="text-muted">How you met</dt>
            <dd>{[person.howMet, person.whereMet, person.whenMet].filter(Boolean).join(" · ") || "—"}</dd>
            {person.snoozeUntil ? (
              <>
                <dt className="text-muted">Snoozed until</dt>
                <dd>{prettyDate(person.snoozeUntil)}</dd>
              </>
            ) : null}
          </dl>
          {person.notes ? <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">{person.notes}</p> : null}
        </section>

        <section className="rounded-2xl bg-card p-5 ring-1 ring-line">
          <SectionTitle>Facts worth remembering</SectionTitle>
          {facts.length === 0 ? (
            <EmptyState>No facts yet — the small durable things belong here, not in notes.</EmptyState>
          ) : (
            <ul className="flex flex-col gap-2">
              {facts.map((fact) => (
                <li key={fact.id} className="flex items-start justify-between gap-3 rounded-lg bg-paper px-3 py-2 text-sm">
                  <span>{fact.content}</span>
                  <button
                    type="button"
                    className="text-muted hover:text-overdue"
                    aria-label="Delete fact"
                    onClick={() => deleteFact(fact.id).then(refresh)}
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl bg-card p-5 ring-1 ring-line">
          <SectionTitle>Important dates</SectionTitle>
          {importantDates.length === 0 ? (
            <EmptyState>No birthdays or dates recorded yet.</EmptyState>
          ) : (
            <ul className="flex flex-col gap-3">
              {importantDates.map((d) => {
                const next = nextOccurrence(d.month, d.day);
                const age = d.year != null && (d.type === "birthday" || d.type === "child_birthday") ? ageThisYear(d.year) : null;
                const milestone = age != null && d.type === "birthday" && isMilestoneAge(age);
                return (
                  <li key={d.id} className="flex items-start justify-between gap-3 text-sm">
                    <div>
                      <div className="flex items-center gap-2 font-semibold">
                        <Cake size={16} />
                        {d.label || DATE_TYPE_LABELS[d.type]}
                      </div>
                      <div className="text-muted">
                        {format(next, "d MMMM")}
                        {d.year ? ` · ${d.year}` : " · year unknown"}
                        {age != null ? ` · turns ${age} this year` : ""}
                        {milestone ? " · milestone" : ""}
                      </div>
                    </div>
                    <button type="button" className="text-muted hover:text-overdue" onClick={() => deleteImportantDate(d.id).then(refresh)}>
                      <Trash2 size={14} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-2xl bg-card p-5 ring-1 ring-line">
          <SectionTitle>Gifts</SectionTitle>
          {gifts.length === 0 ? (
            <EmptyState>No gifts or ideas yet.</EmptyState>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {gifts.map((g) => (
                <li key={g.id} className="flex items-center justify-between gap-3">
                  <span>
                    <span className="font-semibold">{GIFT_STATUS_LABELS[g.status]}</span> · {g.description}
                    {g.occasion ? ` · ${g.occasion}` : ""}
                  </span>
                  <span className="flex gap-2">
                    {g.status === "idea" ? (
                      <button type="button" className="text-blue" onClick={() => updateGift(g.id, { status: "given", date: todayIso() }).then(refresh)}>
                        Mark given
                      </button>
                    ) : null}
                    <button type="button" className="text-muted hover:text-overdue" onClick={() => deleteGift(g.id).then(refresh)}>
                      <Trash2 size={14} />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl bg-card p-5 ring-1 ring-line">
          <SectionTitle>Connections</SectionTitle>
          {connections.length === 0 ? (
            <EmptyState>No links to other people yet.</EmptyState>
          ) : (
            <ul className="flex flex-col gap-2">
              {connections.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3">
                  <Link to={`/people/${c.personId}`} className="flex items-center gap-3 hover:underline">
                    <Avatar person={{ id: c.personId, name: c.personName, hasPhoto: c.hasPhoto }} size={32} />
                    <span>
                      <span className="font-semibold">{c.personName}</span>
                      <span className="text-sm text-muted"> · {c.displayType}{c.label ? ` · ${c.label}` : ""}</span>
                    </span>
                  </Link>
                  <button type="button" className="text-muted hover:text-overdue" onClick={() => deleteConnection(c.id).then(refresh)}>
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl bg-card p-5 ring-1 ring-line">
          <SectionTitle>Reminders</SectionTitle>
          {reminders.length === 0 ? (
            <EmptyState>No reminders for this person.</EmptyState>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {reminders.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={r.done} onChange={() => updateReminder(r.id, { done: !r.done }).then(refresh)} />
                    <span className={r.done ? "text-muted line-through" : ""}>
                      {r.content} · {prettyDate(r.dueDate)}
                    </span>
                  </label>
                  <button type="button" className="text-muted hover:text-overdue" onClick={() => deleteReminder(r.id).then(refresh)}>
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-2xl bg-card p-5 ring-1 ring-line">
        <SectionTitle>Timeline</SectionTitle>
        {interactions.length === 0 && news.length === 0 ? (
          <EmptyState>Nothing logged yet.</EmptyState>
        ) : (
          <ol className="flex flex-col gap-4">
            {[
              ...interactions.map((i) => ({
                id: i.id,
                date: i.date,
                title: INTERACTION_LABELS[i.type],
                detail: i.notes,
                kind: "interaction" as const,
                type: i.type,
              })),
              ...news.map((n) => ({
                id: n.id,
                date: n.date,
                title: "News",
                detail: n.content,
                kind: "news" as const,
                type: "other" as InteractionType,
              })),
            ]
              .sort((a, b) => (a.date < b.date ? 1 : -1))
              .map((item) => {
                const Icon = typeIcons[item.type];
                return (
                  <li key={`${item.kind}-${item.id}`} className="flex gap-3">
                    <Icon size={18} className="mt-1 text-blue" />
                    <div>
                      <div className="font-semibold">
                        {item.title} <span className="font-normal text-muted">· {prettyDate(item.date)}</span>
                      </div>
                      {item.detail ? <p className="text-sm text-muted">{item.detail}</p> : null}
                    </div>
                  </li>
                );
              })}
          </ol>
        )}
      </section>

      {modal === "edit" ? (
        <Modal title="Edit person" onClose={() => setModal(null)}>
          <PersonForm
            person={person}
            onCancel={() => setModal(null)}
            onSave={async (input, photo) => {
              await savePerson.mutateAsync({ input, photo });
            }}
          />
        </Modal>
      ) : null}

      {modal === "interaction" ? (
        <FormModal title="Log interaction" onClose={() => setModal(null)}>
          {(close) => (
            <SimpleForm
              fields={[
                {
                  name: "type",
                  label: "Type",
                  type: "select",
                  options: INTERACTION_TYPES.map((t) => ({ value: t, label: INTERACTION_LABELS[t] })),
                },
                { name: "date", label: "Date", type: "date", defaultValue: todayIso() },
                { name: "notes", label: "Notes", type: "textarea" },
              ]}
              onSubmit={async (values) => {
                await createInteraction({
                  personId: id,
                  type: values.type as InteractionType,
                  date: values.date,
                  notes: values.notes,
                });
                refresh();
                close();
              }}
            />
          )}
        </FormModal>
      ) : null}

      {modal === "news" ? (
        <FormModal title="Add news" onClose={() => setModal(null)}>
          {(close) => (
            <SimpleForm
              fields={[
                { name: "content", label: "What happened", type: "textarea" },
                { name: "date", label: "Date", type: "date", defaultValue: todayIso() },
              ]}
              onSubmit={async (values) => {
                await createNews({ personId: id, content: values.content, date: values.date });
                refresh();
                close();
              }}
            />
          )}
        </FormModal>
      ) : null}

      {modal === "fact" ? (
        <FormModal title="Add fact" onClose={() => setModal(null)}>
          {(close) => (
            <SimpleForm
              fields={[{ name: "content", label: "Fact", type: "text" }]}
              onSubmit={async (values) => {
                await createFact({ personId: id, content: values.content });
                refresh();
                close();
              }}
            />
          )}
        </FormModal>
      ) : null}

      {modal === "date" ? (
        <FormModal title="Add important date" onClose={() => setModal(null)}>
          {(close) => (
            <SimpleForm
              fields={[
                {
                  name: "type",
                  label: "Type",
                  type: "select",
                  options: Object.entries(DATE_TYPE_LABELS).map(([value, label]) => ({ value, label })),
                },
                { name: "label", label: "Label (optional)", type: "text" },
                { name: "month", label: "Month (1-12)", type: "text", defaultValue: "1" },
                { name: "day", label: "Day", type: "text", defaultValue: "1" },
                { name: "year", label: "Year (optional)", type: "text" },
              ]}
              onSubmit={async (values) => {
                await createImportantDate({
                  personId: id,
                  type: values.type as DateType,
                  label: values.label,
                  month: Number(values.month),
                  day: Number(values.day),
                  year: values.year ? Number(values.year) : null,
                });
                refresh();
                close();
              }}
            />
          )}
        </FormModal>
      ) : null}

      {modal === "gift" ? (
        <FormModal title="Add gift" onClose={() => setModal(null)}>
          {(close) => (
            <SimpleForm
              fields={[
                { name: "description", label: "What", type: "text" },
                {
                  name: "status",
                  label: "Status",
                  type: "select",
                  options: Object.entries(GIFT_STATUS_LABELS).map(([value, label]) => ({ value, label })),
                },
                { name: "occasion", label: "Occasion", type: "text" },
                { name: "date", label: "Date", type: "date" },
              ]}
              onSubmit={async (values) => {
                await createGift({
                  personId: id,
                  description: values.description,
                  status: values.status as GiftStatus,
                  occasion: values.occasion,
                  date: values.date,
                });
                refresh();
                close();
              }}
            />
          )}
        </FormModal>
      ) : null}

      {modal === "reminder" ? (
        <FormModal title="Set reminder" onClose={() => setModal(null)}>
          {(close) => (
            <SimpleForm
              fields={[
                { name: "content", label: "Remind me to", type: "text" },
                { name: "dueDate", label: "Due", type: "date", defaultValue: todayIso() },
              ]}
              onSubmit={async (values) => {
                await createReminder({ personId: id, content: values.content, dueDate: values.dueDate });
                refresh();
                close();
              }}
            />
          )}
        </FormModal>
      ) : null}

      {modal === "connection" ? (
        <FormModal title="Add connection" onClose={() => setModal(null)}>
          {(close) => (
            <SimpleForm
              fields={[
                {
                  name: "toPersonId",
                  label: "Person",
                  type: "select",
                  options: (people.data ?? [])
                    .filter((p) => p.id !== id)
                    .map((p) => ({ value: p.id, label: p.name })),
                },
                {
                  name: "type",
                  label: "They are my… / I…",
                  type: "select",
                  options: [
                    { value: "partner", label: "Partner" },
                    { value: "parent", label: "Parent" },
                    { value: "child", label: "Child" },
                    { value: "sibling", label: "Sibling" },
                    { value: "colleague", label: "Colleague" },
                    { value: "introduced", label: "Introduced me to" },
                  ],
                },
                { name: "label", label: "Note (optional)", type: "text" },
              ]}
              onSubmit={async (values) => {
                await createConnection({
                  fromPersonId: id,
                  toPersonId: values.toPersonId,
                  type: values.type as ConnectionType,
                  label: values.label,
                });
                refresh();
                close();
              }}
            />
          )}
        </FormModal>
      ) : null}

      {modal === "delete" ? (
        <Modal title="Delete person" onClose={() => setModal(null)}>
          <p className="mb-4 text-sm">Remove {person.name}? This cannot be undone.</p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                await deletePerson(id);
                qc.invalidateQueries();
                navigate("/people");
              }}
            >
              Delete
            </Button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function FormModal({ title, onClose, children }: { title: string; onClose: () => void; children: (close: () => void) => ReactNode }) {
  return (
    <Modal title={title} onClose={onClose}>
      {children(onClose)}
    </Modal>
  );
}

function SimpleForm({
  fields,
  onSubmit,
}: {
  fields: { name: string; label: string; type: "text" | "date" | "textarea" | "select"; options?: { value: string; label: string }[]; defaultValue?: string }[];
  onSubmit: (values: Record<string, string>) => Promise<void>;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.name, f.defaultValue ?? f.options?.[0]?.value ?? ""])),
  );
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="grid gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        await onSubmit(values);
      }}
    >
      {fields.map((field) => (
        <Field key={field.name} label={field.label}>
          {field.type === "textarea" ? (
            <textarea className={inputClass} rows={3} value={values[field.name]} onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))} />
          ) : field.type === "select" ? (
            <select className={inputClass} value={values[field.name]} onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}>
              {field.options?.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={field.type}
              className={inputClass}
              value={values[field.name]}
              onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
            />
          )}
        </Field>
      ))}
      <div className="flex justify-end">
        <Button type="submit" disabled={busy}>
          Save
        </Button>
      </div>
    </form>
  );
}
