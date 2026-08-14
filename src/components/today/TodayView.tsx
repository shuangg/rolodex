import React, { useState, useMemo } from 'react';
import {
  PersonWithComputed,
  ImportantDate,
  Reminder,
  TimelineItem,
  CircleType,
  CIRCLE_ORDER,
  CIRCLE_LABELS,
  InteractionType,
} from '@shared/types';
import { Avatar } from '../common/Avatar';
import { CircleBadge } from '../common/CircleBadge';
import { StatusBadge } from '../common/StatusBadge';
import { getNextOccurrence, IMPORTANT_DATE_LABELS } from '@shared/dates';
import { LogInteractionModal } from '../people/submodals';
import {
  Sparkles,
  Phone,
  AlertCircle,
  Calendar as CalendarIcon,
  CheckSquare,
  History,
  Cake,
  Heart,
  Briefcase,
  ChevronRight,
  BarChart3,
  Clock,
  CheckCircle2,
  Circle,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

interface TodayViewProps {
  people: PersonWithComputed[];
  importantDates: (ImportantDate & { person_name: string; person_photo?: string | null })[];
  reminders: (Reminder & { person_name: string; person_photo?: string | null })[];
  timeline: TimelineItem[];
  onSelectPerson: (personId: string) => void;
  onLogInteraction: (personId: string, data: { type: InteractionType; date: string; notes?: string }) => Promise<void>;
  onToggleReminder: (reminder: Reminder) => Promise<void>;
}

export const TodayView: React.FC<TodayViewProps> = ({
  people,
  importantDates,
  reminders,
  timeline,
  onSelectPerson,
  onLogInteraction,
  onToggleReminder,
}) => {
  const [activeLogPerson, setActiveLogPerson] = useState<PersonWithComputed | null>(null);

  // 1. Who to contact: people due and overdue, most overdue first
  const whoToContact = useMemo(() => {
    const dueAndOverdue = people.filter(
      (p) => p.status === 'overdue' || p.status === 'due_soon'
    );

    return dueAndOverdue.sort((a, b) => {
      // Overdue first
      if (a.status === 'overdue' && b.status !== 'overdue') return -1;
      if (b.status === 'overdue' && a.status !== 'overdue') return 1;

      // If both overdue, highest days_overdue first
      if (a.status === 'overdue' && b.status === 'overdue') {
        return (b.days_overdue || 0) - (a.days_overdue || 0);
      }

      // If both due soon, smallest days_until_due first
      return (a.days_until_due || 0) - (b.days_until_due || 0);
    });
  }, [people]);

  // 2. Upcoming birthdays and dates in the next 30 days
  const upcomingDates = useMemo(() => {
    return importantDates
      .map((d) => ({
        ...d,
        occurrence: getNextOccurrence(d),
      }))
      .filter((d) => d.occurrence.daysUntil >= 0 && d.occurrence.daysUntil <= 30)
      .sort((a, b) => a.occurrence.daysUntil - b.occurrence.daysUntil);
  }, [importantDates]);

  // 3. Reminders due and overdue (uncompleted)
  const dueReminders = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return reminders
      .filter((r) => !r.completed)
      .sort((a, b) => a.due_date.localeCompare(b.due_date));
  }, [reminders]);

  // 4. Recent activity (top 6 global items)
  const recentActivity = useMemo(() => {
    return timeline.slice(0, 6);
  }, [timeline]);

  // 5. Chart 1: Interactions per Month
  const interactionsPerMonthData = useMemo(() => {
    const monthsMap: Record<string, number> = {};
    const now = new Date();

    // Prepare last 6 months keys YYYY-MM
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en-US', { month: 'short' });
      monthsMap[key] = 0;
    }

    const interactionTimeline = timeline.filter((t) => t.type === 'interaction');
    for (const item of interactionTimeline) {
      const monthKey = item.date.slice(0, 7);
      if (monthsMap[monthKey] !== undefined) {
        monthsMap[monthKey]++;
      }
    }

    return Object.entries(monthsMap).map(([key, count]) => {
      const [y, m] = key.split('-').map(Number);
      const d = new Date(y, m - 1, 1);
      return {
        month: d.toLocaleString('en-US', { month: 'short' }),
        interactions: count,
      };
    });
  }, [timeline]);

  // 6. Chart 2: People per Circle with Overdue Breakdown
  const circleBreakdownData = useMemo(() => {
    return CIRCLE_ORDER.map((circle: CircleType) => {
      const circlePeople = people.filter((p) => p.circle === circle);
      const overduePeople = circlePeople.filter((p) => p.status === 'overdue');
      const inTouchOrDue = circlePeople.length - overduePeople.length;

      return {
        circle: CIRCLE_LABELS[circle].split(' ')[0], // Inner, Close, Wider, Distant
        onTrack: inTouchOrDue,
        overdue: overduePeople.length,
        total: circlePeople.length,
      };
    });
  }, [people]);

  return (
    <div className="space-y-8">
      {/* SECTION 1: PROMINENT HERO — WHO TO CONTACT */}
      <section className="bg-white rounded-2xl border-2 border-gray-200 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-[#ecad0a] animate-pulse" />
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
                Who Needs Your Attention
              </h2>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              People you are due or overdue to reach out to, sorted by highest priority.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
              {whoToContact.filter((p) => p.status === 'overdue').length} Overdue
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
              {whoToContact.filter((p) => p.status === 'due_soon').length} Due Soon
            </span>
          </div>
        </div>

        {/* List of Who to Contact */}
        {whoToContact.length === 0 ? (
          <div className="py-12 text-center text-gray-600 bg-gray-50/50 rounded-xl my-4 border border-dashed border-gray-200">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
            <h4 className="text-base font-bold text-gray-800">You are all caught up!</h4>
            <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
              There is currently no one due or overdue for a check-in. Every relationship is right on cadence.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 mt-2">
            {whoToContact.map((person) => (
              <div
                key={person.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/60 p-3 rounded-xl transition-colors cursor-pointer group"
                onClick={() => onSelectPerson(person.id)}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <Avatar name={person.name} photoUrl={person.photo_url} size="lg" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-gray-900 group-hover:text-[#209dd7] transition-colors truncate">
                        {person.name}
                      </h3>
                      <CircleBadge circle={person.circle} short />
                      <StatusBadge
                        status={person.status}
                        daysOverdue={person.days_overdue}
                        daysUntilDue={person.days_until_due}
                        snoozeUntil={person.snooze_until}
                        size="sm"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-gray-500 mt-1">
                      {person.company && <span className="font-medium text-gray-700">{person.company}</span>}
                      {person.last_contacted ? (
                        <span>Last spoke: {person.last_contacted}</span>
                      ) : (
                        <span className="italic text-gray-400">Never contacted</span>
                      )}
                      {person.latest_news && (
                        <span className="text-gray-600 truncate max-w-xs font-medium">
                          • News: "{person.latest_news.content}"
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick 1-click log action */}
                <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setActiveLogPerson(person)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#209dd7] hover:bg-[#1a82b3] text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Log Touchpoint</span>
                  </button>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#209dd7] transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 2: GRID OF TODAY'S WIDGETS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* WIDGET 1: UPCOMING BIRTHDAYS & DATES (NEXT 30 DAYS) */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-[#ecad0a]">
                  <Cake className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Important Dates</h3>
                  <p className="text-xs text-gray-500">Upcoming in the next 30 days</p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                {upcomingDates.length}
              </span>
            </div>

            {upcomingDates.length === 0 ? (
              <div className="py-8 text-center text-gray-400">
                <p className="text-sm font-medium">No dates or birthdays in the next 30 days.</p>
                <p className="text-xs text-gray-400 mt-0.5">Check the Calendar section for later dates.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 mt-2">
                {upcomingDates.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onSelectPerson(item.person_id)}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-gray-50/70 p-2 rounded-lg transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={item.person_name} photoUrl={item.person_photo} size="sm" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-gray-900 group-hover:text-[#209dd7] transition-colors truncate">
                            {item.person_name}
                          </p>
                          {item.occurrence.isMilestone && (
                            <span className="px-1.5 py-0.5 rounded bg-[#ecad0a] text-white text-[10px] font-extrabold uppercase">
                              ★ Milestone
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {item.title || IMPORTANT_DATE_LABELS[item.type]}
                          {item.occurrence.turningAge && ` (Turning ${item.occurrence.turningAge})`}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-[#ecad0a] bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        {item.occurrence.daysUntil === 0
                          ? 'Today!'
                          : `in ${item.occurrence.daysUntil} day${item.occurrence.daysUntil > 1 ? 's' : ''}`}
                      </span>
                      <p className="text-[11px] text-gray-400 mt-0.5">{item.occurrence.dateString}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* WIDGET 2: DUE & OVERDUE REMINDERS */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-sky-50 border border-sky-200 text-[#209dd7]">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Reminders & Tasks</h3>
                  <p className="text-xs text-gray-500">Outstanding tasks needing completion</p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                {dueReminders.length}
              </span>
            </div>

            {dueReminders.length === 0 ? (
              <div className="py-8 text-center text-gray-400">
                <p className="text-sm font-medium">All reminders are completed.</p>
                <p className="text-xs text-gray-400 mt-0.5">No overdue or pending tasks on your list.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 mt-2">
                {dueReminders.map((rem) => {
                  const todayStr = new Date().toISOString().slice(0, 10);
                  const isOverdue = rem.due_date < todayStr;
                  return (
                    <div
                      key={rem.id}
                      className="py-3 flex items-center justify-between gap-3 hover:bg-gray-50/70 p-2 rounded-lg transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          onClick={() => onToggleReminder(rem)}
                          className="text-gray-300 hover:text-[#209dd7] transition-colors focus:outline-none shrink-0"
                          title="Mark complete"
                        >
                          <Circle className="w-5 h-5" />
                        </button>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {rem.title}
                          </p>
                          <button
                            onClick={() => onSelectPerson(rem.person_id)}
                            className="text-xs text-gray-500 hover:text-[#209dd7] transition-colors truncate block text-left"
                          >
                            For {rem.person_name}
                          </button>
                        </div>
                      </div>

                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded shrink-0 ${
                          isOverdue
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-gray-100 text-gray-700 border border-gray-200'
                        }`}
                      >
                        {isOverdue ? `Overdue (${rem.due_date})` : `Due: ${rem.due_date}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 3: CHARTS & RECENT ACTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CHART 1: INTERACTIONS LOGGED PER MONTH */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Touchpoints per Month</h3>
              <p className="text-[11px] text-gray-500">Logged interactions over last 6 months</p>
            </div>
            <TrendingUp className="w-4 h-4 text-[#209dd7]" />
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={interactionsPerMonthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Bar dataKey="interactions" fill="#209dd7" radius={[4, 4, 0, 0]} name="Interactions" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: PEOPLE PER CIRCLE & OVERDUE BREAKDOWN */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Circle Health</h3>
              <p className="text-[11px] text-gray-500">On track vs Overdue by circle</p>
            </div>
            <BarChart3 className="w-4 h-4 text-[#753991]" />
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={circleBreakdownData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="circle" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                <Bar dataKey="onTrack" fill="#209dd7" stackId="a" name="On Track" radius={[0, 0, 0, 0]} />
                <Bar dataKey="overdue" fill="#f43f5e" stackId="a" name="Overdue" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* RECENT ACTIVITY FEED */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Recent Activity</h3>
              <p className="text-[11px] text-gray-500">Latest feed across all people</p>
            </div>
            <History className="w-4 h-4 text-gray-400" />
          </div>

          {recentActivity.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-xs">
              No recent activity recorded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectPerson(item.person_id)}
                  className="flex items-start gap-2.5 p-1.5 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group"
                >
                  <Avatar name={item.person_name} photoUrl={item.person_photo} size="xs" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-gray-900 group-hover:text-[#209dd7] transition-colors truncate">
                      {item.person_name}
                    </p>
                    <p className="text-[11px] text-gray-600 truncate">{item.title}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{item.date}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Log Interaction Modal */}
      {activeLogPerson && (
        <LogInteractionModal
          isOpen={Boolean(activeLogPerson)}
          onClose={() => setActiveLogPerson(null)}
          person={activeLogPerson}
          onSave={async (data) => {
            await onLogInteraction(activeLogPerson.id, data);
            setActiveLogPerson(null);
          }}
        />
      )}
    </div>
  );
};
