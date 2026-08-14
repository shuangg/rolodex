import React, { useState, useEffect, useCallback } from 'react';
import {
  Person,
  PersonWithComputed,
  ImportantDate,
  Reminder,
  TimelineItem,
  CircleType,
  InteractionType,
} from '@shared/types';
import { api } from './api/client';
import { Navbar, NavTab } from './components/layout/Navbar';
import { TodayView } from './components/today/TodayView';
import { PeopleTable } from './components/people/PeopleTable';
import { CirclesBoard } from './components/circles/CirclesBoard';
import { CalendarView } from './components/calendar/CalendarView';
import { GlobalTimelineView } from './components/timeline/GlobalTimelineView';
import { PersonDetailView } from './components/people/PersonDetailView';
import { PersonModal } from './components/people/PersonModal';
import { ImportModal } from './components/people/ImportModal';
import { ParsedContact } from './utils/importer';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('today');
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  // App Data
  const [people, setPeople] = useState<PersonWithComputed[]>([]);
  const [importantDates, setImportantDates] = useState<(ImportantDate & { person_name: string; person_photo?: string | null })[]>([]);
  const [reminders, setReminders] = useState<(Reminder & { person_name: string; person_photo?: string | null })[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters for People table
  const [peopleCircleFilter, setPeopleCircleFilter] = useState<CircleType | 'all'>('all');
  const [peopleTagFilter, setPeopleTagFilter] = useState<string | 'all'>('all');
  const [peopleSearchQuery, setPeopleSearchQuery] = useState('');

  // Filters for Global Timeline
  const [timelinePersonFilter, setTimelinePersonFilter] = useState<string | 'all'>('all');
  const [timelineTypeFilter, setTimelineTypeFilter] = useState<string>('all');

  // Modals
  const [isPersonModalOpen, setIsPersonModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<PersonWithComputed | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Load all core data
  const loadData = useCallback(async () => {
    try {
      const [peopleData, datesData, remindersData, timelineData] = await Promise.all([
        api.getPeople(),
        api.getAllImportantDates(),
        api.getAllReminders(),
        api.getTimeline({
          person_id: timelinePersonFilter !== 'all' ? timelinePersonFilter : undefined,
          type: timelineTypeFilter !== 'all' ? timelineTypeFilter : undefined,
        }),
      ]);

      setPeople(peopleData);
      setImportantDates(datesData);
      setReminders(remindersData);
      setTimeline(timelineData);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, [timelinePersonFilter, timelineTypeFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Selected Person object
  const selectedPerson = people.find((p) => p.id === selectedPersonId) || null;

  // Handlers
  const handleSelectTab = (tab: NavTab) => {
    setActiveTab(tab);
    setSelectedPersonId(null);
  };

  const handleOpenPerson = (personId: string) => {
    setSelectedPersonId(personId);
  };

  const handleCreateOrUpdatePerson = async (personData: Partial<Person>) => {
    if (editingPerson) {
      await api.updatePerson(editingPerson.id, personData);
    } else {
      await api.createPerson(personData as any);
    }
    await loadData();
    setIsPersonModalOpen(false);
    setEditingPerson(null);
  };

  const handleDeletePerson = async (person: PersonWithComputed) => {
    if (confirm(`Are you sure you want to delete ${person.name}? This will remove all their interactions, facts, and connections.`)) {
      await api.deletePerson(person.id);
      if (selectedPersonId === person.id) {
        setSelectedPersonId(null);
      }
      await loadData();
    }
  };

  const handleUpdatePersonCircle = async (personId: string, newCircle: CircleType) => {
    await api.updatePerson(personId, { circle: newCircle });
    await loadData();
  };

  const handleImportContacts = async (
    contacts: ParsedContact[],
    action: 'skip_duplicates' | 'overwrite_duplicates' | 'create_all'
  ) => {
    await api.importPeople(contacts, action);
    await loadData();
  };

  const handleLogInteraction = async (
    personId: string,
    data: { type: InteractionType; date: string; notes?: string }
  ) => {
    await api.createInteraction({ person_id: personId, ...data });
    await loadData();
  };

  const handleToggleReminder = async (rem: Reminder) => {
    await api.updateReminder(rem.id, { completed: !rem.completed });
    await loadData();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Navbar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onNewPerson={() => {
          setEditingPerson(null);
          setIsPersonModalOpen(true);
        }}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="py-24 text-center">
            <div className="inline-block w-8 h-8 border-4 border-[#209dd7] border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm font-medium text-gray-500">Loading your Rolodex...</p>
          </div>
        ) : selectedPerson ? (
          <PersonDetailView
            person={selectedPerson}
            allPeople={people}
            onBack={() => setSelectedPersonId(null)}
            onEdit={(p) => {
              setEditingPerson(p);
              setIsPersonModalOpen(true);
            }}
            onDelete={handleDeletePerson}
            onNavigateToPerson={(pId) => setSelectedPersonId(pId)}
            onRefreshData={loadData}
          />
        ) : (
          <>
            {activeTab === 'today' && (
              <TodayView
                people={people}
                importantDates={importantDates}
                reminders={reminders}
                timeline={timeline}
                onSelectPerson={handleOpenPerson}
                onLogInteraction={handleLogInteraction}
                onToggleReminder={handleToggleReminder}
              />
            )}

            {activeTab === 'people' && (
              <PeopleTable
                people={people}
                onSelectPerson={(p) => handleOpenPerson(p.id)}
                onAddPerson={() => {
                  setEditingPerson(null);
                  setIsPersonModalOpen(true);
                }}
                onEditPerson={(p) => {
                  setEditingPerson(p);
                  setIsPersonModalOpen(true);
                }}
                onDeletePerson={handleDeletePerson}
                onOpenImport={() => setIsImportModalOpen(true)}
                selectedCircle={peopleCircleFilter}
                onSelectCircle={setPeopleCircleFilter}
                selectedTag={peopleTagFilter}
                onSelectTag={setPeopleTagFilter}
                searchQuery={peopleSearchQuery}
                onSearchChange={setPeopleSearchQuery}
              />
            )}

            {activeTab === 'circles' && (
              <CirclesBoard
                people={people}
                onSelectPerson={(p) => handleOpenPerson(p.id)}
                onUpdatePersonCircle={handleUpdatePersonCircle}
              />
            )}

            {activeTab === 'calendar' && (
              <CalendarView
                dates={importantDates}
                people={people}
                onSelectPerson={handleOpenPerson}
              />
            )}

            {activeTab === 'timeline' && (
              <GlobalTimelineView
                timeline={timeline}
                people={people}
                onSelectPerson={handleOpenPerson}
                selectedPersonId={timelinePersonFilter}
                onSelectPersonFilter={setTimelinePersonFilter}
                selectedType={timelineTypeFilter}
                onSelectTypeFilter={setTimelineTypeFilter}
              />
            )}
          </>
        )}
      </main>

      {/* Add / Edit Person Modal */}
      <PersonModal
        isOpen={isPersonModalOpen}
        onClose={() => {
          setIsPersonModalOpen(false);
          setEditingPerson(null);
        }}
        onSave={handleCreateOrUpdatePerson}
        initialPerson={editingPerson}
      />

      {/* Import Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        existingPeople={people}
        onImport={handleImportContacts}
      />
    </div>
  );
};
