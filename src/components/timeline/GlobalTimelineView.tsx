import React, { useState } from 'react';
import { TimelineItem, Person } from '@shared/types';
import { Avatar } from '../common/Avatar';
import { History, Filter, Phone, MessageSquare, Mail, Coffee, Users, Sparkles, CheckSquare } from 'lucide-react';

interface GlobalTimelineViewProps {
  timeline: TimelineItem[];
  people: Person[];
  onSelectPerson: (personId: string) => void;
  selectedPersonId: string | 'all';
  onSelectPersonFilter: (personId: string | 'all') => void;
  selectedType: string;
  onSelectTypeFilter: (type: string) => void;
}

export const GlobalTimelineView: React.FC<GlobalTimelineViewProps> = ({
  timeline,
  people,
  onSelectPerson,
  selectedPersonId,
  onSelectPersonFilter,
  selectedType,
  onSelectTypeFilter,
}) => {
  const getItemIcon = (item: TimelineItem) => {
    if (item.type === 'news') {
      return <Sparkles className="w-4 h-4 text-[#ecad0a]" />;
    }
    if (item.type === 'reminder_completed') {
      return <CheckSquare className="w-4 h-4 text-emerald-600" />;
    }
    switch (item.interaction_type) {
      case 'call':
        return <Phone className="w-4 h-4 text-[#209dd7]" />;
      case 'message':
        return <MessageSquare className="w-4 h-4 text-emerald-600" />;
      case 'email':
        return <Mail className="w-4 h-4 text-[#753991]" />;
      case 'meetup':
        return <Coffee className="w-4 h-4 text-amber-600" />;
      default:
        return <Users className="w-4 h-4 text-gray-500" />;
    }
  };

  const getItemCategoryLabel = (item: TimelineItem) => {
    if (item.type === 'news') return 'Life Update';
    if (item.type === 'reminder_completed') return 'Task Completed';
    return `${item.interaction_type || 'interaction'} logged`;
  };

  return (
    <div className="space-y-4">
      {/* Filters header */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-50 border border-purple-200 text-[#753991]">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Global Timeline</h2>
            <p className="text-xs text-gray-500">
              Everything that has happened across your entire network, newest first
            </p>
          </div>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Person Filter */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase">Person:</label>
            <select
              value={selectedPersonId}
              onChange={(e) => onSelectPersonFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#209dd7]"
            >
              <option value="all">All People ({people.length})</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase">Type:</label>
            <select
              value={selectedType}
              onChange={(e) => onSelectTypeFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#209dd7]"
            >
              <option value="all">All Activity Types</option>
              <option value="interaction">Interactions Only</option>
              <option value="news">News / Updates Only</option>
              <option value="reminder_completed">Completed Reminders</option>
            </select>
          </div>
        </div>
      </div>

      {/* Timeline Stream */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        {timeline.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <p className="text-base font-semibold text-gray-800">No activity matches the selected filters.</p>
            <p className="text-sm text-gray-500 mt-1">
              Try switching your filters back to All People or All Activity Types.
            </p>
          </div>
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-gray-200">
            {timeline.map((item) => (
              <div
                key={item.id}
                className="relative flex items-start gap-4 group cursor-pointer"
                onClick={() => onSelectPerson(item.person_id)}
              >
                {/* Node dot on timeline line */}
                <div className="absolute -left-6 mt-1 w-6 h-6 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center group-hover:border-[#209dd7] transition-colors shadow-2xs">
                  <div className="w-2 h-2 rounded-full bg-gray-400 group-hover:bg-[#209dd7]" />
                </div>

                {/* Content card */}
                <div className="flex-1 bg-gray-50/70 hover:bg-white p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <Avatar name={item.person_name} photoUrl={item.person_photo} size="xs" />
                      <span className="font-bold text-gray-900 text-sm group-hover:text-[#209dd7] transition-colors">
                        {item.person_name}
                      </span>
                      <span className="text-gray-300">•</span>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {getItemIcon(item)}
                        <span>{getItemCategoryLabel(item)}</span>
                      </span>
                    </div>

                    <span className="text-xs font-medium text-gray-500">{item.date}</span>
                  </div>

                  <p className="text-sm text-gray-800 font-medium">{item.title}</p>
                  {item.notes && (
                    <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap bg-white p-2 rounded border border-gray-100">
                      {item.notes}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
