import React, { useState, useMemo } from 'react';
import { PersonWithComputed, CircleType, CIRCLE_ORDER, CIRCLE_LABELS } from '@shared/types';
import { Avatar } from '../common/Avatar';
import { CircleBadge } from '../common/CircleBadge';
import { StatusBadge } from '../common/StatusBadge';
import { Search, Filter, Plus, Upload, Edit, Trash2, Tag, Calendar, Building2, Mail, MapPin } from 'lucide-react';

interface PeopleTableProps {
  people: PersonWithComputed[];
  onSelectPerson: (person: PersonWithComputed) => void;
  onAddPerson: () => void;
  onEditPerson: (person: PersonWithComputed) => void;
  onDeletePerson: (person: PersonWithComputed) => void;
  onOpenImport: () => void;
  selectedCircle: CircleType | 'all';
  onSelectCircle: (circle: CircleType | 'all') => void;
  selectedTag: string | 'all';
  onSelectTag: (tag: string | 'all') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const PeopleTable: React.FC<PeopleTableProps> = ({
  people,
  onSelectPerson,
  onAddPerson,
  onEditPerson,
  onDeletePerson,
  onOpenImport,
  selectedCircle,
  onSelectCircle,
  selectedTag,
  onSelectTag,
  searchQuery,
  onSearchChange,
}) => {
  // Collect all unique tags from people
  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    people.forEach((p) => p.tags?.forEach((t: string) => tagsSet.add(t)));
    return Array.from(tagsSet).sort();
  }, [people]);

  // Client-side filtering
  const filteredPeople = useMemo(() => {
    return people.filter((p) => {
      // Circle filter
      if (selectedCircle !== 'all' && p.circle !== selectedCircle) return false;

      // Tag filter
      if (selectedTag !== 'all' && !p.tags?.includes(selectedTag)) return false;

      // Search filter (name, company, email, city, job_title, tags)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesCompany = Boolean(p.company && p.company.toLowerCase().includes(q));
        const matchesEmail = Boolean(p.email && p.email.toLowerCase().includes(q));
        const matchesCity = Boolean(p.city && p.city.toLowerCase().includes(q));
        const matchesJob = Boolean(p.job_title && p.job_title.toLowerCase().includes(q));
        const matchesTags = Boolean(p.tags?.some((t: string) => t.toLowerCase().includes(q)));
        if (!matchesName && !matchesCompany && !matchesEmail && !matchesCity && !matchesJob && !matchesTags) {
          return false;
        }
      }

      return true;
    });
  }, [people, selectedCircle, selectedTag, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Action Bar & Controls */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name, company, email, city..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#209dd7] focus:border-[#209dd7] bg-white"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Circle Filter */}
          <div className="flex items-center gap-1">
            <select
              value={selectedCircle}
              onChange={(e) => onSelectCircle(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#209dd7]"
            >
              <option value="all">All Circles</option>
              {CIRCLE_ORDER.map((c: CircleType) => (
                <option key={c} value={c}>
                  {CIRCLE_LABELS[c]}
                </option>
              ))}
            </select>
          </div>

          {/* Tag Filter */}
          {allTags.length > 0 && (
            <div className="flex items-center gap-1">
              <select
                value={selectedTag}
                onChange={(e) => onSelectTag(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#209dd7]"
              >
                <option value="all">All Tags</option>
                {allTags.map((tag) => (
                  <option key={tag} value={tag}>
                    #{tag}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Import Button */}
          <button
            onClick={onOpenImport}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors shadow-sm"
            title="Import from CSV or vCard"
          >
            <Upload className="w-4 h-4 text-gray-500" />
            <span className="hidden sm:inline">Import</span>
          </button>

          {/* Add Person Button */}
          <button
            onClick={onAddPerson}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#209dd7] hover:bg-[#1a82b3] text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Person</span>
          </button>
        </div>
      </div>

      {/* People Table Container */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50/80">
              <tr>
                <th scope="col" className="px-6 py-3.5 font-semibold text-gray-700">
                  Person
                </th>
                <th scope="col" className="px-6 py-3.5 font-semibold text-gray-700">
                  Company / Role
                </th>
                <th scope="col" className="px-6 py-3.5 font-semibold text-gray-700">
                  Circle & Status
                </th>
                <th scope="col" className="px-6 py-3.5 font-semibold text-gray-700">
                  Last Contacted
                </th>
                <th scope="col" className="px-6 py-3.5 font-semibold text-gray-700">
                  Latest News
                </th>
                <th scope="col" className="px-6 py-3.5 text-right font-semibold text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredPeople.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <div className="max-w-sm mx-auto">
                      <p className="font-semibold text-gray-800 text-base">No people found</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {searchQuery || selectedCircle !== 'all' || selectedTag !== 'all'
                          ? 'Try adjusting your search query or filters.'
                          : 'Get started by adding your first contact or importing a file.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPeople.map((person) => (
                  <tr
                    key={person.id}
                    onClick={() => onSelectPerson(person)}
                    className="hover:bg-gray-50/80 cursor-pointer transition-colors group"
                  >
                    {/* Person / Photo / Name / City */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <Avatar name={person.name} photoUrl={person.photo_url} size="md" />
                        <div>
                          <div className="font-semibold text-gray-900 group-hover:text-[#209dd7] transition-colors">
                            {person.name}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                            {person.city && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-gray-400" />
                                {person.city}
                              </span>
                            )}
                            {person.email && !person.city && (
                              <span className="text-gray-400 truncate max-w-[150px]">
                                {person.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Company & Job Title */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-gray-900 font-medium">
                        {person.company || '—'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {person.job_title || ''}
                      </div>
                    </td>

                    {/* Circle & Status */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col items-start gap-1">
                        <CircleBadge circle={person.circle} />
                        <StatusBadge
                          status={person.status}
                          daysOverdue={person.days_overdue}
                          daysUntilDue={person.days_until_due}
                          snoozeUntil={person.snooze_until}
                          size="sm"
                        />
                      </div>
                    </td>

                    {/* Last Contacted */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {person.last_contacted ? (
                        <span className="font-medium">{person.last_contacted}</span>
                      ) : (
                        <span className="text-gray-400 italic">Never</span>
                      )}
                    </td>

                    {/* Latest News */}
                    <td className="px-6 py-4 max-w-xs truncate text-sm text-gray-600">
                      {person.latest_news ? (
                        <span title={person.latest_news.content} className="text-gray-800">
                          {person.latest_news.content}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onEditPerson(person)}
                          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Edit Person"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeletePerson(person)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Person"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        <div className="px-6 py-3 bg-gray-50/50 border-t border-gray-100 text-xs text-gray-500 flex justify-between items-center">
          <span>
            Showing <strong className="text-gray-800">{filteredPeople.length}</strong> of{' '}
            <strong className="text-gray-800">{people.length}</strong> people
          </span>
          {selectedCircle !== 'all' && (
            <span className="font-medium text-gray-600">Filtered by {CIRCLE_LABELS[selectedCircle]}</span>
          )}
        </div>
      </div>
    </div>
  );
};
