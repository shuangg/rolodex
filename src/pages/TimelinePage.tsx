import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { INTERACTION_LABELS } from "@shared/types";
import type { TimelineKind } from "@shared/types";
import { fetchPeople, fetchTimeline } from "../api";
import { prettyDate } from "../lib/format";
import { Avatar } from "../components/Avatar";
import { inputClass } from "../components/ui";

export function TimelinePage() {
  const [personId, setPersonId] = useState("");
  const [type, setType] = useState<TimelineKind | "">("");
  const people = useQuery({ queryKey: ["people"], queryFn: () => fetchPeople() });
  const timeline = useQuery({
    queryKey: ["timeline", personId, type],
    queryFn: () => fetchTimeline({ personId, type }),
  });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-serif text-4xl">Timeline</h1>
      <p className="mt-1 mb-6 text-muted">Everything that has happened, newest first.</p>
      <div className="mb-6 flex gap-3">
        <select className={`${inputClass} max-w-xs`} value={personId} onChange={(e) => setPersonId(e.target.value)} aria-label="Filter by person">
          <option value="">Everyone</option>
          {(people.data ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select className={`${inputClass} max-w-xs`} value={type} onChange={(e) => setType(e.target.value as TimelineKind | "")} aria-label="Filter by type">
          <option value="">All types</option>
          <option value="interaction">Interactions</option>
          <option value="news">News</option>
          <option value="reminder">Reminders</option>
        </select>
      </div>
      <ol className="flex flex-col gap-4">
        {(timeline.data ?? []).map((item) => (
          <li key={item.id} className="flex gap-3 rounded-2xl bg-card p-4 ring-1 ring-line">
            <Avatar person={{ id: item.personId, name: item.personName, hasPhoto: item.hasPhoto }} size={40} />
            <div>
              <Link to={`/people/${item.personId}`} className="font-semibold hover:underline">
                {item.personName}
              </Link>
              <span className="text-muted">
                {" "}
                · {item.kind === "interaction" ? INTERACTION_LABELS[item.title as keyof typeof INTERACTION_LABELS] || item.title : item.title} ·{" "}
                {prettyDate(item.date)}
              </span>
              {item.detail ? <p className="mt-1 text-sm text-muted">{item.detail}</p> : null}
            </div>
          </li>
        ))}
      </ol>
      {timeline.data?.length === 0 ? <p className="text-muted">Nothing matches those filters.</p> : null}
    </div>
  );
}
