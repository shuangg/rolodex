import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { CircleType, Person } from '@shared/types';
import { Upload, X, Camera, Plus } from 'lucide-react';
import { Avatar } from '../common/Avatar';

interface PersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (personData: Partial<Person>) => Promise<void>;
  initialPerson?: Person | null;
}

const COMMON_TIMEZONES = [
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Rome',
  'Europe/Stockholm',
  'Europe/Zurich',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Sao_Paulo',
  'America/Mexico_City',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Asia/Hong_Kong',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Africa/Lagos',
  'Africa/Accra',
  'Africa/Casablanca',
  'Africa/Johannesburg',
  'Australia/Sydney',
  'Pacific/Auckland',
];

export const PersonModal: React.FC<PersonModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialPerson,
}) => {
  const [name, setName] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [city, setCity] = useState('');
  const [timeZone, setTimeZone] = useState('Europe/London');
  const [circle, setCircle] = useState<CircleType>('inner');
  const [cadenceOverrideDays, setCadenceOverrideDays] = useState<string>('');
  const [checkInsEnabled, setCheckInsEnabled] = useState(true);
  const [snoozeUntil, setSnoozeUntil] = useState('');
  const [howWeMet, setHowWeMet] = useState('');
  const [notes, setNotes] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialPerson) {
      setName(initialPerson.name || '');
      setPhotoUrl(initialPerson.photo_url || null);
      setEmail(initialPerson.email || '');
      setPhone(initialPerson.phone || '');
      setJobTitle(initialPerson.job_title || '');
      setCompany(initialPerson.company || '');
      setCity(initialPerson.city || '');
      setTimeZone(initialPerson.time_zone || 'Europe/London');
      setCircle(initialPerson.circle || 'inner');
      setCadenceOverrideDays(
        initialPerson.cadence_override_days != null ? String(initialPerson.cadence_override_days) : ''
      );
      setCheckInsEnabled(initialPerson.check_ins_enabled !== false);
      setSnoozeUntil(initialPerson.snooze_until || '');
      setHowWeMet(initialPerson.how_we_met || '');
      setNotes(initialPerson.notes || '');
      setTags(initialPerson.tags || []);
    } else {
      setName('');
      setPhotoUrl(null);
      setEmail('');
      setPhone('');
      setJobTitle('');
      setCompany('');
      setCity('');
      setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/London');
      setCircle('inner');
      setCadenceOverrideDays('');
      setCheckInsEnabled(true);
      setSnoozeUntil('');
      setHowWeMet('');
      setNotes('');
      setTags([]);
    }
    setError(null);
  }, [initialPerson, isOpen]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAddTag = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter' && e.key !== ',') return;
    e.preventDefault();
    const clean = tagInput.trim().replace(/^#/, '').toLowerCase();
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave({
        name: name.trim(),
        photo_url: photoUrl,
        email: email.trim() || null,
        phone: phone.trim() || null,
        job_title: jobTitle.trim() || null,
        company: company.trim() || null,
        city: city.trim() || null,
        time_zone: timeZone || null,
        circle,
        cadence_override_days: cadenceOverrideDays ? parseInt(cadenceOverrideDays, 10) : null,
        check_ins_enabled: checkInsEnabled,
        snooze_until: snoozeUntil || null,
        how_we_met: howWeMet.trim() || null,
        notes: notes.trim() || null,
        tags,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save person');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialPerson ? `Edit ${initialPerson.name}` : 'Add New Person'}
      description={initialPerson ? 'Update contact details and preferences' : 'Add someone new to your Rolodex'}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        {/* Photo & Basic Name */}
        <div className="flex flex-col sm:flex-row items-center gap-6 pb-2">
          <div className="relative group">
            <Avatar name={name || 'New Person'} photoUrl={photoUrl} size="xl" />
            <label className="absolute bottom-0 right-0 p-1.5 bg-gray-900 text-white rounded-full cursor-pointer hover:bg-gray-800 shadow-md transition-all">
              <Camera className="w-4 h-4" />
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>
            {photoUrl && (
              <button
                type="button"
                onClick={() => setPhotoUrl(null)}
                className="absolute -top-1 -right-1 p-1 bg-white border border-gray-300 text-gray-500 rounded-full hover:bg-gray-100 shadow-sm"
                title="Remove photo"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex-1 w-full space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sarah Jenkins"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#209dd7] text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                  Job Title
                </label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Product Designer"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#209dd7] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                  Company / Org
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Figma"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#209dd7] text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Contact info & Location */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. sarah@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#209dd7] text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +44 7700 900123"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#209dd7] text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
              City
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. London"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#209dd7] text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
              Time Zone
            </label>
            <select
              value={timeZone}
              onChange={(e) => setTimeZone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#209dd7] text-sm bg-white"
            >
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Circle and Cadence Configuration */}
        <div className="pt-2 border-t border-gray-100">
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-2">
            Circle & Check-in Cadence
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            {(
              [
                { id: 'inner', name: 'Inner Circle', desc: 'Monthly (30d)' },
                { id: 'close', name: 'Close', desc: 'Quarterly (90d)' },
                { id: 'wider', name: 'Wider', desc: '6 Months (180d)' },
                { id: 'distant', name: 'Distant', desc: 'Yearly (365d)' },
              ] as const
            ).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCircle(c.id)}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  circle === c.id
                    ? 'border-[#209dd7] bg-sky-50 text-sky-950 font-medium ring-1 ring-[#209dd7]'
                    : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                }`}
              >
                <div className="text-xs font-bold">{c.name}</div>
                <div className="text-[11px] text-gray-500 mt-0.5">{c.desc}</div>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                Custom Cadence (Days)
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                value={cadenceOverrideDays}
                onChange={(e) => setCadenceOverrideDays(e.target.value)}
                placeholder="Default"
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:ring-1 focus:ring-[#209dd7]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                Snooze Until Date
              </label>
              <input
                type="date"
                value={snoozeUntil}
                onChange={(e) => setSnoozeUntil(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:ring-1 focus:ring-[#209dd7]"
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <input
                type="checkbox"
                id="checkInsEnabled"
                checked={checkInsEnabled}
                onChange={(e) => setCheckInsEnabled(e.target.checked)}
                className="w-4 h-4 text-[#209dd7] rounded border-gray-300 focus:ring-[#209dd7]"
              />
              <label htmlFor="checkInsEnabled" className="text-xs font-medium text-gray-700 select-none">
                Enable check-ins
              </label>
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="pt-2 border-t border-gray-100">
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
            Tags
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-rose-600 focus:outline-none"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder="Add a tag (e.g. university, cycling) and press enter"
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#209dd7]"
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
            >
              Add
            </button>
          </div>
        </div>

        {/* How we met & Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
              How / Where We Met
            </label>
            <input
              type="text"
              value={howWeMet}
              onChange={(e) => setHowWeMet(e.target.value)}
              placeholder="e.g. Oxford alumni dinner 2019"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#209dd7] text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
              General Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Personal background, interests, coffee preferences..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#209dd7] text-sm resize-none"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 bg-[#209dd7] hover:bg-[#1a82b3] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 shadow-sm"
          >
            {saving ? 'Saving...' : initialPerson ? 'Save Changes' : 'Create Person'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
