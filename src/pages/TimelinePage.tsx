import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, MessageSquare, Newspaper, NotebookPen, Gift as GiftIcon, Link2, UserPlus, Star } from "lucide-react";
import { api } from "../api";
import { formatDate, relativeDate } from "../lib/format";
import type { PersonWithMeta, TimelineEntry, TimelineEntryType } from "../types";

const TYPE_OPTIONS: { value: TimelineEntryType; label: string }[] = [
  { value: "interaction", label: "Interactions" },
  { value: "news", label: "News" },
  { value: "reminder_done", label: "Completed reminders" },
  { value: "gift", label: "Gifts" },
  { value: "connection", label: "Connections" },
  { value: "important_date", label: "Important dates" },
  { value: "fact", label: "Facts" },
  { value: "person_added", label: "People added" },
];

function typeIcon(type: TimelineEntryType) {
  switch (type) {
    case "interaction":
      return <MessageSquare size={15} color="#209dd7" />;
    case "news":
      return <Newspaper size={15} color="#753991" />;
    case "reminder_done":
      return <CalendarCheck size={15} color="#2e9e6b" />;
    case "fact":
      return <NotebookPen size={15} color="#e07b39" />;
    case "gift":
      return <GiftIcon size={15} color="#c0392b" />;
    case "connection":
      return <Link2 size={15} color="#16697a" />;
    case "important_date":
      return <Star size={15} color="#ecad0a" />;
    case "person_added":
      return <UserPlus size={15} color="#6a3093" />;
  }
}

function entryTitle(t: TimelineEntry): string {
  switch (t.type) {
    case "interaction":
      return `Logged ${t.description.toLowerCase()}`;
    case "news":
      return "Recorded news";
    case "reminder_done":
      return "Completed a reminder";
    case "fact":
      return "Added a fact";
    case "gift":
      return "Added a gift";
    case "connection":
      return "Added a connection";
    case "important_date":
      return "Added an important date";
    case "person_added":
      return "Added a person";
  }
}

export function TimelinePage() {
  const [people, setPeople] = useState<PersonWithMeta[]>([]);
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [personFilter, setPersonFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  useEffect(() => {
    void api.listPeople().then(setPeople);
  }, []);

  useEffect(() => {
    void api
      .getTimeline({
        personId: personFilter ? Number(personFilter) : undefined,
        type: typeFilter || undefined,
      })
      .then(setEntries);
  }, [personFilter, typeFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, TimelineEntry[]>();
    for (const e of entries) {
      const key = e.date.slice(0, 10);
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
    return [...map.entries()];
  }, [entries]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Timeline</h1>
          <p className="page-subtitle">Everything that's happened, across everyone, newest first.</p>
        </div>
      </div>
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-body" style={{ display: "flex", gap: 12, flexWrap: "wrap", padding: 14 }}>
          <select className="select" style={{ width: 220 }} value={personFilter} onChange={(e) => setPersonFilter(e.target.value)} aria-label="Filter by person">
            <option value="">Everyone</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.firstName} {p.lastName}
              </option>
            ))}
          </select>
          <select className="select" style={{ width: 220 }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Filter by type">
            <option value="">All types</option>
            {TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {entries.length === 0 ? (
        <div className="card card-pad empty-state">
          <div className="empty-icon">·</div>
          Nothing here yet. Log an interaction or record some news to see it appear.
        </div>
      ) : (
        <div className="card card-pad">
          {grouped.map(([day, items]) => (
            <div key={day} style={{ marginBottom: 20 }}>
              <div className="section-title">{formatDate(day)}</div>
              <div className="timeline">
                {items.map((t) => (
                  <div key={t.id} className={`timeline-item t-${t.type}`}>
                    <div className="timeline-date">{relativeDate(t.date)}</div>
                    <div className="row" style={{ gap: 8, margin: "3px 0" }}>
                      {typeIcon(t.type)}
                      <span className="timeline-title">
                        {entryTitle(t)}
                        <span className="muted" style={{ fontWeight: 400 }}>
                          {" "}
                          · {t.person.firstName} {t.person.lastName}
                        </span>
                      </span>
                    </div>
                    {t.details ? <div className="timeline-desc">{t.details}</div> : null}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
