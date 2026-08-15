import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Cake,
  Gift as GiftIcon,
  Link2,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
} from "lucide-react";
import { api } from "../api";
import { Avatar } from "../components/Avatar";
import { StatusBadge } from "../components/StatusBadge";
import { Modal } from "../components/Modal";
import { PersonFormModal } from "../components/PersonFormModal";
import { CIRCLE_LABELS, INTERACTION_LABELS, type InteractionType, type PersonWithMeta } from "../types";
import { formatDate, relativeDate } from "../lib/format";
import { upcomingDatesFor } from "../lib/recurring";
import type { ConnectionView, Fact, Gift, ImportantDate, Interaction, NewsItem, Reminder, TimelineEntry } from "../types";

interface PersonDetail extends PersonWithMeta {
  dates: ImportantDate[];
  interactions: Interaction[];
  facts: Fact[];
  news: NewsItem[];
  reminders: Reminder[];
  connections: ConnectionView[];
  gifts: Gift[];
  timeline: TimelineEntry[];
}

const INTERACTION_TYPES: InteractionType[] = ["call", "message", "email", "meetup", "other"];

export function PersonPage() {
  const { id } = useParams();
  const personId = Number(id);
  const navigate = useNavigate();
  const [data, setData] = useState<PersonDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);

  const [logType, setLogType] = useState<InteractionType>("call");
  const [logDate, setLogDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [logNotes, setLogNotes] = useState("");

  const [newFact, setNewFact] = useState("");
  const [newNews, setNewNews] = useState("");
  const [newReminder, setNewReminder] = useState({ title: "", dueOn: new Date().toISOString().slice(0, 10) });
  const [newDate, setNewDate] = useState({ kind: "birthday", label: "", month: new Date().getMonth() + 1, day: new Date().getDate(), year: "" });
  const [newGift, setNewGift] = useState({ text: "", status: "idea", occasion: "", date: "" });
  const [newConnection, setNewConnection] = useState({ person: "", label: "partner" });

  const [showAdd, setShowAdd] = useState<null | "connection" | "date" | "reminder" | "gift">(null);

  const load = async () => {
    try {
      setData(await api.getPerson(personId));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Person not found.");
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personId]);

  if (error) {
    return (
      <div className="card card-pad empty-state">
        <div className="empty-icon">!</div>
        {error}
        <div style={{ marginTop: 12 }}>
          <Link to="/people">Back to People</Link>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="card card-pad">Loading…</div>;
  }

  const upcoming = upcomingDatesFor(data.dates, new Date(), 30);

  const logInteraction = async () => {
    if (!logDate) return;
    setBusy(true);
    try {
      await api.createInteraction(personId, { type: logType, occurredOn: logDate, notes: logNotes || undefined });
      setLogNotes("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not log interaction.");
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    try {
      await api.deletePerson(personId);
      navigate("/people");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete.");
    }
  };

  const addDate = async () => {
    await api.createDate(personId, {
      kind: newDate.kind,
      label: newDate.label || undefined,
      month: newDate.month,
      day: newDate.day,
      year: newDate.year ? Number(newDate.year) : null,
    });
    setNewDate((d) => ({ ...d, label: "", year: "" }));
    setShowAdd(null);
    await load();
  };

  const addReminder = async () => {
    if (!newReminder.title) return;
    await api.createReminder(personId, newReminder.title, newReminder.dueOn);
    setNewReminder((r) => ({ ...r, title: "" }));
    setShowAdd(null);
    await load();
  };

  const addGift = async () => {
    if (!newGift.text) return;
    await api.createGift(personId, {
      text: newGift.text,
      status: newGift.status,
      occasion: newGift.occasion || undefined,
      date: newGift.date || undefined,
    });
    setNewGift({ text: "", status: "idea", occasion: "", date: "" });
    setShowAdd(null);
    await load();
  };

  const addConnection = async () => {
    const otherId = Number(newConnection.person);
    if (!otherId) return;
    await api.createConnection(personId, otherId, newConnection.label);
    setNewConnection((c) => ({ ...c, person: "" }));
    setShowAdd(null);
    await load();
  };

  const circleCadence = data.checkin.cadenceDays ? `${data.checkin.cadenceDays} days` : "off";

  return (
    <div>
      <div className="row-between" style={{ marginBottom: 18 }}>
        <Link to="/people" className="muted" style={{ fontSize: 13 }}>
          ← All people
        </Link>
        <div className="row">
          <button className="btn btn-sm" onClick={() => setEditing(true)}>
            <Pencil size={14} />
            Edit
          </button>
          <button className="btn btn-sm btn-danger" onClick={() => setDeleting(true)}>
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      </div>

      <div className="card card-pad" style={{ marginBottom: 18 }}>
        <div className="person-hero">
          <Avatar person={data} size="xl" />
          <div className="grow">
            <h1 className="person-name">
              {data.firstName} {data.lastName}
            </h1>
            <p className="person-role">
              {data.jobTitle ? `${data.jobTitle}` : ""}
              {data.company ? ` at ${data.company}` : ""}
              {data.city ? ` · ${data.city}` : ""}
            </p>
            <div className="row" style={{ flexWrap: "wrap" }}>
              <StatusBadge info={data.checkin} />
              <span className="chip chip-blue">{CIRCLE_LABELS[data.circle]}</span>
              {data.tags.map((t) => (
                <span key={t} className="chip">
                  #{t}
                </span>
              ))}
            </div>
          </div>
          <div className="text-right" style={{ fontSize: 13 }}>
            <div className="muted">Last contacted</div>
            <div style={{ fontWeight: 600 }}>{relativeDate(data.lastContacted)}</div>
            <div className="muted" style={{ marginTop: 8 }}>
              Check-in cadence
            </div>
            <div style={{ fontWeight: 600 }}>{circleCadence}</div>
          </div>
        </div>
      </div>

      <div className="stack">
        <div className="grid-2">
          <div className="card card-pad">
            <div className="section-title">Details</div>
            <dl className="dl">
              <dt>Email</dt>
              <dd>{data.email ?? "—"}</dd>
              <dt>Phone</dt>
              <dd>{data.phone ?? "—"}</dd>
              <dt>Company</dt>
              <dd>{data.company ?? "—"}</dd>
              <dt>Job title</dt>
              <dd>{data.jobTitle ?? "—"}</dd>
              <dt>City</dt>
              <dd>{data.city ?? "—"}</dd>
              <dt>Time zone</dt>
              <dd>{data.timeZone ?? "—"}</dd>
              <dt>How you met</dt>
              <dd>{data.howMet ?? "—"}</dd>
              <dt>Where</dt>
              <dd>{data.whereMet ?? "—"}</dd>
              <dt>When</dt>
              <dd>{data.whenMet ?? "—"}</dd>
            </dl>
          </div>

          <div className="card card-pad">
            <div className="row-between">
              <div className="section-title">Notes</div>
            </div>
            <p style={{ margin: 0, lineHeight: 1.55, color: "var(--ink-2)" }}>{data.notes ?? "No notes yet."}</p>
          </div>
        </div>

        <div className="card">
          <div className="card-header">Log an interaction</div>
          <div className="card-body">
            <div className="row" style={{ flexWrap: "wrap" }}>
              <div className="row" style={{ gap: 4 }}>
                {INTERACTION_TYPES.map((t) => (
                  <button
                    key={t}
                    className={`btn btn-sm${logType === t ? " btn-blue" : ""}`}
                    onClick={() => setLogType(t)}
                  >
                    {INTERACTION_LABELS[t]}
                  </button>
                ))}
              </div>
              <input className="input" style={{ width: 150 }} type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} />
              <input className="input grow" placeholder="What did you talk about? (optional)" value={logNotes} onChange={(e) => setLogNotes(e.target.value)} />
              <button className="btn btn-primary" onClick={logInteraction} disabled={busy || !logDate}>
                <Plus size={15} />
                Log it
              </button>
            </div>
          </div>
        </div>

        <div className="grid-2">
          <div className="card">
            <div className="card-header">
              Important dates
              <button className="btn btn-sm" onClick={() => setShowAdd("date")}>
                <Plus size={14} />
                Add
              </button>
            </div>
            <div className="card-body">
              {data.dates.length === 0 ? (
                <p className="hint">No dates yet. Birthdays, anniversaries, milestones — add them so they never slip past.</p>
              ) : (
                data.dates.map((d) => {
                  const occ = upcomingDatesFor([d], new Date(), 365)[0];
                  const milestone = occ?.milestone;
                  const nextYear = occ ? new Date(occ.occurrence).getFullYear() : null;
                  return (
                    <div className="list-item" key={d.id}>
                      <Cake size={15} color="#753991" />
                      <span className="grow">
                        <strong>{formatDate(`${nextYear}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`)}</strong>
                        {d.label ? ` — ${d.label}` : ""}
                        {d.year != null ? ` (born ${d.year})` : ""}
                        {milestone ? <span className="tag" style={{ background: "#f0e7f5", color: "#5c2c72", marginLeft: 8 }}>Milestone</span> : null}
                        {occ?.age != null ? <span className="muted"> · turns {occ.age}</span> : null}
                      </span>
                      <button className="btn btn-icon btn-ghost" title="Delete date" onClick={async () => { await api.deleteDate(d.id); await load(); }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              Facts worth remembering
              <button className="btn btn-sm" onClick={async () => { if (newFact.trim()) { await api.createFact(personId, newFact); setNewFact(""); await load(); } }}>
                <Plus size={14} />
                Add
              </button>
            </div>
            <div className="card-body">
              <input className="input" style={{ marginBottom: 10 }} placeholder="Allergic to shellfish…" value={newFact} onChange={(e) => setNewFact(e.target.value)} onKeyDown={async (e) => { if (e.key === "Enter" && newFact.trim()) { await api.createFact(personId, newFact); setNewFact(""); await load(); } }} />
              {data.facts.length === 0 ? (
                <p className="hint">The little things — allergies, partners, teams they support. Nothing to forget.</p>
              ) : (
                data.facts.map((f) => (
                  <div className="list-item" key={f.id}>
                    <span className="grow">{f.text}</span>
                    <button className="btn btn-icon btn-ghost" title="Remove fact" onClick={async () => { await api.deleteFact(f.id); await load(); }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="grid-2">
          <div className="card">
            <div className="card-header">
              News
              <button className="btn btn-sm" onClick={async () => { if (newNews.trim()) { await api.createNews(personId, newNews); setNewNews(""); await load(); } }}>
                <Plus size={14} />
                Add
              </button>
            </div>
            <div className="card-body">
              <input className="input" style={{ marginBottom: 10 }} placeholder="Started at Figma. Moved to Berlin…" value={newNews} onChange={(e) => setNewNews(e.target.value)} onKeyDown={async (e) => { if (e.key === "Enter" && newNews.trim()) { await api.createNews(personId, newNews); setNewNews(""); await load(); } }} />
              {data.news.length === 0 ? (
                <p className="hint">No news yet. Record big changes so you remember what's going on with them.</p>
              ) : (
                data.news.map((n) => (
                  <div className="list-item" key={n.id}>
                    <span className="grow">
                      {n.text}
                      <div className="muted">{relativeDate(n.createdAt)}</div>
                    </span>
                    <button className="btn btn-icon btn-ghost" title="Remove news" onClick={async () => { await api.deleteNews(n.id); await load(); }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              Reminders
              <button className="btn btn-sm" onClick={() => setShowAdd("reminder")}>
                <Plus size={14} />
                Add
              </button>
            </div>
            <div className="card-body">
              {data.reminders.length === 0 ? (
                <p className="hint">No reminders. Set one for something you need to do about {data.firstName}.</p>
              ) : (
                data.reminders.map((r) => (
                  <div className="list-item" key={r.id}>
                    <input type="checkbox" checked={r.done} onChange={async (e) => { await api.toggleReminder(r.id, e.target.checked); await load(); }} />
                    <span className="grow" style={{ textDecoration: r.done ? "line-through" : undefined, color: r.done ? "var(--ink-3)" : undefined }}>
                      {r.title}
                      <div className="muted">{formatDate(r.dueOn)}</div>
                    </span>
                    <button className="btn btn-icon btn-ghost" title="Delete reminder" onClick={async () => { await api.deleteReminder(r.id); await load(); }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="grid-2">
          <div className="card">
            <div className="card-header">
              <span className="row" style={{ gap: 8 }}>
                <GiftIcon size={15} />
                Gifts
              </span>
              <button className="btn btn-sm" onClick={() => setShowAdd("gift")}>
                <Plus size={14} />
                Add
              </button>
            </div>
            <div className="card-body">
              {upcoming.filter((u) => u.occurrence <= new Date(new Date().getTime() + 30 * 864e5).toISOString().slice(0, 10)).length > 0 ? (
                <p className="hint" style={{ marginBottom: 10 }}>
                  {data.firstName}'s next important date is <strong>{formatDate(upcoming[0]?.occurrence)}</strong> — good time to turn an idea into a gift.
                </p>
              ) : null}
              {data.gifts.length === 0 ? (
                <p className="hint">Gift ideas, things given and received — all here.</p>
              ) : (
                data.gifts.map((g) => (
                  <div className="list-item" key={g.id}>
                    <span className="grow">
                      {g.text}
                      {g.occasion ? <span className="muted"> · {g.occasion}</span> : null}
                      {g.date ? <span className="muted"> · {formatDate(g.date)}</span> : null}
                    </span>
                    <select
                      className="select"
                      style={{ width: 110 }}
                      value={g.status}
                      onChange={async (e) => { await api.updateGiftStatus(g.id, e.target.value); await load(); }}
                    >
                      <option value="idea">Idea</option>
                      <option value="given">Given</option>
                      <option value="received">Received</option>
                    </select>
                    <button className="btn btn-icon btn-ghost" title="Delete gift" onClick={async () => { await api.deleteGift(g.id); await load(); }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="row" style={{ gap: 8 }}>
                <Link2 size={15} />
                Connections
              </span>
              <button className="btn btn-sm" onClick={() => setShowAdd("connection")}>
                <UserPlus size={14} />
                Add
              </button>
            </div>
            <div className="card-body">
              {data.connections.length === 0 ? (
                <p className="hint">Who is {data.firstName} connected to? Partners, parents, colleagues — record them here.</p>
              ) : (
                data.connections.map((c) => (
                  <div className="list-item" key={c.id}>
                    <Avatar person={c.person} />
                    <span className="grow">
                      <Link to={`/people/${c.person.id}`} style={{ fontWeight: 600 }}>
                        {c.person.firstName} {c.person.lastName}
                      </Link>
                      <div className="muted">{c.label}</div>
                    </span>
                    <button className="btn btn-icon btn-ghost" title="Remove connection" onClick={async () => { await api.deleteConnection(c.id); await load(); }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">Timeline</div>
          <div className="card-body">
            {data.timeline.length === 0 ? (
              <p className="hint">Nothing logged yet.</p>
            ) : (
              <div className="timeline">
                {data.timeline.map((t) => (
                  <div key={t.id} className={`timeline-item t-${t.type}`}>
                    <div className="timeline-date">{relativeDate(t.date)}</div>
                    <div className="timeline-title">
                      {t.type === "interaction" ? `Logged ${t.description.toLowerCase()}` : t.type === "reminder_done" ? "Completed a reminder" : t.type === "news" ? "Recorded news" : t.type === "fact" ? "Added a fact" : "Logged"}
                    </div>
                    {t.details ? <div className="timeline-desc">{t.details}</div> : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showAdd === "date" ? (
        <Modal title="Add an important date" onClose={() => setShowAdd(null)} footer={
          <>
            <button className="btn" onClick={() => setShowAdd(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={addDate}>Add date</button>
          </>
        }>
          <div className="form-grid">
            <div className="field">
              <label className="label">Type</label>
              <select className="select" value={newDate.kind} onChange={(e) => setNewDate((d) => ({ ...d, kind: e.target.value }))}>
                <option value="birthday">Birthday</option>
                <option value="anniversary">Anniversary</option>
                <option value="work_anniversary">Work anniversary</option>
                <option value="child_birthday">Child's birthday</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="field">
              <label className="label">Label (optional)</label>
              <input className="input" placeholder="e.g. Dad's birthday" value={newDate.label} onChange={(e) => setNewDate((d) => ({ ...d, label: e.target.value }))} />
            </div>
            <div className="field">
              <label className="label">Month</label>
              <input className="input" type="number" min={1} max={12} value={newDate.month} onChange={(e) => setNewDate((d) => ({ ...d, month: Number(e.target.value) }))} />
            </div>
            <div className="field">
              <label className="label">Day</label>
              <input className="input" type="number" min={1} max={31} value={newDate.day} onChange={(e) => setNewDate((d) => ({ ...d, day: Number(e.target.value) }))} />
            </div>
            <div className="field full">
              <label className="label">Year (optional)</label>
              <input className="input" type="number" placeholder="e.g. 1985" value={newDate.year} onChange={(e) => setNewDate((d) => ({ ...d, year: e.target.value }))} />
              <span className="hint">Include a year to show ages and flag milestone birthdays.</span>
            </div>
          </div>
        </Modal>
      ) : null}

      {showAdd === "reminder" ? (
        <Modal title="Add a reminder" onClose={() => setShowAdd(null)} footer={
          <>
            <button className="btn" onClick={() => setShowAdd(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={addReminder}>Add reminder</button>
          </>
        }>
          <div className="stack">
            <div className="field">
              <label className="label">What needs doing?</label>
              <input className="input" placeholder="e.g. Send the article" value={newReminder.title} onChange={(e) => setNewReminder((r) => ({ ...r, title: e.target.value }))} />
            </div>
            <div className="field">
              <label className="label">Due date</label>
              <input className="input" type="date" value={newReminder.dueOn} onChange={(e) => setNewReminder((r) => ({ ...r, dueOn: e.target.value }))} />
            </div>
          </div>
        </Modal>
      ) : null}

      {showAdd === "gift" ? (
        <Modal title="Add a gift" onClose={() => setShowAdd(null)} footer={
          <>
            <button className="btn" onClick={() => setShowAdd(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={addGift}>Add gift</button>
          </>
        }>
          <div className="stack">
            <div className="field">
              <label className="label">Gift</label>
              <input className="input" placeholder="e.g. Vintage map of Tokyo" value={newGift.text} onChange={(e) => setNewGift((g) => ({ ...g, text: e.target.value }))} />
            </div>
            <div className="form-grid">
              <div className="field">
                <label className="label">Status</label>
                <select className="select" value={newGift.status} onChange={(e) => setNewGift((g) => ({ ...g, status: e.target.value }))}>
                  <option value="idea">Idea</option>
                  <option value="given">Given</option>
                  <option value="received">Received</option>
                </select>
              </div>
              <div className="field">
                <label className="label">Occasion</label>
                <input className="input" placeholder="Birthday, Christmas…" value={newGift.occasion} onChange={(e) => setNewGift((g) => ({ ...g, occasion: e.target.value }))} />
              </div>
            </div>
          </div>
        </Modal>
      ) : null}

      {showAdd === "connection" ? (
        <Modal title="Add a connection" onClose={() => setShowAdd(null)} footer={
          <>
            <button className="btn" onClick={() => setShowAdd(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={addConnection}>Add connection</button>
          </>
        }>
          <div className="stack">
            <div className="field">
              <label className="label">Who is {data.firstName} connected to?</label>
              <ConnectionPicker excludeId={personId} value={newConnection.person} onChange={(v) => setNewConnection((c) => ({ ...c, person: v }))} />
            </div>
            <div className="field">
              <label className="label">Relationship</label>
              <select className="select" value={newConnection.label} onChange={(e) => setNewConnection((c) => ({ ...c, label: e.target.value }))}>
                <option value="parent">Parent</option>
                <option value="child">Child</option>
                <option value="partner">Partner</option>
                <option value="sibling">Sibling</option>
                <option value="colleague">Colleague</option>
                <option value="introduced me to">Introduced me to</option>
              </select>
              <span className="hint">Recorded as “{newConnection.label} is {data.firstName}'s {newConnection.label}”. Shows from both sides.</span>
            </div>
          </div>
        </Modal>
      ) : null}

      {editing ? (
        <PersonFormModal person={data} onClose={() => setEditing(false)} onSaved={load} />
      ) : null}

      {deleting ? (
        <Modal title="Delete person" onClose={() => setDeleting(false)} footer={
          <>
            <button className="btn" onClick={() => setDeleting(false)}>Cancel</button>
            <button className="btn btn-danger" onClick={confirmDelete}>Delete</button>
          </>
        }>
          <p>
            Delete <strong>{data.firstName} {data.lastName}</strong>? Everything they have in your Rolodex goes too.
          </p>
        </Modal>
      ) : null}
    </div>
  );
}

function ConnectionPicker({ excludeId, value, onChange }: { excludeId: number; value: string; onChange: (v: string) => void }) {
  const [people, setPeople] = useState<PersonWithMeta[]>([]);
  useEffect(() => {
    void api.listPeople().then(setPeople);
  }, []);
  return (
    <select className="select" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Choose a person…</option>
      {people.filter((p) => p.id !== excludeId).map((p) => (
        <option key={p.id} value={p.id}>
          {p.firstName} {p.lastName}
        </option>
      ))}
    </select>
  );
}
