import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import { PersonWithComputed, CircleType, CIRCLE_ORDER, CIRCLE_LABELS, CIRCLE_CADENCE_DAYS } from '@shared/types';
import { Avatar } from '../common/Avatar';
import { StatusBadge } from '../common/StatusBadge';
import { GripVertical, AlertCircle, Sparkles, Building2, Calendar, MapPin } from 'lucide-react';

interface CirclesBoardProps {
  people: PersonWithComputed[];
  onSelectPerson: (person: PersonWithComputed) => void;
  onUpdatePersonCircle: (personId: string, newCircle: CircleType) => Promise<void>;
}

const CIRCLE_HEADER_THEMES: Record<
  CircleType,
  { bg: string; text: string; border: string; desc: string; dot: string }
> = {
  inner: {
    bg: 'bg-amber-50',
    text: 'text-amber-900',
    border: 'border-amber-200',
    desc: 'Monthly check-in (30d)',
    dot: 'bg-[#ecad0a]',
  },
  close: {
    bg: 'bg-sky-50',
    text: 'text-sky-900',
    border: 'border-sky-200',
    desc: 'Quarterly check-in (90d)',
    dot: 'bg-[#209dd7]',
  },
  wider: {
    bg: 'bg-purple-50',
    text: 'text-purple-900',
    border: 'border-purple-200',
    desc: 'Every 6 months (180d)',
    dot: 'bg-[#753991]',
  },
  distant: {
    bg: 'bg-slate-100',
    text: 'text-slate-900',
    border: 'border-slate-200',
    desc: 'Yearly check-in (365d)',
    dot: 'bg-slate-400',
  },
};

// Draggable Person Card Component
const PersonCard: React.FC<{
  person: PersonWithComputed;
  onSelect: () => void;
  isDragging?: boolean;
}> = ({ person, onSelect, isDragging }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: person.id,
    data: { person },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-xl border border-gray-200 p-3.5 shadow-sm hover:shadow-md hover:border-gray-300 transition-all cursor-pointer group select-none ${
        isDragging ? 'opacity-40 border-dashed border-[#209dd7]' : ''
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar name={person.name} photoUrl={person.photo_url} size="sm" />
          <div className="min-w-0">
            <h4 className="font-semibold text-gray-900 text-sm truncate group-hover:text-[#209dd7] transition-colors">
              {person.name}
            </h4>
            <p className="text-xs text-gray-500 truncate">
              {person.company ? `${person.company}` : person.job_title || ''}
            </p>
          </div>
        </div>

        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="cursor-grab active:cursor-grabbing p-1 text-gray-300 hover:text-gray-600 rounded"
          title="Drag to change circle"
        >
          <GripVertical className="w-4 h-4" />
        </div>
      </div>

      {/* Details & Status */}
      <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs">
        <div className="text-gray-500 text-[11px] truncate">
          {person.last_contacted ? (
            <span>Spoke {person.last_contacted}</span>
          ) : (
            <span className="text-gray-400 italic">Never contacted</span>
          )}
        </div>

        <StatusBadge
          status={person.status}
          daysOverdue={person.days_overdue}
          daysUntilDue={person.days_until_due}
          snoozeUntil={person.snooze_until}
          size="sm"
        />
      </div>
    </div>
  );
};

// Droppable Column Component
const DroppableColumn: React.FC<{
  circle: CircleType;
  people: PersonWithComputed[];
  onSelectPerson: (person: PersonWithComputed) => void;
}> = ({ circle, people, onSelectPerson }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${circle}`,
    data: { circle },
  });

  const theme = CIRCLE_HEADER_THEMES[circle];
  const overdueCount = people.filter((p) => p.status === 'overdue').length;

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col bg-gray-50/70 rounded-2xl border ${
        isOver ? 'border-[#209dd7] ring-2 ring-sky-200 bg-sky-50/20' : 'border-gray-200'
      } transition-all duration-200 min-h-[550px]`}
    >
      {/* Column Header */}
      <div className={`p-4 border-b ${theme.border} ${theme.bg} rounded-t-2xl`}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${theme.dot}`} />
            <h3 className={`font-bold text-sm tracking-tight ${theme.text}`}>
              {CIRCLE_LABELS[circle]}
            </h3>
          </div>
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-white/80 border border-black/5 text-gray-700 shadow-2xs">
            {people.length}
          </span>
        </div>

        <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1">
          <span>{theme.desc}</span>
          {overdueCount > 0 ? (
            <span className="text-rose-600 font-semibold flex items-center gap-0.5">
              <AlertCircle className="w-3 h-3" />
              {overdueCount} overdue
            </span>
          ) : (
            <span className="text-emerald-700 font-medium">All caught up</span>
          )}
        </div>
      </div>

      {/* Cards Container */}
      <div className="p-3 flex-1 space-y-2.5 overflow-y-auto max-h-[calc(100vh-280px)]">
        {people.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-center p-4 border border-dashed border-gray-200 rounded-xl text-gray-400">
            <p className="text-xs font-medium">No people in this circle</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Drag someone here to add</p>
          </div>
        ) : (
          people.map((person) => (
            <PersonCard
              key={person.id}
              person={person}
              onSelect={() => onSelectPerson(person)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export const CirclesBoard: React.FC<CirclesBoardProps> = ({
  people,
  onSelectPerson,
  onUpdatePersonCircle,
}) => {
  const [activePerson, setActivePerson] = useState<PersonWithComputed | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const person = event.active.data.current?.person as PersonWithComputed;
    if (person) {
      setActivePerson(person);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActivePerson(null);

    if (!over) return;

    const personId = active.id as string;
    let targetCircle: CircleType | null = null;

    const overId = String(over.id);
    if (overId.startsWith('column-')) {
      targetCircle = overId.replace('column-', '') as CircleType;
    } else if (over.data.current?.circle) {
      targetCircle = over.data.current.circle as CircleType;
    }

    if (targetCircle && CIRCLE_ORDER.includes(targetCircle)) {
      const currentPerson = people.find((p) => p.id === personId);
      if (currentPerson && currentPerson.circle !== targetCircle) {
        await onUpdatePersonCircle(personId, targetCircle);
      }
    }
  };

  // Group people by circle
  const peopleByCircle: Record<CircleType, PersonWithComputed[]> = {
    inner: people.filter((p) => p.circle === 'inner'),
    close: people.filter((p) => p.circle === 'close'),
    wider: people.filter((p) => p.circle === 'wider'),
    distant: people.filter((p) => p.circle === 'distant'),
  };

  return (
    <div className="space-y-4">
      {/* Description banner */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-900">Circles Board</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Drag and drop cards between circles to adjust how frequently you want to stay in touch.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
          <span className="font-semibold text-gray-900">{people.length}</span> total contacts across 4 circles
        </div>
      </div>

      {/* Board Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {CIRCLE_ORDER.map((circle: CircleType) => (
            <DroppableColumn
              key={circle}
              circle={circle}
              people={peopleByCircle[circle]}
              onSelectPerson={onSelectPerson}
            />
          ))}
        </div>

        {/* Drag Overlay for smooth animation */}
        <DragOverlay>
          {activePerson ? (
            <div className="bg-white rounded-xl border-2 border-[#209dd7] p-3.5 shadow-xl w-72 rotate-2 opacity-95">
              <div className="flex items-center gap-2.5">
                <Avatar name={activePerson.name} photoUrl={activePerson.photo_url} size="sm" />
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm">{activePerson.name}</h4>
                  <p className="text-xs text-gray-500">{activePerson.company || activePerson.job_title}</p>
                </div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};
