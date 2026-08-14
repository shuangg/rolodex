import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2, Upload } from "lucide-react";
import { CIRCLE_LABELS, CIRCLES } from "@shared/types";
import type { Circle, PersonInput, PersonListItem } from "@shared/types";
import { createPerson, deletePerson, fetchPeople, fetchTags, updatePerson, uploadPhoto } from "../api";
import { ago, prettyDate, statusCopy } from "../lib/format";
import { Avatar } from "../components/Avatar";
import { ImportWizard } from "../components/ImportWizard";
import { PersonForm } from "../components/PersonForm";
import { Button, Modal, StatusBadge, inputClass } from "../components/ui";

export function PeoplePage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [circle, setCircle] = useState<Circle | "">("");
  const [tag, setTag] = useState("");
  const [editing, setEditing] = useState<PersonListItem | "new" | null>(null);
  const [importing, setImporting] = useState(false);
  const [deleting, setDeleting] = useState<PersonListItem | null>(null);

  const people = useQuery({ queryKey: ["people"], queryFn: () => fetchPeople() });
  const tags = useQuery({ queryKey: ["tags"], queryFn: fetchTags });
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (people.data ?? []).filter((p) => {
      if (circle && p.circle !== circle) return false;
      if (tag && !p.tags.includes(tag)) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.company ?? "").toLowerCase().includes(q) ||
        (p.email ?? "").toLowerCase().includes(q)
      );
    });
  }, [people.data, search, circle, tag]);

  const save = useMutation({
    mutationFn: async ({ input, photo, id }: { input: PersonInput; photo?: File | null; id?: string }) => {
      const person = id ? await updatePerson(id, input) : await createPerson(input);
      if (photo) await uploadPhoto(person.id, photo);
      return person;
    },
    onSuccess: () => {
      qc.invalidateQueries();
      setEditing(null);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deletePerson(id),
    onSuccess: () => {
      qc.invalidateQueries();
      setDeleting(null);
    },
  });

  const columns = useMemo<ColumnDef<PersonListItem>[]>(
    () => [
      {
        id: "person",
        header: "Name",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Avatar person={row.original} size={40} />
            <div>
              <div className="font-semibold">{row.original.name}</div>
              <div className="text-sm text-muted">{row.original.jobTitle}</div>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "company",
        header: "Company",
        cell: ({ getValue }) => <span className="text-muted">{(getValue() as string) || "—"}</span>,
      },
      {
        accessorKey: "circle",
        header: "Circle",
        cell: ({ getValue }) => CIRCLE_LABELS[getValue() as Circle],
      },
      {
        id: "last",
        header: "Last contacted",
        cell: ({ row }) =>
          row.original.lastContacted ? (
            <span title={prettyDate(row.original.lastContacted)}>{ago(row.original.lastContacted)}</span>
          ) : (
            <span className="text-muted">Never</span>
          ),
      },
      {
        id: "news",
        header: "Latest news",
        cell: ({ row }) => <span className="line-clamp-2 text-sm text-muted">{row.original.latestNews || "—"}</span>,
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <StatusBadge status={row.original.checkInStatus} />
            <span className="text-xs text-muted">
              {row.original.checkInStatus && row.original.checkInStatus !== "in_touch"
                ? statusCopy(row.original.daysUntilDue, row.original.checkInStatus)
                : ""}
            </span>
          </div>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <button
              type="button"
              className="rounded-lg p-2 text-muted hover:bg-paper hover:text-ink"
              aria-label={`Edit ${row.original.name}`}
              onClick={(e) => {
                e.stopPropagation();
                setEditing(row.original);
              }}
            >
              <Pencil size={16} />
            </button>
            <button
              type="button"
              className="rounded-lg p-2 text-muted hover:bg-overdue-bg hover:text-overdue"
              aria-label={`Delete ${row.original.name}`}
              onClick={(e) => {
                e.stopPropagation();
                setDeleting(row.original);
              }}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl">People</h1>
          <p className="mt-1 text-muted">{filtered.length} in your Rolodex</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setImporting(true)}>
            <Upload size={16} /> Import
          </Button>
          <Button onClick={() => setEditing("new")}>Add person</Button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          className={`${inputClass} max-w-xs`}
          placeholder="Search name, company or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search people"
        />
        <select className={`${inputClass} w-40`} value={circle} onChange={(e) => setCircle(e.target.value as Circle | "")} aria-label="Filter by circle">
          <option value="">All circles</option>
          {CIRCLES.map((c) => (
            <option key={c} value={c}>
              {CIRCLE_LABELS[c]}
            </option>
          ))}
        </select>
        <select className={`${inputClass} w-40`} value={tag} onChange={(e) => setTag(e.target.value)} aria-label="Filter by tag">
          <option value="">All tags</option>
          {(tags.data ?? []).map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-card">
        <table className="w-full text-left">
          <thead className="border-b border-line bg-paper text-sm text-muted">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th key={header.id} className="px-4 py-3 font-semibold">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="cursor-pointer border-t border-line hover:bg-paper/70"
                onClick={() => navigate(`/people/${row.original.id}`)}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 ? <p className="px-4 py-10 text-center text-muted">No people match those filters.</p> : null}
      </div>

      {editing ? (
        <Modal title={editing === "new" ? "Add person" : "Edit person"} onClose={() => setEditing(null)}>
          <PersonForm
            person={editing === "new" ? undefined : editing}
            onCancel={() => setEditing(null)}
            onSave={async (input, photo) => {
              await save.mutateAsync({ input, photo, id: editing === "new" ? undefined : editing.id });
            }}
          />
        </Modal>
      ) : null}

      {importing ? (
        <Modal title="Import people" onClose={() => setImporting(false)} wide>
          <ImportWizard
            existing={people.data ?? []}
            onClose={() => setImporting(false)}
            onImported={() => {
              qc.invalidateQueries();
              setImporting(false);
            }}
          />
        </Modal>
      ) : null}

      {deleting ? (
        <Modal title="Delete person" onClose={() => setDeleting(null)}>
          <p className="mb-4 text-sm">
            Remove {deleting.name} from your Rolodex? Their history, dates and gifts will go too.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => remove.mutate(deleting.id)}>
              Delete
            </Button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
