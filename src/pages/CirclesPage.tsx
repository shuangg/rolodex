import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { api } from "../api";
import { Avatar } from "../components/Avatar";
import { StatusBadge } from "../components/StatusBadge";
import { CIRCLE_LABELS, type Circle, type PersonWithMeta } from "../types";
import { formatDate } from "../lib/format";

const COLUMNS: Circle[] = ["inner", "close", "wider", "distant"];

function CardContent({ person }: { person: PersonWithMeta }) {
  return (
    <>
      <div className="pc-top">
        <Avatar person={person} />
        <div className="grow">
          <div className="pc-name">
            {person.firstName} {person.lastName}
          </div>
          <div className="pc-sub">{person.company ?? "—"}</div>
        </div>
      </div>
      <div className="pc-meta">
        <span>Last: {formatDate(person.lastContacted)}</span>
      </div>
      <StatusBadge info={person.checkin} />
    </>
  );
}

function SortableCard({ person }: { person: PersonWithMeta }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: person.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`person-card${isDragging ? " dragging" : ""}`}
      {...attributes}
      {...listeners}
    >
      <CardContent person={person} />
    </div>
  );
}

function Column({
  circle,
  people,
  onCardClick,
}: {
  circle: Circle;
  people: PersonWithMeta[];
  onCardClick: (id: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: circle });
  const overdue = people.filter((p) => p.checkin.status === "overdue").length;
  return (
    <div ref={setNodeRef} className={`board-column${isOver ? " drag-over" : ""}`}>
      <div className="board-column-header">
        <span className="board-column-title">{CIRCLE_LABELS[circle]}</span>
        <span className="board-column-meta">
          {people.length} {overdue > 0 ? `· ${overdue} overdue` : ""}
        </span>
      </div>
      <SortableContext items={people.map((p) => p.id)} strategy={verticalListSortingStrategy}>
        {people.map((p) => (
          <div key={p.id} onClick={() => onCardClick(p.id)}>
            <SortableCard person={p} />
          </div>
        ))}
      </SortableContext>
      {people.length === 0 ? (
        <div className="hint" style={{ padding: 12, textAlign: "center" }}>
          No one here yet.
        </div>
      ) : null}
    </div>
  );
}

export function CirclesPage() {
  const navigate = useNavigate();
  const [people, setPeople] = useState<PersonWithMeta[] | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setPeople(await api.listPeople());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load people.");
    }
  };

  if (people === null && error === null) void refresh();

  const byCircle = useMemo(() => {
    const groups: Record<Circle, PersonWithMeta[]> = {
      inner: [],
      close: [],
      wider: [],
      distant: [],
    };
    for (const p of people ?? []) groups[p.circle].push(p);
    return groups;
  }, [people]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));

  const findPerson = (id: number) => people?.find((p) => p.id === id);
  const circleOf = (id: unknown): Circle | null => {
    const key = String(id);
    if (COLUMNS.includes(key as Circle)) return key as Circle;
    const person = findPerson(Number(id));
    return person ? person.circle : null;
  };

  const sourceCircleRef = useRef<Circle | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(Number(event.active.id));
    sourceCircleRef.current = findPerson(Number(event.active.id))?.circle ?? null;
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || !people) return;
    const activeIdNum = Number(active.id);
    const targetCircle = circleOf(over.id);
    if (!targetCircle) return;
    const person = findPerson(activeIdNum);
    if (person && person.circle !== targetCircle) {
      setPeople((prev) => prev?.map((p) => (p.id === activeIdNum ? { ...p, circle: targetCircle } : p)) ?? null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;
    const activeIdNum = Number(active.id);
    const oldCircle = sourceCircleRef.current;
    const newCircle = circleOf(over.id);
    if (oldCircle && newCircle && oldCircle !== newCircle) {
      try {
        await api.updatePerson(activeIdNum, { circle: newCircle });
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not update circle.");
        await refresh();
      }
    }
  };

  const activePerson = activeId != null ? findPerson(activeId) : null;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Circles</h1>
          <p className="page-subtitle">
            Inner → Close → Wider → Distant. Drag a card to move someone closer to the centre of your life.
          </p>
        </div>
      </div>
      {error ? <p className="error-text" style={{ marginBottom: 12 }}>{error}</p> : null}
      {!people ? (
        <div className="card card-pad">Loading…</div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="board">
            {COLUMNS.map((circle) => (
              <Column key={circle} circle={circle} people={byCircle[circle]} onCardClick={(id) => navigate(`/people/${id}`)} />
            ))}
          </div>
          <DragOverlay>{activePerson ? <div className="person-card" style={{ boxShadow: "var(--shadow-lg)", cursor: "grabbing" }}><CardContent person={activePerson} /></div> : null}</DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
