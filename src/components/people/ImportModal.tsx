import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Person } from '@shared/types';
import {
  parseCSVContent,
  parseVCardContent,
  detectDuplicates,
  ParsedContact,
  CSVMapping,
  autoDetectCSVMapping,
} from '../../utils/importer';
import { Upload, AlertTriangle, CheckCircle, FileText, ArrowRight } from 'lucide-react';
import { Avatar } from '../common/Avatar';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingPeople: Person[];
  onImport: (contacts: ParsedContact[], action: 'skip_duplicates' | 'overwrite_duplicates' | 'create_all') => Promise<void>;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  existingPeople,
  onImport,
}) => {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [fileType, setFileType] = useState<'csv' | 'vcf' | null>(null);
  const [fileName, setFileName] = useState('');
  const [rawContent, setRawContent] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<CSVMapping>({
    name: '',
    email: '',
    phone: '',
    job_title: '',
    company: '',
    city: '',
    circle: '',
    notes: '',
    tags: '',
  });
  const [parsedContacts, setParsedContacts] = useState<ParsedContact[]>([]);
  const [duplicateAction, setDuplicateAction] = useState<'skip_duplicates' | 'overwrite_duplicates' | 'create_all'>(
    'skip_duplicates'
  );
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetState = () => {
    setStep('upload');
    setFileType(null);
    setFileName('');
    setRawContent('');
    setHeaders([]);
    setParsedContacts([]);
    setDuplicateAction('skip_duplicates');
    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setFileName(file.name);

    const isCsv = file.name.toLowerCase().endsWith('.csv');
    const isVcf = file.name.toLowerCase().endsWith('.vcf') || file.name.toLowerCase().endsWith('.vcard');

    if (!isCsv && !isVcf) {
      setError('Please select a valid .csv or .vcf (vCard) file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRawContent(content);

      if (isCsv) {
        setFileType('csv');
        const parsed = parseCSVContent(content);
        setHeaders(parsed.headers);
        const detected = autoDetectCSVMapping(parsed.headers);
        setMapping(detected);
        setStep('mapping');
      } else {
        setFileType('vcf');
        const contacts = parseVCardContent(content);
        if (contacts.length === 0) {
          setError('No contacts could be found in this vCard file');
          return;
        }
        const withDups = detectDuplicates(contacts, existingPeople);
        setParsedContacts(withDups);
        setStep('preview');
      }
    };
    reader.readAsText(file);
  };

  const handleMappingConfirm = () => {
    if (!mapping.name) {
      setError('You must map at least the Name column');
      return;
    }

    const { contacts } = parseCSVContent(rawContent, mapping);
    if (contacts.length === 0) {
      setError('No valid contacts found with the selected column mapping');
      return;
    }

    const withDups = detectDuplicates(contacts, existingPeople);
    setParsedContacts(withDups);
    setError(null);
    setStep('preview');
  };

  const handleExecuteImport = async () => {
    setImporting(true);
    setError(null);
    try {
      await onImport(parsedContacts, duplicateAction);
      resetState();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to import contacts');
    } finally {
      setImporting(false);
    }
  };

  const duplicateCount = parsedContacts.filter((c) => c.isDuplicate).length;
  const newCount = parsedContacts.length - duplicateCount;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        resetState();
        onClose();
      }}
      title="Import Contacts"
      description="Import people from a CSV or vCard (.vcf) file"
      maxWidth="3xl"
    >
      <div className="space-y-6">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        {/* STEP 1: Upload */}
        {step === 'upload' && (
          <div className="py-8">
            <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-xl hover:border-[#209dd7] hover:bg-sky-50/50 cursor-pointer transition-all text-center">
              <Upload className="w-12 h-12 text-gray-400 mb-3" />
              <span className="text-base font-semibold text-gray-800">
                Choose a CSV or vCard (.vcf) file
              </span>
              <span className="text-sm text-gray-500 mt-1">
                Supports Google Contacts, Apple Contacts, Outlook, or custom CSV exports
              </span>
              <input
                type="file"
                accept=".csv,.vcf,.vcard"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
        )}

        {/* STEP 2: CSV Column Mapping */}
        {step === 'mapping' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                <FileText className="w-4 h-4 text-[#209dd7]" />
                <span>{fileName}</span>
              </div>
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="text-xs text-[#209dd7] hover:underline"
              >
                Choose different file
              </button>
            </div>

            <p className="text-sm text-gray-600">
              Match your CSV headers to Rolodex contact fields:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { key: 'name', label: 'Full Name', required: true },
                { key: 'email', label: 'Email Address' },
                { key: 'phone', label: 'Phone Number' },
                { key: 'job_title', label: 'Job Title' },
                { key: 'company', label: 'Company' },
                { key: 'city', label: 'City' },
                { key: 'circle', label: 'Circle (Inner/Close/Wider/Distant)' },
                { key: 'notes', label: 'Notes' },
                { key: 'tags', label: 'Tags' },
              ].map((field) => (
                <div key={field.key} className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    {field.label} {field.required && <span className="text-rose-500">*</span>}
                  </label>
                  <select
                    value={(mapping as any)[field.key] || ''}
                    onChange={(e) =>
                      setMapping({ ...mapping, [field.key]: e.target.value })
                    }
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#209dd7]"
                  >
                    <option value="">-- Do not import --</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleMappingConfirm}
                className="flex items-center gap-2 px-5 py-2 bg-[#209dd7] hover:bg-[#1a82b3] text-white rounded-lg text-sm font-medium shadow-sm"
              >
                <span>Preview Contacts</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Preview & Duplicate Resolution */}
        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-4 text-sm">
                <div>
                  <span className="font-semibold text-gray-900">{parsedContacts.length}</span> total contacts
                </div>
                <div className="text-emerald-700 font-medium">
                  {newCount} new
                </div>
                {duplicateCount > 0 && (
                  <div className="text-amber-800 font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>{duplicateCount} duplicate{duplicateCount > 1 ? 's' : ''} detected</span>
                  </div>
                )}
              </div>

              {duplicateCount > 0 && (
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-gray-600 uppercase">
                    Resolution:
                  </label>
                  <select
                    value={duplicateAction}
                    onChange={(e) => setDuplicateAction(e.target.value as any)}
                    className="px-2.5 py-1 border border-gray-300 rounded bg-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#209dd7]"
                  >
                    <option value="skip_duplicates">Skip Duplicates ({newCount} to add)</option>
                    <option value="overwrite_duplicates">Update / Merge Duplicates</option>
                    <option value="create_all">Import All (Keep Duplicates)</option>
                  </select>
                </div>
              )}
            </div>

            {/* Preview table */}
            <div className="border border-gray-200 rounded-lg max-h-72 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 font-semibold text-gray-700">Contact</th>
                    <th className="px-3 py-2 font-semibold text-gray-700">Company & Title</th>
                    <th className="px-3 py-2 font-semibold text-gray-700">Circle</th>
                    <th className="px-3 py-2 font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {parsedContacts.map((c, i) => (
                    <tr key={i} className={c.isDuplicate ? 'bg-amber-50/40' : ''}>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Avatar name={c.name} size="xs" />
                          <div>
                            <div className="font-medium text-gray-900">{c.name}</div>
                            {c.email && <div className="text-gray-500 text-[11px]">{c.email}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        <div>{c.job_title || '—'}</div>
                        <div className="text-gray-400 text-[11px]">{c.company || ''}</div>
                      </td>
                      <td className="px-3 py-2 capitalize text-gray-700 font-medium">
                        {c.circle}
                      </td>
                      <td className="px-3 py-2">
                        {c.isDuplicate ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-100 text-amber-900 border border-amber-300" title={`Matches existing contact: ${c.duplicateMatchName}`}>
                            <AlertTriangle className="w-3 h-3 text-amber-700" />
                            <span>Matches {c.duplicateMatchName}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            <span>New</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setStep(fileType === 'csv' ? 'mapping' : 'upload')}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Back
              </button>

              <button
                type="button"
                disabled={importing || parsedContacts.length === 0}
                onClick={handleExecuteImport}
                className="px-6 py-2 bg-[#209dd7] hover:bg-[#1a82b3] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 shadow-sm"
              >
                {importing ? 'Importing...' : `Import ${duplicateAction === 'skip_duplicates' ? newCount : parsedContacts.length} Contacts`}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
