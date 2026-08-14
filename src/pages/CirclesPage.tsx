import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { CIRCLE_CADENCE_LABELS, CIRCLE_LABELS, CIRCLES } from "@shared/types";
import type { Circle, PersonListItem } from "@shared/types";
import { fetchPeople, updatePerson } from "../api";
import { ago, statusCopy } from "../lib/format";
import { Avatar } from "../components/Avatar";
import { StatusBadge } from "../components/ui";

function Card({ person }: { person: PersonListItem }) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: person.id,
    data: { circle: person.circle },
  });
  return (
    <button
      type="button"
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => navigate(`/people/${person.id}`)}
      className="flex w-full items-center gap-3 rounded-xl bg-card p-3 text-left shadow-sm ring-1 ring-line"
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.5 : 1 }}
    >
      <Avatar person={person} size={44} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{person.name}</div>
        <div className="truncate text-xs text-muted">
          {person.lastContacted ? `Last ${ago(person.lastContacted)}` : "Not contacted yet"}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <StatusBadge status={person.checkInStatus} />
          <span className="text-xs text-muted">
            {person.checkInStatus && person.checkInStatus !== "in_touch"
              ? statusCopy(person.daysUntilDue, person.checkInStatus)
              : ""}
          </span>
        </div>
      </div>
    </button>
  );
}

function Column({ circle, people }: { circle: Circle; people: PersonListItem[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: circle, data: { circle } });
  const overdue = people.filter((p) => p.checkInStatus === "overdue").length;
  return (
    <section ref={setNodeRef} className={`flex min-h-0 min-w-0 flex-col rounded-2xl p-1 ${isOver ? "bg-white" : ""}`}>
      <header className="mb-3 px-1">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-serif text-2xl">{CIRCLE_LABELS[circle]}</h2>
          <span className="text-sm text-muted">{people.length}</span>
        </div>
        <p className="text-xs text-muted">
          {CIRCLE_CADENCE_LABELS[circle]}
          {overdue > 0 ? ` · ${overdue} overdue` : " · none overdue"}
        </p>
      </header>
      <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-2 overflow-x-hidden overflow-y-auto rounded-2xl bg-white/40 p-2">
        {people.map((person) => (
          <Card key={person.id} person={person} />
        ))}
      </div>
    </section>
  );
}

export function CirclesPage() {
  const qc = useQueryClient();
  const people = useQuery({ queryKey: ["people"], queryFn: () => fetchPeople() });
  const move = useMutation({
    mutationFn: ({ id, circle }: { id: string; circle: Circle }) => updatePerson(id, { circle }),
    onSuccess: () => qc.invalidateQueries(),
  });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function onDragEnd(event: DragEndEvent) {
    const id = String(event.active.id);
    const person = people.data?.find((p) => p.id === id);
    const overCircle = (event.over?.data.current?.circle ??
      people.data?.find((p) => p.id === event.over?.id)?.circle) as Circle | undefined;
    if (!person || !overCircle || person.circle === overCircle) return;
    move.mutate({ id, circle: overCircle });
  }

  const grouped = Object.fromEntries(CIRCLES.map((c) => [c, (people.data ?? []).filter((p) => p.circle === c)])) as Record<
    Circle,
    PersonListItem[]
  >;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="mb-5">
        <h1 className="font-serif text-4xl">Circles</h1>
        <p className="mt-1 text-muted">Drag someone to change how close they are — and how often you stay in touch.</p>
      </div>
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="grid min-h-0 flex-1 grid-cols-4 gap-4">
          {CIRCLES.map((circle) => (
            <Column key={circle} circle={circle} people={grouped[circle]} />
          ))}
        </div>
      </DndContext>
    </div>
  );
}
