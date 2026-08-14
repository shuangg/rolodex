import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Mail, MessageSquare, Phone, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CIRCLE_LABELS } from "@shared/types";
import type { InteractionType } from "@shared/types";
import { EMPTY_STATES } from "@shared/copy";
import { createInteraction, fetchToday, updateReminder } from "../api";
import { ago, prettyDate, statusCopy, todayIso } from "../lib/format";
import { Avatar } from "../components/Avatar";
import { Button, EmptyState, SectionTitle, StatusBadge } from "../components/ui";
import { Link } from "react-router-dom";

const quickTypes: { type: InteractionType; label: string; icon: typeof Phone }[] = [
  { type: "call", label: "Called", icon: Phone },
  { type: "message", label: "Messaged", icon: MessageSquare },
  { type: "email", label: "Emailed", icon: Mail },
  { type: "meetup", label: "Met", icon: Users },
];

export function TodayPage() {
  const qc = useQueryClient();
  const today = useQuery({ queryKey: ["today"], queryFn: fetchToday });
  const log = useMutation({
    mutationFn: (input: { personId: string; type: InteractionType }) =>
      createInteraction({ personId: input.personId, type: input.type, date: todayIso() }),
    onSuccess: () => qc.invalidateQueries(),
  });
  const toggle = useMutation({
    mutationFn: (input: { id: string; done: boolean }) => updateReminder(input.id, { done: input.done }),
    onSuccess: () => qc.invalidateQueries(),
  });

  if (!today.data) return <p className="text-muted">Loading…</p>;
  const { contact, dates, reminders, activity, charts } = today.data;
  const [hero, ...rest] = contact;
  const weekday = format(new Date(), "EEEE d MMMM");

  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-sm font-semibold tracking-wide text-muted uppercase">{weekday}</p>
      <h1 className="mt-1 font-serif text-4xl">
        {contact.length === 0
          ? "You are all caught up."
          : contact.length === 1
            ? "One person needs you today."
            : `${contact.length} people need you today.`}
      </h1>

      <section className="mt-8">
        <SectionTitle>Who to contact</SectionTitle>
        {hero ? (
          <div className="rounded-3xl bg-card p-6 ring-1 ring-line">
            <div className="flex flex-wrap items-center gap-6">
              <Avatar person={hero} size={96} />
              <div className="min-w-0 flex-1">
                <Link to={`/people/${hero.id}`} className="font-serif text-3xl hover:underline">
                  {hero.name}
                </Link>
                <p className="text-muted">{[hero.jobTitle, hero.company].filter(Boolean).join(" · ")}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusBadge status={hero.checkInStatus} />
                  <span className="text-lg font-semibold text-overdue">
                    {statusCopy(hero.daysUntilDue, hero.checkInStatus)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted">
                  Last contacted {hero.lastContacted ? ago(hero.lastContacted) : "never"}
                  {hero.latestNews ? ` · ${hero.latestNews}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {quickTypes.map((q) => (
                  <Button key={q.type} variant="secondary" onClick={() => log.mutate({ personId: hero.id, type: q.type })}>
                    <q.icon size={16} /> {q.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl bg-card p-8 ring-1 ring-line">
            <EmptyState>{EMPTY_STATES.contact}</EmptyState>
          </div>
        )}

        {rest.length > 0 ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {rest.map((person) => (
              <div key={person.id} className="flex items-center gap-3 rounded-2xl bg-card p-4 ring-1 ring-line">
                <Avatar person={person} size={52} />
                <div className="min-w-0 flex-1">
                  <Link to={`/people/${person.id}`} className="font-semibold hover:underline">
                    {person.name}
                  </Link>
                  <div className="text-xs text-muted">{statusCopy(person.daysUntilDue, person.checkInStatus)}</div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {quickTypes.slice(0, 3).map((q) => (
                      <button
                        key={q.type}
                        type="button"
                        className="rounded-md bg-paper px-2 py-1 text-xs font-semibold hover:bg-line"
                        onClick={() => log.mutate({ personId: person.id, type: q.type })}
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl bg-card p-5 ring-1 ring-line">
          <SectionTitle>Coming up</SectionTitle>
          {dates.length === 0 ? (
            <EmptyState>{EMPTY_STATES.dates}</EmptyState>
          ) : (
            <ul className="flex flex-col gap-3">
              {dates.map((d) => (
                <li key={d.id}>
                  <Link to={`/people/${d.personId}`} className="flex items-center gap-3">
                    <Avatar person={{ id: d.personId, name: d.personName, hasPhoto: d.hasPhoto }} size={36} />
                    <div>
                      <div className="font-semibold">{d.personName}</div>
                      <div className="text-sm text-muted">
                        {d.label || d.type} · {prettyDate(d.next)}
                        {d.days === 0 ? " · today" : d.days === 1 ? " · tomorrow" : ` · in ${d.days} days`}
                        {d.age != null ? ` · turns ${d.age}` : ""}
                        {d.milestone ? " · milestone" : ""}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl bg-card p-5 ring-1 ring-line">
          <SectionTitle>Reminders</SectionTitle>
          {reminders.length === 0 ? (
            <EmptyState>{EMPTY_STATES.reminders}</EmptyState>
          ) : (
            <ul className="flex flex-col gap-3">
              {reminders.map((r) => (
                <li key={r.id} className="flex items-start gap-3">
                  <input type="checkbox" className="mt-1" checked={r.done} onChange={() => toggle.mutate({ id: r.id, done: true })} />
                  <Link to={`/people/${r.personId}`} className="min-w-0">
                    <div className="font-semibold">{r.content}</div>
                    <div className="text-sm text-muted">
                      {r.personName} · {prettyDate(r.dueDate)}
                      {r.dueDate < todayIso() ? " · overdue" : " · due"}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl bg-card p-5 ring-1 ring-line">
          <SectionTitle>Recent activity</SectionTitle>
          {activity.length === 0 ? (
            <EmptyState>{EMPTY_STATES.activity}</EmptyState>
          ) : (
            <ul className="flex flex-col gap-3">
              {activity.map((item) => (
                <li key={item.id}>
                  <Link to={`/people/${item.personId}`} className="flex items-start gap-3">
                    <Avatar person={{ id: item.personId, name: item.personName, hasPhoto: item.hasPhoto }} size={32} />
                    <div className="min-w-0">
                      <div className="truncate text-sm">
                        <span className="font-semibold">{item.personName}</span> · {item.title}
                      </div>
                      <div className="truncate text-xs text-muted">
                        {prettyDate(item.date)}
                        {item.detail ? ` · ${item.detail}` : ""}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl bg-card p-5 ring-1 ring-line">
          <SectionTitle>Interactions this year</SectionTitle>
          {charts.interactionsByMonth.every((m) => m.count === 0) ? (
            <EmptyState>{EMPTY_STATES.charts}</EmptyState>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.interactionsByMonth}>
                  <CartesianGrid vertical={false} stroke="#e4dfd6" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#209dd7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
        <section className="rounded-2xl bg-card p-5 ring-1 ring-line">
          <SectionTitle>People by circle</SectionTitle>
          {charts.peopleByCircle.every((c) => c.total === 0) ? (
            <EmptyState>{EMPTY_STATES.charts}</EmptyState>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={charts.peopleByCircle.map((c) => ({
                    name: CIRCLE_LABELS[c.circle],
                    inTouch: c.total - c.overdue,
                    overdue: c.overdue,
                  }))}
                >
                  <CartesianGrid vertical={false} stroke="#e4dfd6" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
                  <Tooltip />
                  <Bar dataKey="inTouch" stackId="a" fill="#209dd7" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="overdue" stackId="a" fill="#ecad0a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
