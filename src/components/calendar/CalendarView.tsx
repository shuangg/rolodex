import React, { useState } from 'react';
import { ImportantDate, PersonWithComputed, Person } from '@shared/types';
import { Avatar } from '../common/Avatar';
import { IMPORTANT_DATE_LABELS, isLeapYear, getValidDateForYear } from '@shared/dates';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Cake, Heart, Briefcase, Sparkles } from 'lucide-react';

interface CalendarViewProps {
  dates: (ImportantDate & { person_name: string; person_photo?: string | null })[];
  people: Person[];
  onSelectPerson: (personId: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  dates,
  people,
  onSelectPerson,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed (0 = Jan, 11 = Dec)

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Grid calculation
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon ...
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Calendar cells calculation (using Monday as start of week)
  // Monday = 0, Sunday = 6
  const startDayOffset = (firstDayOfMonth + 6) % 7;

  const totalCells = Math.ceil((startDayOffset + daysInMonth) / 7) * 7;

  // Filter dates relevant for this month (1-indexed month)
  const targetMonthNum = month + 1;

  // Map dates by day in current month
  const eventsByDay: Record<number, Array<ImportantDate & { person_name: string; person_photo?: string | null; isLeapHandled?: boolean }>> = {};

  for (let d = 1; d <= 31; d++) {
    eventsByDay[d] = [];
  }

  const isCurrentYearLeap = isLeapYear(year);

  for (const item of dates) {
    if (item.month === targetMonthNum) {
      // If it's Feb 29 in a non-leap year, place it on Feb 28
      if (item.month === 2 && item.day === 29 && !isCurrentYearLeap) {
        eventsByDay[28].push({ ...item, isLeapHandled: true });
      } else if (item.day <= 31) {
        eventsByDay[item.day].push(item);
      }
    }
  }

  const today = new Date();
  const isCurrentMonthThisMonth =
    today.getFullYear() === year && today.getMonth() === month;

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'birthday':
        return <Cake className="w-3 h-3 text-[#ecad0a]" />;
      case 'anniversary':
        return <Heart className="w-3 h-3 text-rose-500" />;
      case 'work_anniversary':
        return <Briefcase className="w-3 h-3 text-[#209dd7]" />;
      default:
        return <Sparkles className="w-3 h-3 text-[#753991]" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Month Navigation Header */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sky-50 border border-sky-200 text-[#209dd7]">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {monthNames[month]} {year}
            </h2>
            <p className="text-xs text-gray-500">
              Birthdays, anniversaries, and key milestones
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleToday}
            className="px-3.5 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Today
          </button>
          <button
            onClick={handleNextMonth}
            className="p-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Days of week header */}
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50/80 text-center py-2.5 text-xs font-bold text-gray-700 uppercase tracking-wider">
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
          <div>Sun</div>
        </div>

        {/* Days Grid Cells */}
        <div className="grid grid-cols-7 divide-x divide-y divide-gray-100 min-h-[600px]">
          {Array.from({ length: totalCells }).map((_, idx) => {
            const dayNum = idx - startDayOffset + 1;
            const isPrevMonthDay = dayNum <= 0;
            const isNextMonthDay = dayNum > daysInMonth;
            const isCurrentMonth = !isPrevMonthDay && !isNextMonthDay;

            const displayDay = isPrevMonthDay
              ? daysInPrevMonth + dayNum
              : isNextMonthDay
              ? dayNum - daysInMonth
              : dayNum;

            const isTodayCell = isCurrentMonthThisMonth && isCurrentMonth && displayDay === today.getDate();
            const dayEvents = isCurrentMonth ? eventsByDay[dayNum] || [] : [];

            return (
              <div
                key={idx}
                className={`p-2 min-h-[100px] flex flex-col justify-between transition-colors ${
                  !isCurrentMonth
                    ? 'bg-gray-50/40 text-gray-400'
                    : isTodayCell
                    ? 'bg-sky-50/30'
                    : 'bg-white hover:bg-gray-50/50'
                }`}
              >
                {/* Day Number */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-semibold rounded-full w-6 h-6 flex items-center justify-center ${
                      isTodayCell
                        ? 'bg-[#209dd7] text-white font-bold shadow-xs'
                        : isCurrentMonth
                        ? 'text-gray-800'
                        : 'text-gray-400'
                    }`}
                  >
                    {displayDay}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="text-[10px] font-bold text-gray-400">
                      {dayEvents.length}
                    </span>
                  )}
                </div>

                {/* Event Cards */}
                <div className="mt-1 space-y-1 flex-1">
                  {dayEvents.map((evt) => {
                    let ageTurning: number | null = null;
                    let isMilestone = false;
                    if (evt.year) {
                      ageTurning = year - evt.year;
                      if (evt.type === 'birthday' && ageTurning > 0 && ageTurning % 10 === 0) {
                        isMilestone = true;
                      }
                    }

                    return (
                      <div
                        key={evt.id}
                        onClick={() => onSelectPerson(evt.person_id)}
                        className={`p-1.5 rounded-lg border text-left cursor-pointer transition-all hover:shadow-sm ${
                          isMilestone
                            ? 'bg-amber-50/80 border-amber-300 text-amber-950 font-semibold ring-1 ring-amber-300'
                            : 'bg-white border-gray-200 text-gray-800 hover:border-[#209dd7]'
                        }`}
                        title={`${evt.person_name} - ${evt.title || IMPORTANT_DATE_LABELS[evt.type]} ${
                          ageTurning ? `(Turning ${ageTurning})` : ''
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Avatar name={evt.person_name} photoUrl={evt.person_photo} size="xs" />
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-bold truncate leading-tight">
                              {evt.person_name}
                            </p>
                            <div className="flex items-center gap-1 text-[10px] text-gray-500 truncate mt-0.5">
                              {getEventIcon(evt.type)}
                              <span>
                                {evt.type === 'birthday' ? 'Birthday' : evt.title || IMPORTANT_DATE_LABELS[evt.type]}
                              </span>
                              {ageTurning && (
                                <span className={isMilestone ? 'text-[#ecad0a] font-extrabold' : 'text-gray-500'}>
                                  ({ageTurning})
                                </span>
                              )}
                              {evt.isLeapHandled && (
                                <span className="text-purple-600 font-semibold" title="Leap day birthday">
                                  [Feb 29]
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
