import { useQuery } from "@tanstack/react-query";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DATE_TYPE_LABELS } from "@shared/types";
import { occurrenceInYear } from "@shared/dates";
import { fetchDates, fetchPeople } from "../api";
import { Avatar } from "../components/Avatar";
import { Button } from "../components/ui";

export function CalendarPage() {
  const navigate = useNavigate();
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const dates = useQuery({ queryKey: ["dates"], queryFn: fetchDates });
  const people = useQuery({ queryKey: ["people"], queryFn: () => fetchPeople() });
  const peopleById = useMemo(() => new Map((people.data ?? []).map((p) => [p.id, p])), [people.data]);

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }),
  });

  function eventsOn(day: Date) {
    return (dates.data ?? []).filter((d) => isSameDay(occurrenceInYear(day.getFullYear(), d.month, d.day), day));
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-4xl">Calendar</h1>
          <p className="mt-1 text-muted">Birthdays and the dates that come around every year.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setCursor((d) => subMonths(d, 1))} aria-label="Previous month">
            <ChevronLeft size={18} />
          </Button>
          <div className="w-44 text-center font-serif text-2xl">{format(cursor, "MMMM yyyy")}</div>
          <Button variant="secondary" onClick={() => setCursor((d) => addMonths(d, 1))} aria-label="Next month">
            <ChevronRight size={18} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-2xl border border-line bg-line">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="bg-paper px-3 py-2 text-xs font-semibold tracking-wide text-muted uppercase">
            {d}
          </div>
        ))}
        {days.map((day) => {
          const events = eventsOn(day);
          const inMonth = isSameMonth(day, cursor);
          return (
            <div key={day.toISOString()} className={`min-h-28 bg-card p-2 ${inMonth ? "" : "opacity-40"}`}>
              <div className="text-sm font-semibold">{format(day, "d")}</div>
              <div className="mt-1 flex flex-col gap-1">
                {events.map((event) => {
                  const person = peopleById.get(event.personId);
                  if (!person) return null;
                  return (
                    <button
                      key={event.id}
                      type="button"
                      className="flex items-center gap-1.5 rounded-md bg-paper px-1.5 py-1 text-left text-xs hover:bg-due-bg"
                      onClick={() => navigate(`/people/${person.id}`)}
                    >
                      <Avatar person={person} size={18} />
                      <span className="truncate">
                        {person.name.split(" ")[0]} · {event.label || DATE_TYPE_LABELS[event.type]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
