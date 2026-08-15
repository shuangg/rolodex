import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Cake, CalendarCheck, Inbox, TrendingUp } from "lucide-react";
import { api } from "../api";
import { Avatar } from "../components/Avatar";
import { StatusBadge } from "../components/StatusBadge";
import { CIRCLE_LABELS, INTERACTION_LABELS, type Circle, type InteractionType, type TodayData } from "../types";
import { formatDate, formatMonthYear, relativeDate } from "../lib/format";

const QUICK_TYPES: InteractionType[] = ["call", "message", "email", "meetup", "other"];

export function TodayPage() {
  const [data, setData] = useState<TodayData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setData(await api.getToday());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load Today.");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const quickLog = async (personId: number, type: InteractionType) => {
    try {
      await api.createInteraction(personId, {
        type,
        occurredOn: new Date().toISOString().slice(0, 10),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not log interaction.");
    }
  };

  if (!data) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">Today</h1>
            <p className="page-subtitle">What needs your attention.</p>
          </div>
        </div>
        <div className="card card-pad">{error ?? "Loading…"}</div>
      </div>
    );
  }

  const circleChart = data.circleOverdue.map((c) => ({
    name: CIRCLE_LABELS[c.circle as Circle],
    overdue: c.overdue,
    inTouch: Math.max(0, c.total - c.overdue),
  }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Today</h1>
          <p className="page-subtitle">The people who need you, the dates that matter, and what's been happening.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18, borderColor: "#e8d49a" }}>
        <div className="card-header" style={{ fontSize: 17 }}>
          <span className="row" style={{ gap: 10 }}>
            <Inbox size={18} color="#c98f06" />
            Who to contact
          </span>
          <span className="muted" style={{ fontWeight: 500 }}>
            {data.duePeople.length} {data.duePeople.length === 1 ? "person" : "people"} due
          </span>
        </div>
        <div className="card-body">
          {data.duePeople.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <TrendingUp size={28} />
              </div>
              You're all caught up. No one is due a check-in right now.
            </div>
          ) : (
            <div className="hero-list">
              {data.duePeople.map((p) => (
                <div key={p.id} className={`hero-item${p.checkin.status === "overdue" ? " overdue-item" : ""}`}>
                  <Avatar person={p} size="lg" />
                  <div className="hero-item-info">
                    <Link to={`/people/${p.id}`} style={{ fontWeight: 600, color: "var(--ink)" }}>
                      {p.firstName} {p.lastName}
                    </Link>
                    <div className="hero-item-sub">
                      {p.company ?? ""}
                      {p.lastContacted ? ` · last contacted ${relativeDate(p.lastContacted)}` : ""}
                      {p.checkin.dueDate ? ` · due ${formatDate(p.checkin.dueDate)}` : ""}
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <StatusBadge info={p.checkin} />
                    </div>
                  </div>
                  <div className="row" style={{ gap: 4, flexWrap: "wrap" }}>
                    {QUICK_TYPES.map((t) => (
                      <button key={t} className="btn btn-sm btn-blue" title={`Log ${INTERACTION_LABELS[t].toLowerCase()}`} onClick={() => void quickLog(p.id, t)}>
                        {INTERACTION_LABELS[t]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <span className="row" style={{ gap: 8 }}>
              <Cake size={16} color="#753991" />
              Upcoming dates
            </span>
            <span className="muted">next 30 days</span>
          </div>
          <div className="card-body">
            {data.upcomingDates.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">·</div>
                Nothing coming up in the next 30 days.
              </div>
            ) : (
              data.upcomingDates.map((u) => (
                <div className="list-item" key={`${u.id}-${u.occurrence}`}>
                  <div className="grow">
                    <Link to={`/people/${u.personId}`} style={{ fontWeight: 600, color: "var(--ink)" }}>
                      {u.personName ?? "Someone"}
                    </Link>
                    {u.milestone ? <span className="tag" style={{ background: "#f0e7f5", color: "#5c2c72", marginLeft: 8 }}>Milestone {u.age}</span> : null}
                    <div className="muted">
                      {u.kind === "birthday" ? "Birthday" : u.label ?? u.kind.replace("_", " ")}
                      {u.age != null ? ` · turning ${u.age}` : ""}
                    </div>
                  </div>
                  <span className="nowrap" style={{ fontWeight: 600 }}>
                    {formatDate(u.occurrence)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="row" style={{ gap: 8 }}>
              <CalendarCheck size={16} color="#2e9e6b" />
              Reminders
            </span>
            <span className="muted">due &amp; overdue</span>
          </div>
          <div className="card-body">
            {data.reminders.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">·</div>
                No reminders due. Nice and quiet.
              </div>
            ) : (
              data.reminders.map((r) => (
                <div className="list-item" key={r.id}>
                  <div className="grow">
                    <Link to={`/people/${r.person.id}`} style={{ fontWeight: 600, color: "var(--ink)" }}>
                      {r.person.firstName} {r.person.lastName}
                    </Link>
                    <div className="muted">{r.title}</div>
                  </div>
                  <span className="nowrap" style={{ fontWeight: 600, color: r.dueOn < new Date().toISOString().slice(0, 10) ? "var(--red)" : undefined }}>
                    {formatDate(r.dueOn)}
                  </span>
                  <button
                    className="btn btn-sm"
                    onClick={async () => {
                      await api.toggleReminder(r.id, true);
                      await load();
                    }}
                  >
                    Done
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="card-header">Recent activity</div>
          <div className="card-body" style={{ padding: "12px 20px" }}>
            {data.recentActivity.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">·</div>
                Nothing yet. Log an interaction and it'll show up here.
              </div>
            ) : (
              data.recentActivity.map((t) => (
                <div className="list-item" key={t.id}>
                  <Avatar person={t.person} />
                  <div className="grow">
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>
                      {t.person.firstName} {t.person.lastName}
                      <span className="muted" style={{ fontWeight: 400 }}>
                        {" "}
                        · {t.type === "interaction" ? `logged ${t.description.toLowerCase()}` : t.type === "reminder_done" ? "completed a reminder" : t.type === "news" ? "shared news" : "added something"}
                      </span>
                    </div>
                    {t.details ? <div className="muted" style={{ maxWidth: 420, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.details}</div> : null}
                  </div>
                  <span className="muted nowrap">{relativeDate(t.date)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">Staying in touch</div>
          <div className="card-body">
            <div className="section-title">Interactions per month</div>
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.interactionsPerMonth.map((m) => ({ name: formatMonthYear(Number(m.month.split("-")[0]), Number(m.month.split("-")[1])), count: m.count }))} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#8a93a3" }} interval={1} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#8a93a3" }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#209dd7" radius={[4, 4, 0, 0]} name="Interactions" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="section-title" style={{ marginTop: 18 }}>
              People per circle
            </div>
            <div style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={circleChart} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#4b5563" }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#8a93a3" }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="inTouch" stackId="a" fill="#209dd7" name="In touch / upcoming" />
                  <Bar dataKey="overdue" stackId="a" fill="#c0392b" name="Overdue" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
