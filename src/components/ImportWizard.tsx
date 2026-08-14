import { useMemo, useState } from "react";
import type { Person, PersonField } from "@shared/types";
import { PERSON_FIELDS } from "@shared/types";
import { applyMapping, detectDuplicate, parseCsv, parseVCard, suggestMapping } from "@shared/import";
import { createPerson } from "../api";
import { Button, Field, inputClass } from "./ui";

const FIELD_LABELS: Record<PersonField, string> = {
  name: "Name",
  email: "Email",
  phone: "Phone",
  jobTitle: "Job title",
  company: "Company",
  city: "City",
  timezone: "Time zone",
  notes: "Notes",
  tags: "Tags",
};

export function ImportWizard({
  existing,
  onClose,
  onImported,
}: {
  existing: Pick<Person, "id" | "name" | "email">[];
  onClose: () => void;
  onImported: () => void;
}) {
  const [step, setStep] = useState<"pick" | "map" | "preview">("pick");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, PersonField | "">>({});
  const [kind, setKind] = useState<"csv" | "vcf">("csv");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [skipped, setSkipped] = useState<Record<number, boolean>>({});

  const preview = useMemo(() => {
    const mapped = kind === "vcf" ? rows.map((row) => ({
      name: row.name,
      email: row.email,
      phone: row.phone,
      jobTitle: row.jobTitle,
      company: row.company,
      city: row.city,
      notes: row.notes,
    })) : applyMapping(rows, mapping);
    return mapped.map((values, index) => {
      const duplicate = detectDuplicate(values, existing);
      return { values, duplicate, skip: skipped[index] ?? Boolean(duplicate) };
    });
  }, [rows, mapping, kind, existing, skipped]);

  function onFile(file: File) {
    setError("");
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const isVcf = file.name.toLowerCase().endsWith(".vcf") || text.includes("BEGIN:VCARD");
      if (isVcf) {
        setKind("vcf");
        const cards = parseVCard(text);
        if (cards.length === 0) {
          setError("No contacts found in that vCard file.");
          return;
        }
        setRows(cards);
        setStep("preview");
        return;
      }
      setKind("csv");
      const parsed = parseCsv(text);
      if (parsed.rows.length === 0) {
        setError("No rows found in that CSV file.");
        return;
      }
      setHeaders(parsed.headers);
      setRows(parsed.rows);
      setMapping(suggestMapping(parsed.headers));
      setStep("map");
    };
    reader.readAsText(file);
  }

  async function commit() {
    setBusy(true);
    setError("");
    try {
      for (const row of preview) {
        if (row.skip || !row.values.name) continue;
        const values = row.values as Partial<Record<(typeof PERSON_FIELDS)[number], string>>;
        await createPerson({
          name: values.name!,
          email: values.email,
          phone: values.phone,
          jobTitle: values.jobTitle,
          company: values.company,
          city: values.city,
          timezone: values.timezone,
          notes: values.notes,
          tags: values.tags ? values.tags.split(/[,;]/).map((t: string) => t.trim()).filter(Boolean) : [],
          circle: "wider",
        });
      }
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
      setBusy(false);
    }
  }

  const willAdd = preview.filter((r) => !r.skip && r.values.name).length;

  return (
    <div className="grid gap-4">
      {step === "pick" ? (
        <Field label="CSV or vCard file">
          <input
            type="file"
            accept=".csv,.vcf,text/csv,text/vcard"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFile(file);
            }}
          />
        </Field>
      ) : null}

      {step === "map" ? (
        <>
          <p className="text-sm text-muted">Match each column to a Rolodex field. Name is required.</p>
          <div className="grid gap-2">
            {headers.map((header) => (
              <div key={header} className="grid grid-cols-2 items-center gap-3">
                <span className="text-sm font-semibold">{header}</span>
                <select
                  className={inputClass}
                  value={mapping[header] ?? ""}
                  onChange={(e) => setMapping((m) => ({ ...m, [header]: e.target.value as PersonField | "" }))}
                >
                  <option value="">Ignore</option>
                  {PERSON_FIELDS.map((field) => (
                    <option key={field} value={field}>
                      {FIELD_LABELS[field]}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setStep("preview")}>Preview</Button>
          </div>
        </>
      ) : null}

      {step === "preview" ? (
        <>
          <p className="text-sm text-muted">
            {willAdd} {willAdd === 1 ? "person" : "people"} will be added. Duplicates are skipped unless you say otherwise.
          </p>
          <div className="max-h-80 overflow-auto rounded-xl border border-line">
            <table className="w-full text-left text-sm">
              <thead className="bg-paper text-muted">
                <tr>
                  <th className="px-3 py-2">Add</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Company</th>
                  <th className="px-3 py-2">Note</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row, index) => (
                  <tr key={index} className="border-t border-line">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={!row.skip}
                        disabled={!row.values.name}
                        onChange={(e) => setSkipped((s) => ({ ...s, [index]: !e.target.checked }))}
                      />
                    </td>
                    <td className="px-3 py-2">{row.values.name || "—"}</td>
                    <td className="px-3 py-2">{row.values.email || "—"}</td>
                    <td className="px-3 py-2">{row.values.company || "—"}</td>
                    <td className="px-3 py-2 text-overdue">
                      {row.duplicate ? `Already in Rolodex: ${row.duplicate.name} (${row.duplicate.reason})` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-2">
            {kind === "csv" ? (
              <Button variant="secondary" onClick={() => setStep("map")}>
                Back
              </Button>
            ) : null}
            <Button onClick={commit} disabled={busy || willAdd === 0}>
              {busy ? "Importing…" : `Import ${willAdd}`}
            </Button>
          </div>
        </>
      ) : null}

      {error ? <p className="text-sm text-overdue">{error}</p> : null}
      <div className="flex justify-start">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
