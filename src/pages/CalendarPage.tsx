import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar as BigCalendar, dateFnsLocalizer, type View } from "react-big-calendar";
import { format, getDay, parseISO, startOfWeek, addMonths, subMonths } from "date-fns";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { api } from "../api";
import { occurrenceInMonth, isMilestone, ageOn } from "../lib/recurring";
import type { PersonSummary } from "../types";

const localizer = dateFnsLocalizer({
  format,
  getDay,
  startOfWeek,
  locales: { "en-US": enUS },
});

interface CalEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  person: PersonSummary;
  milestone: boolean;
  kind: string;
  age: number | null;
}

export function CalendarPage() {
  const navigate = useNavigate();
  const [date, setDate] = useState(() => new Date());
  const [view, setView] = useState<View>("month");
  const [data, setData] = useState<Array<{ date: { id: number; personId: number; kind: string; label: string | null; month: number; day: number; year: number | null }; person: PersonSummary }> | null>(null);

  const load = async () => {
    try {
      setData(await api.allDates());
    } catch {
      setData([]);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const events = useMemo(() => {
    if (!data) return [];
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const out: CalEvent[] = [];
    for (const { date: d, person } of data) {
      if (d.month !== month) continue;
      const occ = occurrenceInMonth(year, month, d.day);
      if (!occ) continue;
      let age: number | null = null;
      if (d.year != null) {
        age = ageOn(parseISO(occ.date), d.month, d.day, d.year);
      }
      const milestone = age != null && isMilestone(age);
      const label =
        d.kind === "birthday"
          ? `${person.firstName}'s birthday`
          : d.label ?? `${person.firstName} — ${d.kind.replace("_", " ")}`;
      out.push({
        id: String(d.id),
        title: milestone ? `${label} · ${age}!` : label,
        start: parseISO(occ.date),
        end: parseISO(occ.date),
        allDay: true,
        person,
        milestone,
        kind: d.kind,
        age,
      });
    }
    return out;
  }, [data, date]);

  const eventPropGetter = (event: CalEvent) => ({
    className: event.kind === "birthday" ? (event.milestone ? "rbc-event-milestone" : "") : "rbc-event-other",
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Calendar</h1>
          <p className="page-subtitle">Birthdays and important dates, so you can plan around what's coming.</p>
        </div>
        <div className="row">
          <button className="btn btn-sm" onClick={() => setDate(subMonths(date, 1))}>Previous</button>
          <button className="btn btn-sm" onClick={() => setDate(new Date())}>Today</button>
          <button className="btn btn-sm" onClick={() => setDate(addMonths(date, 1))}>Next</button>
        </div>
      </div>
      {!data ? (
        <div className="card card-pad">Loading…</div>
      ) : (
        <div className="calendar-wrap">
          <BigCalendar
            localizer={localizer}
            events={events}
            view={view}
            date={date}
            onView={setView}
            onNavigate={(d) => setDate(d)}
            views={["month"]}
            startAccessor="start"
            endAccessor="end"
            eventPropGetter={eventPropGetter}
            popup
            onSelectEvent={(e) => navigate(`/people/${(e as CalEvent).person.id}`)}
          />
        </div>
      )}
      <p className="hint" style={{ marginTop: 14 }}>
        {events.length === 0 ? "No dates this month." : `${events.length} date${events.length === 1 ? "" : "s"} this month. Click any date to open that person.`} Dates like 29 February are shown on 28 February in non-leap years.
      </p>
    </div>
  );
}
