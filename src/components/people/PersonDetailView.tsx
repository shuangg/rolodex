import React, { useState, useEffect } from 'react';
import {
  PersonWithComputed,
  Interaction,
  ImportantDate,
  Fact,
  News,
  Reminder,
  Gift,
  ConnectionView,
  CircleType,
  Person,
} from '@shared/types';
import { api } from '../../api/client';
import { Avatar } from '../common/Avatar';
import { CircleBadge } from '../common/CircleBadge';
import { StatusBadge } from '../common/StatusBadge';
import { getNextOccurrence, IMPORTANT_DATE_LABELS } from '@shared/dates';
import {
  LogInteractionModal,
  AddNewsModal,
  AddFactModal,
  AddReminderModal,
  AddImportantDateModal,
  AddGiftModal,
  AddConnectionModal,
} from './submodals';
import {
  Phone,
  MessageSquare,
  Mail,
  MapPin,
  Clock,
  Calendar,
  Gift as GiftIcon,
  Users,
  Coffee,
  CheckSquare,
  Plus,
  Trash2,
  Edit,
  ArrowLeft,
  Sparkles,
  Bookmark,
  CheckCircle2,
  Circle,
  ExternalLink,
  ChevronRight,
  Cake,
  AlertTriangle,
  Info,
} from 'lucide-react';

interface PersonDetailViewProps {
  person: PersonWithComputed;
  allPeople: Person[];
  onBack: () => void;
  onEdit: (person: PersonWithComputed) => void;
  onDelete: (person: PersonWithComputed) => void;
  onNavigateToPerson: (personId: string) => void;
  onRefreshData: () => Promise<void>;
}

export const PersonDetailView: React.FC<PersonDetailViewProps> = ({
  person,
  allPeople,
  onBack,
  onEdit,
  onDelete,
  onNavigateToPerson,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'facts' | 'dates' | 'reminders' | 'gifts' | 'connections'>('timeline');

  // Sub-entity states
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [importantDates, setImportantDates] = useState<ImportantDate[]>([]);
  const [facts, setFacts] = useState<Fact[]>([]);
  const [newsList, setNewsList] = useState<News[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [connections, setConnections] = useState<ConnectionView[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showLogModal, setShowLogModal] = useState(false);
  const [showNewsModal, setShowNewsModal] = useState(false);
  const [showFactModal, setShowFactModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showConnectionModal, setShowConnectionModal] = useState(false);

  // Fetch all related entities for this person
  const loadPersonEntities = async () => {
    try {
      setLoading(true);
      const [interList, datesList, factsList, newsRows, remList, giftList, connList] =
        await Promise.all([
          api.getInteractions(person.id),
          api.getImportantDates(person.id),
          api.getFacts(person.id),
          api.getNews(person.id),
          api.getReminders(person.id),
          api.getGifts(person.id),
          api.getConnections(person.id),
        ]);

      setInteractions(interList);
      setImportantDates(datesList);
      setFacts(factsList);
      setNewsList(newsRows);
      setReminders(remList);
      setGifts(giftList);
      setConnections(connList);
    } catch (err) {
      console.error('Failed to load person data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPersonEntities();
  }, [person.id]);

  // Calculate local time for this person based on their time zone
  const getPersonLocalTime = () => {
    if (!person.time_zone) return null;
    try {
      const now = new Date();
      return new Intl.DateTimeFormat('en-US', {
        timeZone: person.time_zone,
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
        timeZoneName: 'short',
      }).format(now);
    } catch {
      return null;
    }
  };

  const localTimeStr = getPersonLocalTime();

  // Find approaching dates (within 30 days) and gift ideas to surface
  const upcomingImportantDates = importantDates
    .map((d) => ({
      ...d,
      occurrence: getNextOccurrence(d),
    }))
    .filter((d) => d.occurrence.daysUntil <= 30)
    .sort((a, b) => a.occurrence.daysUntil - b.occurrence.daysUntil);

  const outstandingGiftIdeas = gifts.filter((g) => g.status === 'idea');

  // Action handlers
  const handleLogInteraction = async (data: { type: any; date: string; notes?: string }) => {
    await api.createInteraction({ person_id: person.id, ...data });
    await loadPersonEntities();
    await onRefreshData();
  };

  const handleDeleteInteraction = async (id: string) => {
    if (confirm('Delete this interaction log?')) {
      await api.deleteInteraction(id);
      await loadPersonEntities();
      await onRefreshData();
    }
  };

  const handleAddNews = async (data: { content: string; date: string }) => {
    await api.createNews({ person_id: person.id, ...data });
    await loadPersonEntities();
    await onRefreshData();
  };

  const handleDeleteNews = async (id: string) => {
    if (confirm('Delete this news entry?')) {
      await api.deleteNews(id);
      await loadPersonEntities();
      await onRefreshData();
    }
  };

  const handleAddFact = async (factText: string) => {
    await api.createFact({ person_id: person.id, fact: factText });
    await loadPersonEntities();
  };

  const handleDeleteFact = async (id: string) => {
    await api.deleteFact(id);
    await loadPersonEntities();
  };

  const handleAddReminder = async (data: { title: string; due_date: string }) => {
    await api.createReminder({ person_id: person.id, ...data });
    await loadPersonEntities();
    await onRefreshData();
  };

  const handleToggleReminder = async (rem: Reminder) => {
    await api.updateReminder(rem.id, {
      completed: !rem.completed,
    });
    await loadPersonEntities();
    await onRefreshData();
  };

  const handleDeleteReminder = async (id: string) => {
    await api.deleteReminder(id);
    await loadPersonEntities();
    await onRefreshData();
  };

  const handleAddDate = async (data: any) => {
    await api.createImportantDate({ person_id: person.id, ...data });
    await loadPersonEntities();
  };

  const handleDeleteDate = async (id: string) => {
    await api.deleteImportantDate(id);
    await loadPersonEntities();
  };

  const handleAddGift = async (data: any) => {
    await api.createGift({ person_id: person.id, ...data });
    await loadPersonEntities();
  };

  const handleToggleGiftStatus = async (gift: Gift, newStatus: any) => {
    await api.updateGift(gift.id, { status: newStatus });
    await loadPersonEntities();
  };

  const handleDeleteGift = async (id: string) => {
    await api.deleteGift(id);
    await loadPersonEntities();
  };

  const handleAddConnection = async (data: any) => {
    await api.createConnection({ person_a_id: person.id, ...data });
    await loadPersonEntities();
  };

  const handleDeleteConnection = async (id: string) => {
    await api.deleteConnection(id);
    await loadPersonEntities();
  };

  return (
    <div className="space-y-6">
      {/* Back button & Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to People</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(person)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-medium transition-colors shadow-sm"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </button>
          <button
            onClick={() => onDelete(person)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-rose-200 hover:bg-rose-50 text-rose-700 rounded-lg text-xs font-medium transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Main Profile Header Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-5">
            <Avatar name={person.name} photoUrl={person.photo_url} size="xl" />
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{person.name}</h1>
                <CircleBadge circle={person.circle} />
                <StatusBadge
                  status={person.status}
                  daysOverdue={person.days_overdue}
                  daysUntilDue={person.days_until_due}
                  snoozeUntil={person.snooze_until}
                  size="md"
                />
              </div>

              {/* Title & Company */}
              {(person.job_title || person.company) && (
                <p className="text-sm font-medium text-gray-600">
                  {person.job_title}
                  {person.job_title && person.company ? ' at ' : ''}
                  {person.company && <span className="text-gray-900 font-semibold">{person.company}</span>}
                </p>
              )}

              {/* Meta details (City, Timezone, Local Time, Email, Phone) */}
              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-gray-500 pt-1">
                {person.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    {person.city}
                  </span>
                )}

                {localTimeStr && (
                  <span className="flex items-center gap-1 text-gray-700 font-medium bg-gray-50 px-2 py-0.5 rounded border border-gray-200" title={`Timezone: ${person.time_zone}`}>
                    <Clock className="w-3.5 h-3.5 text-[#209dd7]" />
                    Local Time: {localTimeStr}
                  </span>
                )}

                {person.email && (
                  <a
                    href={`mailto:${person.email}`}
                    className="flex items-center gap-1 text-gray-600 hover:text-[#209dd7] transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    {person.email}
                  </a>
                )}

                {person.phone && (
                  <a
                    href={`tel:${person.phone}`}
                    className="flex items-center gap-1 text-gray-600 hover:text-[#209dd7] transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    {person.phone}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Log Interaction Primary CTA */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => setShowLogModal(true)}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#209dd7] hover:bg-[#1a82b3] text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
            >
              <Phone className="w-4 h-4" />
              <span>Log Interaction</span>
            </button>
          </div>
        </div>

        {/* Latest News Banner (Highlighted at top) */}
        {person.latest_news && (
          <div className="mt-5 p-3.5 bg-sky-50/70 border border-sky-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-[#209dd7] shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wider text-[#209dd7]">
                Latest News:
              </span>
              <span className="text-sm font-medium text-gray-900">
                {person.latest_news.content}
              </span>
              <span className="text-xs text-gray-500">
                ({person.latest_news.date})
              </span>
            </div>
            <button
              onClick={() => setShowNewsModal(true)}
              className="text-xs font-medium text-[#209dd7] hover:underline"
            >
              Add News
            </button>
          </div>
        )}

        {/* Approaching Birthday / Date & Surfaced Gift Ideas */}
        {upcomingImportantDates.length > 0 && (
          <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-950">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <Cake className="w-4 h-4 text-[#ecad0a]" />
                <span>
                  Upcoming {upcomingImportantDates[0].title || IMPORTANT_DATE_LABELS[upcomingImportantDates[0].type]} in{' '}
                  {upcomingImportantDates[0].occurrence.daysUntil === 0
                    ? 'TODAY!'
                    : `${upcomingImportantDates[0].occurrence.daysUntil} days (${upcomingImportantDates[0].occurrence.dateString})`}
                </span>
                {upcomingImportantDates[0].occurrence.isMilestone && (
                  <span className="px-2 py-0.5 rounded bg-[#ecad0a] text-white text-xs font-extrabold uppercase">
                    ★ Milestone (Turns {upcomingImportantDates[0].occurrence.turningAge})
                  </span>
                )}
              </div>
            </div>

            {/* Surfaced Gift Ideas */}
            {outstandingGiftIdeas.length > 0 ? (
              <div className="mt-2 text-xs bg-white/80 p-2.5 rounded-lg border border-amber-200">
                <span className="font-semibold text-amber-900">Gift Ideas for this occasion:</span>
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-gray-800">
                  {outstandingGiftIdeas.map((g) => (
                    <li key={g.id}>
                      <span className="font-medium">{g.name}</span>
                      {g.notes && <span className="text-gray-500"> — {g.notes}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs text-amber-800 mt-1">
                <span>No gift ideas saved yet for this date.</span>
                <button
                  onClick={() => setShowGiftModal(true)}
                  className="font-semibold text-amber-900 underline hover:text-amber-700"
                >
                  Add a gift idea
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-gray-200 bg-white rounded-t-xl px-4">
        {[
          { id: 'timeline', label: 'Timeline & History', count: interactions.length + newsList.length },
          { id: 'facts', label: 'Facts & Notes', count: facts.length },
          { id: 'dates', label: 'Important Dates', count: importantDates.length },
          { id: 'reminders', label: 'Reminders', count: reminders.filter((r) => !r.completed).length },
          { id: 'gifts', label: 'Gifts', count: gifts.length },
          { id: 'connections', label: 'Connections', count: connections.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.id
                ? 'border-[#209dd7] text-[#209dd7] font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === tab.id
                  ? 'bg-sky-100 text-[#209dd7]'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* TAB 1: TIMELINE & ACTIVITY */}
      {activeTab === 'timeline' && (
        <div className="bg-white rounded-b-xl border border-gray-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div>
              <h3 className="font-bold text-gray-900 text-base">Activity & History</h3>
              <p className="text-xs text-gray-500">Every interaction, piece of news, and milestone logged.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowNewsModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-gray-500" />
                <span>Add News</span>
              </button>
              <button
                onClick={() => setShowLogModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#209dd7] hover:bg-[#1a82b3] text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Log Interaction</span>
              </button>
            </div>
          </div>

          {interactions.length === 0 && newsList.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <p className="text-sm font-medium">No activity logged yet for {person.name}.</p>
              <p className="text-xs text-gray-400 mt-1">Log a call, message or life update to start their timeline.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Combine interactions and news into chronological order */}
              {[
                ...interactions.map((i) => ({
                  id: i.id,
                  type: 'interaction' as const,
                  interType: i.type,
                  date: i.date,
                  title: `Logged ${i.type}`,
                  notes: i.notes,
                  created_at: i.created_at,
                })),
                ...newsList.map((n) => ({
                  id: n.id,
                  type: 'news' as const,
                  interType: null,
                  date: n.date,
                  title: n.content,
                  notes: null,
                  created_at: n.created_at,
                })),
              ]
                .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))
                .map((item) => (
                  <div
                    key={`${item.type}-${item.id}`}
                    className="flex items-start gap-4 p-4 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors bg-white group"
                  >
                    <div className="p-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-600 shrink-0">
                      {item.type === 'news' ? (
                        <Sparkles className="w-4 h-4 text-[#ecad0a]" />
                      ) : item.interType === 'call' ? (
                        <Phone className="w-4 h-4 text-[#209dd7]" />
                      ) : item.interType === 'message' ? (
                        <MessageSquare className="w-4 h-4 text-emerald-600" />
                      ) : item.interType === 'email' ? (
                        <Mail className="w-4 h-4 text-[#753991]" />
                      ) : item.interType === 'meetup' ? (
                        <Coffee className="w-4 h-4 text-amber-600" />
                      ) : (
                        <Users className="w-4 h-4 text-gray-500" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          {item.type === 'news' ? 'News update' : `${item.interType} logged`}
                        </span>
                        <span className="text-xs font-medium text-gray-500">{item.date}</span>
                      </div>

                      <p className="text-sm font-semibold text-gray-900 mt-0.5">{item.title}</p>
                      {item.notes && <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{item.notes}</p>}
                    </div>

                    <button
                      onClick={() =>
                        item.type === 'news'
                          ? handleDeleteNews(item.id)
                          : handleDeleteInteraction(item.id)
                      }
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-rose-600 rounded transition-opacity"
                      title="Delete entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: FACTS & NOTES */}
      {activeTab === 'facts' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Facts List */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Facts Worth Remembering</h3>
                <p className="text-xs text-gray-500">Small and durable facts (allergies, partner, preferences).</p>
              </div>
              <button
                onClick={() => setShowFactModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-[#209dd7] hover:bg-[#1a82b3] text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Fact</span>
              </button>
            </div>

            {facts.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-4">No facts added yet.</p>
            ) : (
              <div className="space-y-2">
                {facts.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200 text-sm group"
                  >
                    <span className="text-gray-800 font-medium">{f.fact}</span>
                    <button
                      onClick={() => handleDeleteFact(f.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-rose-600 p-1"
                      title="Delete fact"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes & How We Met */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-900 text-base pb-2 border-b border-gray-100">
              Context & Background
            </h3>

            <div>
              <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                How / Where We Met
              </span>
              <p className="text-sm text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-200">
                {person.how_we_met || 'Not recorded'}
              </p>
            </div>

            <div>
              <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Freeform Notes
              </span>
              <p className="text-sm text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-200 whitespace-pre-wrap">
                {person.notes || 'No additional notes'}
              </p>
            </div>

            <div>
              <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Tags
              </span>
              <div className="flex flex-wrap gap-1.5">
                {person.tags?.length ? (
                  person.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200"
                    >
                      #{tag}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-400 italic">No tags</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: IMPORTANT DATES */}
      {activeTab === 'dates' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div>
              <h3 className="font-bold text-gray-900 text-base">Important Dates & Milestones</h3>
              <p className="text-xs text-gray-500">Birthdays, anniversaries, and yearly recurring events.</p>
            </div>
            <button
              onClick={() => setShowDateModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#209dd7] hover:bg-[#1a82b3] text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Date</span>
            </button>
          </div>

          {importantDates.length === 0 ? (
            <p className="text-xs text-gray-400 italic py-4">No important dates recorded.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {importantDates.map((d) => {
                const occ = getNextOccurrence(d);
                return (
                  <div
                    key={d.id}
                    className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 flex items-start justify-between group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 text-sm">
                          {d.title || IMPORTANT_DATE_LABELS[d.type]}
                        </span>
                        {occ.isMilestone && (
                          <span className="px-1.5 py-0.5 rounded bg-[#ecad0a] text-white text-[10px] font-bold uppercase">
                            Milestone
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-gray-600">
                        {d.month}/{d.day}
                        {d.year ? ` (${d.year})` : ' (year unknown)'}
                      </p>

                      <div className="text-xs text-[#209dd7] font-medium pt-1">
                        Next: {occ.dateString} (in {occ.daysUntil} days)
                        {occ.turningAge && ` • Turning ${occ.turningAge}`}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteDate(d.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-rose-600 p-1"
                      title="Delete date"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: REMINDERS */}
      {activeTab === 'reminders' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div>
              <h3 className="font-bold text-gray-900 text-base">Reminders & Tasks</h3>
              <p className="text-xs text-gray-500">Tasks associated with {person.name} that show on Today.</p>
            </div>
            <button
              onClick={() => setShowReminderModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#209dd7] hover:bg-[#1a82b3] text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Reminder</span>
            </button>
          </div>

          {reminders.length === 0 ? (
            <p className="text-xs text-gray-400 italic py-4">No reminders set for this person.</p>
          ) : (
            <div className="space-y-2">
              {reminders.map((r) => (
                <div
                  key={r.id}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                    r.completed
                      ? 'bg-gray-50/50 border-gray-200 text-gray-400'
                      : 'bg-white border-gray-200 text-gray-900 shadow-2xs'
                  } group`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleReminder(r)}
                      className="text-gray-400 hover:text-[#209dd7] focus:outline-none"
                    >
                      {r.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-300" />
                      )}
                    </button>
                    <div>
                      <p className={`text-sm font-medium ${r.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                        {r.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        Due: {r.due_date} {r.completed && ' (Done)'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteReminder(r.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-rose-600 p-1"
                    title="Delete reminder"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: GIFTS */}
      {activeTab === 'gifts' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div>
              <h3 className="font-bold text-gray-900 text-base">Gifts & Ideas</h3>
              <p className="text-xs text-gray-500">Gift ideas, items given in the past, and gifts received.</p>
            </div>
            <button
              onClick={() => setShowGiftModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#209dd7] hover:bg-[#1a82b3] text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Gift</span>
            </button>
          </div>

          {gifts.length === 0 ? (
            <p className="text-xs text-gray-400 italic py-4">No gifts recorded yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {gifts.map((g) => (
                <div
                  key={g.id}
                  className="p-4 rounded-xl border border-gray-200 bg-white space-y-2 group shadow-2xs"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold uppercase mb-1 ${
                          g.status === 'idea'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : g.status === 'given'
                            ? 'bg-sky-100 text-sky-900 border border-sky-300'
                            : 'bg-purple-100 text-purple-900 border border-purple-300'
                        }`}
                      >
                        {g.status}
                      </span>
                      <h4 className="font-bold text-gray-900 text-sm">{g.name}</h4>
                      {g.occasion && <p className="text-xs text-gray-500 font-medium">Occasion: {g.occasion}</p>}
                    </div>

                    <div className="flex items-center gap-1">
                      <select
                        value={g.status}
                        onChange={(e) => handleToggleGiftStatus(g, e.target.value)}
                        className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-gray-50"
                      >
                        <option value="idea">Idea</option>
                        <option value="given">Given</option>
                        <option value="received">Received</option>
                      </select>

                      <button
                        onClick={() => handleDeleteGift(g.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-rose-600 p-1"
                        title="Delete gift"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {g.date && <p className="text-xs text-gray-500">Date: {g.date}</p>}
                  {g.notes && <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded">{g.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 6: CONNECTIONS */}
      {activeTab === 'connections' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div>
              <h3 className="font-bold text-gray-900 text-base">Connections & Relationships</h3>
              <p className="text-xs text-gray-500">
                Bidirectional relationships between people. Click any card to navigate to their page.
              </p>
            </div>
            <button
              onClick={() => setShowConnectionModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#209dd7] hover:bg-[#1a82b3] text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Connection</span>
            </button>
          </div>

          {connections.length === 0 ? (
            <p className="text-xs text-gray-400 italic py-4">No connections recorded for {person.name}.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {connections.map((c) => (
                <div
                  key={c.id}
                  onClick={() => onNavigateToPerson(c.connected_person.id)}
                  className="p-4 rounded-xl border border-gray-200 hover:border-[#209dd7] hover:shadow-md transition-all cursor-pointer bg-white flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={c.connected_person.name} photoUrl={c.connected_person.photo_url} size="md" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 text-sm group-hover:text-[#209dd7] transition-colors">
                          {c.connected_person.name}
                        </span>
                        <CircleBadge circle={c.connected_person.circle} short />
                      </div>
                      <span className="inline-block mt-0.5 text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                        {c.relationship_label}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleDeleteConnection(c.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-rose-600 p-1.5 rounded transition-opacity"
                      title="Remove connection"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#209dd7] transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sub-Modals */}
      <LogInteractionModal
        isOpen={showLogModal}
        onClose={() => setShowLogModal(false)}
        person={person}
        onSave={handleLogInteraction}
      />
      <AddNewsModal
        isOpen={showNewsModal}
        onClose={() => setShowNewsModal(false)}
        personName={person.name}
        onSave={handleAddNews}
      />
      <AddFactModal
        isOpen={showFactModal}
        onClose={() => setShowFactModal(false)}
        personName={person.name}
        onSave={handleAddFact}
      />
      <AddReminderModal
        isOpen={showReminderModal}
        onClose={() => setShowReminderModal(false)}
        personName={person.name}
        onSave={handleAddReminder}
      />
      <AddImportantDateModal
        isOpen={showDateModal}
        onClose={() => setShowDateModal(false)}
        personName={person.name}
        onSave={handleAddDate}
      />
      <AddGiftModal
        isOpen={showGiftModal}
        onClose={() => setShowGiftModal(false)}
        personName={person.name}
        onSave={handleAddGift}
      />
      <AddConnectionModal
        isOpen={showConnectionModal}
        onClose={() => setShowConnectionModal(false)}
        currentPerson={person}
        availablePeople={allPeople}
        onSave={handleAddConnection}
      />
    </div>
  );
};
