import { useRef, useState } from "react";
import { FileUp, AlertTriangle } from "lucide-react";
import { Modal } from "./Modal";
import { api } from "../api";
import type { FieldMapping } from "../types";

interface ImportModalProps {
  onClose: () => void;
  onDone: (created: number) => void;
}

interface AnnotatedRow {
  rowIndex: number;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  jobTitle: string | null;
  city: string | null;
  notes: string | null;
  tags: string[];
  duplicateOf: number | null;
  duplicateName: string | null;
  skipped: boolean;
}

type Stage = "pick" | "preview";

const FIELDS: { key: keyof FieldMapping; label: string }[] = [
  { key: "firstName", label: "First name" },
  { key: "lastName", label: "Last name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "company", label: "Company" },
  { key: "jobTitle", label: "Job title" },
  { key: "city", label: "City" },
  { key: "notes", label: "Notes" },
  { key: "tags", label: "Tags" },
];

export function ImportModal({ onClose, onDone }: ImportModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("pick");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [format, setFormat] = useState<"csv" | "vcf">("csv");
  const [fileName, setFileName] = useState("");
  const [columns, setColumns] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [rows, setRows] = useState<AnnotatedRow[]>([]);
  const [mapping, setMapping] = useState<FieldMapping>({});
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [result, setResult] = useState<number | null>(null);

  const pickFile = async (file: File) => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const isVcf = file.name.toLowerCase().endsWith(".vcf") || file.name.toLowerCase().endsWith(".vcard");
      if (isVcf) {
        const parsed = await api.importVcf(file);
        setFormat("vcf");
        setColumns(parsed.columns);
        setRows(parsed.rows);
        setSelected(new Set(parsed.rows.filter((r) => !r.duplicateOf).map((r) => r.rowIndex)));
        setMapping({});
        setFileName(file.name);
        setStage("preview");
      } else {
        const parsed = await api.importCsv(file);
        setFormat("csv");
        setColumns(parsed.columns);
        setRawRows(parsed.rawRows);
        setRows(parsed.rows);
        setMapping(parsed.suggestedMapping as FieldMapping);
        setSelected(new Set(parsed.rows.filter((r) => !r.duplicateOf).map((r) => r.rowIndex)));
        setFileName(file.name);
        setStage("preview");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not parse that file.");
    } finally {
      setBusy(false);
    }
  };

  const commit = async () => {
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        format,
        selectedRowIndexes: [...selected].sort((a, b) => a - b),
        circle: "wider",
      };
      if (format === "csv") {
        body.rawRows = rawRows;
        body.mapping = mapping;
      } else {
        body.rows = rows;
      }
      const res = await api.importCommit(body);
      setResult(res.created);
      setBusy(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.");
      setBusy(false);
    }
  };

  const toggle = (rowIndex: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(rowIndex)) next.delete(rowIndex);
      else next.add(rowIndex);
      return next;
    });
  };

  if (stage === "pick") {
    return (
      <Modal title="Import people" onClose={onClose}>
        <div className="stack">
          <p className="hint">
            Import people from a <strong>CSV</strong> or <strong>vCard (.vcf)</strong> file. You'll get to check what will
            be added before anything happens, and likely duplicates are flagged rather than created twice.
          </p>
          <label className="btn btn-primary" style={{ alignSelf: "flex-start" }}>
            <FileUp size={15} />
            Choose a file…
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.vcf,.vcard,text/csv,text/vcard,text/x-vcard"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void pickFile(f);
              }}
            />
          </label>
          {busy ? <p className="hint">Reading file…</p> : null}
          {error ? <p className="error-text">{error}</p> : null}
        </div>
      </Modal>
    );
  }

  const duplicateCount = rows.filter((r) => r.duplicateOf != null).length;
  const selectedCount = selected.size;

  return (
    <Modal
      title={`Import — ${fileName}`}
      onClose={onClose}
      footer={
        result != null ? (
          <button className="btn btn-primary" onClick={onDone.bind(null, result)}>
            Done
          </button>
        ) : (
          <>
            <button className="btn" onClick={() => setStage("pick")} disabled={busy}>
              Back
            </button>
            <button className="btn btn-primary" onClick={commit} disabled={busy || selectedCount === 0}>
              {busy ? "Importing…" : `Import ${selectedCount} person${selectedCount === 1 ? "" : "s"}`}
            </button>
          </>
        )
      }
    >
      {result != null ? (
        <div className="stack">
          <div className="row">
            <AlertTriangle size={18} color="#2e9e6b" />
            <strong>{result} person{result === 1 ? " was" : "s were"} added to your Rolodex.</strong>
          </div>
          <p className="hint">{duplicateCount > 0 ? `${duplicateCount} likely duplicate${duplicateCount === 1 ? "" : "s"} ${duplicateCount === 1 ? "was" : "were"} skipped.` : "No duplicates found."}</p>
        </div>
      ) : (
        <div className="stack">
          {format === "csv" ? (
            <div className="card" style={{ padding: 14 }}>
              <div className="section-title">Column mapping</div>
              <div className="form-grid">
                {FIELDS.map(({ key, label }) => (
                  <div className="field" key={key}>
                    <label className="label">{label}</label>
                    <select
                      className="select"
                      value={mapping[key] ?? ""}
                      onChange={(e) => setMapping((m) => ({ ...m, [key]: e.target.value || undefined }))}
                    >
                      <option value="">— none —</option>
                      {columns.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <div className="row-between" style={{ marginBottom: 8 }}>
              <span className="hint">
                {rows.length} row{rows.length === 1 ? "" : "s"} · {selectedCount} selected ·{" "}
                {duplicateCount} duplicate{duplicateCount === 1 ? "" : "s"} flagged
              </span>
            </div>
            <div className="scroll-y" style={{ maxHeight: 320, border: "1px solid var(--border)", borderRadius: 9 }}>
              <table className="import-table">
                <thead>
                  <tr>
                    <th style={{ width: 32 }}></th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Company</th>
                    <th>Phone</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const checked = selected.has(r.rowIndex);
                    return (
                      <tr key={r.rowIndex} style={{ background: r.duplicateOf != null ? "#fdf3dc" : undefined }}>
                        <td>
                          <input type="checkbox" checked={checked} onChange={() => toggle(r.rowIndex)} />
                        </td>
                        <td>
                          {r.firstName} {r.lastName ?? ""}
                          {r.duplicateOf != null ? (
                            <div>
                              <span className="tag" style={{ background: "#fdf3dc", color: "#8a6600" }}>
                                Duplicate of {r.duplicateName}
                              </span>
                            </div>
                          ) : null}
                        </td>
                        <td>{r.email ?? ""}</td>
                        <td>{r.company ?? ""}</td>
                        <td>{r.phone ?? ""}</td>
                        <td>{r.notes ?? ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          {error ? <p className="error-text">{error}</p> : null}
        </div>
      )}
    </Modal>
  );
}
