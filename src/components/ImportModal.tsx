import { useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, FileUp, Upload } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api, type ImportParsePayload, type ImportRow } from '../api'
import { Modal } from './ui'
import { useStore, useToast } from '../store'

const FIELDS = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'job_title', label: 'Job title' },
  { key: 'company', label: 'Company' },
  { key: 'city', label: 'City' },
  { key: 'birthday', label: 'Birthday' },
  { key: 'notes', label: 'Notes' },
]

export function ImportModal({ onClose }: { onClose: () => void }) {
  const { refresh } = useStore()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [parse, setParse] = useState<ImportParsePayload | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [rows, setRows] = useState<ImportRow[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [filename, setFilename] = useState('')
  const [result, setResult] = useState<{ added: number; skipped: number } | null>(null)

  const readAndParse = async (file: File) => {
    setBusy(true)
    setError(null)
    try {
      const content = await file.text()
      const payload = await api.importParse(file.name, content)
      setFilename(file.name)
      setParse(payload)
      if (payload.format === 'csv') {
        setMapping(invertMapping(payload.suggested_mapping ?? {}))
        setRows(payload.rows)
      } else {
        setRows(payload.rows)
      }
      setSelected(new Set(payload.rows.filter((r) => !r.duplicate.isDuplicate).map((r) => r.index)))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const invertMapping = (m: Record<string, string>): Record<string, string> => {
    // mapping comes back as {header: field}; we want {field: header} for the selects
    const out: Record<string, string> = {}
    for (const [header, field] of Object.entries(m)) out[field] = header
    return out
  }

  const remap = async (field: string, header: string) => {
    if (!parse?.headers || !parse.raw_rows) return
    const next = { ...mapping, [field]: header || undefined } as Record<string, string>
    setMapping(next)
    setBusy(true)
    try {
      const clean = Object.fromEntries(Object.entries(next).filter(([, v]) => v)) as Record<string, string>
      const { rows: r } = await api.importRemap(parse.headers, parse.raw_rows, invertMapping(clean))
      setRows(r)
      setSelected(new Set(r.filter((x) => !x.duplicate.isDuplicate).map((x) => x.index)))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const doImport = async () => {
    setBusy(true)
    setError(null)
    try {
      const chosen = rows.filter((r) => selected.has(r.index)).map((r) => r.person)
      const res = await api.importApply(chosen)
      setResult({ added: res.created.length, skipped: res.skipped })
      await refresh()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const reset = () => {
    setParse(null)
    setRows([])
    setResult(null)
    setError(null)
  }

  const dupCount = rows.filter((r) => r.duplicate.isDuplicate).length
  const importCount = rows.filter((r) => selected.has(r.index)).length

  return (
    <Modal
      large
      title="Import people"
      icon={<Upload size={17} className="lucide" style={{ color: 'var(--blue)' }} />}
      onClose={onClose}
      footer={
        result ? (
          <>
            <span style={{ marginRight: 'auto', display: 'flex', gap: 6, alignItems: 'center', color: 'var(--green)' }}>
              <CheckCircle2 size={15} /> Imported {result.added} {result.added === 1 ? 'person' : 'people'}
              {result.skipped > 0 && <span className="muted">· {result.skipped} duplicate{result.skipped === 1 ? '' : 's'} skipped</span>}
            </span>
            <button className="btn" onClick={reset}>
              Import another file
            </button>
            <button className="btn btn-primary" onClick={onClose}>
              Done
            </button>
          </>
        ) : parse ? (
          <>
            {error && <span style={{ color: 'var(--red)', marginRight: 'auto', fontSize: 13 }}>{error}</span>}
            <button className="btn" onClick={reset} disabled={busy}>
              Start over
            </button>
            <button className="btn btn-primary" onClick={doImport} disabled={busy || importCount === 0}>
              {busy ? 'Importing…' : `Import ${importCount} ${importCount === 1 ? 'person' : 'people'}`}
            </button>
          </>
        ) : (
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
        )
      }
    >
      {!parse && !result && (
        <>
          <p className="muted" style={{ marginTop: 0 }}>
            Bring in contacts from a CSV file or a vCard (.vcf) file. We’ll read the file, let you check exactly what will
            be added, and flag anyone who already seems to be in your Rolodex.
          </p>
          <div
            className="import-drop"
            style={{ cursor: busy ? 'wait' : 'pointer' }}
            onClick={() => !busy && fileRef.current?.click()}
          >
            <FileUp size={26} />
            <div style={{ fontWeight: 600, color: 'var(--text)' }}>
              {busy ? 'Reading file…' : 'Choose a .csv or .vcf file'}
            </div>
            <div style={{ fontSize: 12.5 }}>Everything stays on this machine — nothing is uploaded anywhere.</div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.vcf,text/csv,text/vcard"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) readAndParse(f)
              }}
            />
          </div>
          {error && <p style={{ color: 'var(--red)' }}>{error}</p>}
        </>
      )}

      {parse && !result && (
        <>
          <div className="row-between" style={{ marginBottom: 12 }}>
            <div className="row" style={{ gap: 8 }}>
              <span className="step-dot on">1</span>
              <span style={{ fontWeight: 600 }}>{filename}</span>
              <span className="muted small">
                {parse.format === 'vcf' ? 'vCard file' : 'CSV file'} · {rows.length} contacts found
              </span>
            </div>
            {dupCount > 0 && (
              <span className="dup-flag">
                <AlertTriangle size={12} /> {dupCount} likely duplicate{dupCount === 1 ? '' : 's'} — skipped
              </span>
            )}
          </div>

          {parse.format === 'csv' && parse.headers && (
            <div className="card" style={{ padding: '12px 16px', marginBottom: 14, boxShadow: 'none' }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Map the columns</div>
              <div className="form-grid">
                {FIELDS.map((f) => (
                  <div className="field" key={f.key}>
                    <label>{f.label}</label>
                    <select
                      value={mapping[f.key] ?? ''}
                      onChange={(e) => remap(f.key, e.target.value)}
                    >
                      <option value="">— not imported —</option>
                      {parse.headers!.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ fontWeight: 600, marginBottom: 6 }}>Preview</div>
          <div className="import-review">
            <table className="data">
              <thead>
                <tr>
                  <th style={{ width: 30 }}></th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Company</th>
                  <th>City</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.index} style={r.duplicate.isDuplicate ? { background: 'var(--red-soft)' } : undefined}>
                    <td>
                      <input
                        type="checkbox"
                        disabled={r.duplicate.isDuplicate}
                        checked={selected.has(r.index)}
                        onChange={(e) => {
                          const next = new Set(selected)
                          if (e.target.checked) next.add(r.index)
                          else next.delete(r.index)
                          setSelected(next)
                        }}
                      />
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.person.name}</div>
                      {r.duplicate.isDuplicate && (
                        <span className="dup-flag">
                          <AlertTriangle size={11} /> Already in your Rolodex:{' '}
                          <Link to={`/people/${r.duplicate.duplicateOfId}`} onClick={onClose}>
                            {r.duplicate.duplicateOfName}
                          </Link>{' '}
                          (matched by {r.duplicate.reason})
                        </span>
                      )}
                    </td>
                    <td>{r.person.email ?? '—'}</td>
                    <td>{r.person.company ?? '—'}</td>
                    <td>{r.person.city ?? '—'}</td>
                    <td className="news-cell">{r.person.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted small" style={{ marginBottom: 0 }}>
            People already in your Rolodex are matched by email or exact name and skipped by default — untick anyone you
            don’t want to add.
          </p>
        </>
      )}
    </Modal>
  )
}
