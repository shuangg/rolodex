import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import {
  InteractionType,
  ImportantDateType,
  GiftStatus,
  RelationshipType,
  Person,
  PersonWithComputed,
} from '@shared/types';
import { formatDateISO } from '@shared/cadence';
import { Phone, MessageSquare, Mail, Users, Coffee, Gift, Calendar, Bookmark, CheckSquare } from 'lucide-react';

// ----------------------------------------------------------------------------
// Log Interaction Modal
// ----------------------------------------------------------------------------
export const LogInteractionModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  person: PersonWithComputed;
  onSave: (data: { type: InteractionType; date: string; notes?: string }) => Promise<void>;
}> = ({ isOpen, onClose, person, onSave }) => {
  const [type, setType] = useState<InteractionType>('call');
  const [date, setDate] = useState(formatDateISO(new Date()));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const interactionTypes: Array<{ type: InteractionType; label: string; icon: React.ReactNode }> = [
    { type: 'call', label: 'Phone Call', icon: <Phone className="w-4 h-4" /> },
    { type: 'message', label: 'Message / Chat', icon: <MessageSquare className="w-4 h-4" /> },
    { type: 'email', label: 'Email', icon: <Mail className="w-4 h-4" /> },
    { type: 'meetup', label: 'Met Up / In Person', icon: <Coffee className="w-4 h-4" /> },
    { type: 'other', label: 'Other', icon: <Users className="w-4 h-4" /> },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ type, date, notes: notes.trim() || undefined });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Log Interaction with ${person.name}`}
      description="Record a catch-up or touchpoint. This resets their check-in cadence clock."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-2">
            Interaction Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            {interactionTypes.map((item) => (
              <button
                key={item.type}
                type="button"
                onClick={() => setType(item.type)}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition-all ${
                  type === item.type
                    ? 'border-[#209dd7] bg-sky-50 text-sky-900 font-semibold ring-1 ring-[#209dd7]'
                    : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                }`}
              >
                <span className={type === item.type ? 'text-[#209dd7]' : 'text-gray-400'}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#209dd7]"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
            Notes / What you discussed
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Key topics, shared updates, follow-ups..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#209dd7] resize-none"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 bg-[#209dd7] hover:bg-[#1a82b3] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 shadow-sm"
          >
            {saving ? 'Logging...' : 'Log Interaction'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// ----------------------------------------------------------------------------
// Add News Modal
// ----------------------------------------------------------------------------
export const AddNewsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  personName: string;
  onSave: (data: { content: string; date: string }) => Promise<void>;
}> = ({ isOpen, onClose, personName, onSave }) => {
  const [content, setContent] = useState('');
  const [date, setDate] = useState(formatDateISO(new Date()));
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSaving(true);
    try {
      await onSave({ content: content.trim(), date });
      setContent('');
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Add News for ${personName}`}
      description="Record a life update or milestone. The newest news appears on their card and table."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
            News / Life Update <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="e.g. Started new role at Stripe / Moved to Berlin"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#209dd7]"
            required
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#209dd7]"
            required
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !content.trim()}
            className="px-5 py-2 bg-[#209dd7] hover:bg-[#1a82b3] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Adding...' : 'Add News'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// ----------------------------------------------------------------------------
// Add Fact Modal
// ----------------------------------------------------------------------------
export const AddFactModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  personName: string;
  onSave: (fact: string) => Promise<void>;
}> = ({ isOpen, onClose, personName, onSave }) => {
  const [fact, setFact] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fact.trim()) return;
    setSaving(true);
    try {
      await onSave(fact.trim());
      setFact('');
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Add Fact about ${personName}`}
      description="Small and durable facts worth remembering (e.g. allergies, partner name, sports team)."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
            Fact <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={fact}
            onChange={(e) => setFact(e.target.value)}
            placeholder="e.g. Allergic to shellfish / Supports Arsenal / Loves filter coffee"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#209dd7]"
            required
            autoFocus
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !fact.trim()}
            className="px-5 py-2 bg-[#209dd7] hover:bg-[#1a82b3] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Adding...' : 'Add Fact'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// ----------------------------------------------------------------------------
// Add Reminder Modal
// ----------------------------------------------------------------------------
export const AddReminderModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  personName: string;
  onSave: (data: { title: string; due_date: string }) => Promise<void>;
}> = ({ isOpen, onClose, personName, onSave }) => {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(formatDateISO(new Date()));
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) return;
    setSaving(true);
    try {
      await onSave({ title: title.trim(), due_date: dueDate });
      setTitle('');
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Set Reminder for ${personName}`}
      description="Create a task with a due date that will appear on Today."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
            Reminder Title <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Send feedback on book draft / Order birthday flowers"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#209dd7]"
            required
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
            Due Date <span className="text-rose-500">*</span>
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#209dd7]"
            required
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="px-5 py-2 bg-[#209dd7] hover:bg-[#1a82b3] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Creating...' : 'Set Reminder'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// ----------------------------------------------------------------------------
// Add Important Date Modal
// ----------------------------------------------------------------------------
export const AddImportantDateModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  personName: string;
  onSave: (data: {
    type: ImportantDateType;
    title?: string;
    month: number;
    day: number;
    year?: number | null;
  }) => Promise<void>;
}> = ({ isOpen, onClose, personName, onSave }) => {
  const [type, setType] = useState<ImportantDateType>('birthday');
  const [title, setTitle] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [day, setDay] = useState(new Date().getDate());
  const [year, setYear] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        type,
        title: title.trim() || undefined,
        month: Number(month),
        day: Number(day),
        year: year ? parseInt(year, 10) : null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Add Important Date for ${personName}`}
      description="Recurring dates that come round every year (birthdays, anniversaries)."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
            Date Type
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ImportantDateType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#209dd7]"
          >
            <option value="birthday">Birthday</option>
            <option value="anniversary">Anniversary</option>
            <option value="work_anniversary">Work Anniversary</option>
            <option value="child_birthday">Child's Birthday</option>
            <option value="other">Other Recurring Date</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
            Custom Title / Label (Optional)
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Wedding Anniversary / Leo's Birthday"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#209dd7]"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
              Month
            </label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="w-full px-2.5 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#209dd7]"
            >
              {months.map((m, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
              Day
            </label>
            <input
              type="number"
              min="1"
              max="31"
              value={day}
              onChange={(e) => setDay(Number(e.target.value))}
              className="w-full px-2.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#209dd7]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
              Year (Optional)
            </label>
            <input
              type="number"
              min="1900"
              max="2100"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="e.g. 1990"
              className="w-full px-2.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#209dd7]"
            />
          </div>
        </div>

        <p className="text-xs text-gray-500">
          When the year is known, Rolodex will display their current age and highlight milestone birthdays.
        </p>

        <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 bg-[#209dd7] hover:bg-[#1a82b3] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Adding...' : 'Add Date'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// ----------------------------------------------------------------------------
// Add Gift Modal
// ----------------------------------------------------------------------------
export const AddGiftModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  personName: string;
  onSave: (data: {
    name: string;
    status: GiftStatus;
    occasion?: string;
    date?: string;
    notes?: string;
  }) => Promise<void>;
}> = ({ isOpen, onClose, personName, onSave }) => {
  const [name, setName] = useState('');
  const [status, setStatus] = useState<GiftStatus>('idea');
  const [occasion, setOccasion] = useState('Birthday');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        status,
        occasion: occasion.trim() || undefined,
        date: date || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Add Gift for ${personName}`}
      description="Track gift ideas, items you have given, or gifts you received."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
            Gift Item / Idea <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Rare book first edition / Ceramic dripper"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#209dd7]"
            required
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as GiftStatus)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#209dd7]"
            >
              <option value="idea">Idea (to give)</option>
              <option value="given">Given</option>
              <option value="received">Received</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
              Occasion
            </label>
            <input
              type="text"
              value={occasion}
              onChange={(e) => setOccasion(e.target.value)}
              placeholder="e.g. Birthday, Christmas"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#209dd7]"
            />
          </div>
        </div>

        {status !== 'idea' && (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
              Date Given / Received
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#209dd7]"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
            Notes / Store Link / Sizing
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Details, preferred colors, where to buy..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#209dd7] resize-none"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="px-5 py-2 bg-[#209dd7] hover:bg-[#1a82b3] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Adding...' : 'Add Gift'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// ----------------------------------------------------------------------------
// Add Connection Modal
// ----------------------------------------------------------------------------
export const AddConnectionModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  currentPerson: Person;
  availablePeople: Person[];
  onSave: (data: {
    person_b_id: string;
    relationship_type: RelationshipType;
    custom_label?: string;
  }) => Promise<void>;
}> = ({ isOpen, onClose, currentPerson, availablePeople, onSave }) => {
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [relationshipType, setRelationshipType] = useState<RelationshipType>('partner');
  const [customLabel, setCustomLabel] = useState('');
  const [saving, setSaving] = useState(false);

  const eligiblePeople = availablePeople.filter((p) => p.id !== currentPerson.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPersonId) return;
    setSaving(true);
    try {
      await onSave({
        person_b_id: selectedPersonId,
        relationship_type: relationshipType,
        custom_label: customLabel.trim() || undefined,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Connect ${currentPerson.name} with someone`}
      description="Create a reciprocal connection between two people."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
            Connected Person <span className="text-rose-500">*</span>
          </label>
          <select
            value={selectedPersonId}
            onChange={(e) => setSelectedPersonId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#209dd7]"
            required
          >
            <option value="">-- Choose a person --</option>
            {eligiblePeople.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.company ? `(${p.company})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
            Relationship Type ({currentPerson.name} is...)
          </label>
          <select
            value={relationshipType}
            onChange={(e) => setRelationshipType(e.target.value as RelationshipType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#209dd7]"
          >
            <option value="partner">Partner / Spouse of</option>
            <option value="parent">Parent of</option>
            <option value="child">Child of</option>
            <option value="sibling">Sibling of</option>
            <option value="colleague">Colleague of</option>
            <option value="introduced">Introduced me to</option>
            <option value="friend">Friend of</option>
            <option value="other">Other Connection</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
            Custom Label (Optional override)
          </label>
          <input
            type="text"
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            placeholder="e.g. Co-founder / Mentor"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#209dd7]"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !selectedPersonId}
            className="px-5 py-2 bg-[#209dd7] hover:bg-[#1a82b3] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Connecting...' : 'Create Connection'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
