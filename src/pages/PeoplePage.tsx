import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown, Download, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "../api";
import { Avatar } from "../components/Avatar";
import { StatusBadge } from "../components/StatusBadge";
import { Modal } from "../components/Modal";
import { PersonFormModal } from "../components/PersonFormModal";
import { ImportModal } from "../components/ImportModal";
import { CIRCLE_LABELS, type Circle, type PersonWithMeta } from "../types";
import { formatDate } from "../lib/format";

const columnHelper = createColumnHelper<PersonWithMeta>();

export function PeoplePage() {
  const navigate = useNavigate();
  const [people, setPeople] = useState<PersonWithMeta[] | null>(null);
  const [search, setSearch] = useState("");
  const [circleFilter, setCircleFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [editing, setEditing] = useState<PersonWithMeta | null>(null);
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [deleting, setDeleting] = useState<PersonWithMeta | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setPeople(await api.listPeople());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load people.");
    }
  };

  if (people === null && error === null) void refresh();

  const allTags = useMemo(() => {
    if (!people) return [];
    const set = new Set<string>();
    for (const p of people) for (const t of p.tags) set.add(t);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [people]);

  const filtered = useMemo(() => {
    if (!people) return [];
    const q = search.trim().toLowerCase();
    return people.filter((p) => {
      if (circleFilter !== "all" && p.circle !== circleFilter) return false;
      if (tagFilter !== "all" && !p.tags.includes(tagFilter)) return false;
      if (!q) return true;
      const haystack = `${p.firstName} ${p.lastName ?? ""} ${p.email ?? ""} ${p.company ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [people, search, circleFilter, tagFilter]);

  const [sorting, setSorting] = useState<SortingState>([{ id: "name", desc: false }]);

  const columns = useMemo(
    () => [
      columnHelper.accessor((p) => `${p.firstName} ${p.lastName ?? ""}`, {
        id: "name",
        header: "Name",
        cell: (info) => {
          const p = info.row.original;
          return (
            <div className="person-cell">
              <Avatar person={p} />
              <div>
                <div className="p-name">
                  {p.firstName} {p.lastName}
                </div>
                <div className="p-sub">{p.tags.slice(0, 3).map((t) => `#${t}`).join("  ")}</div>
              </div>
            </div>
          );
        },
      }),
      columnHelper.accessor("company", {
        header: "Company",
        cell: (info) => info.getValue() ?? <span className="muted">—</span>,
      }),
      columnHelper.accessor("circle", {
        header: "Circle",
        cell: (info) => CIRCLE_LABELS[info.getValue() as Circle],
      }),
      columnHelper.accessor("lastContacted", {
        header: "Last contacted",
        cell: (info) => <span className="nowrap">{formatDate(info.getValue())}</span>,
      }),
      columnHelper.accessor("checkin.status", {
        id: "status",
        header: "Check-in",
        cell: (info) => <StatusBadge info={info.row.original.checkin} />,
      }),
      columnHelper.accessor("latestNews", {
        header: "Latest news",
        cell: (info) => {
          const v = info.getValue();
          return v ? <span style={{ maxWidth: 260, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v}</span> : <span className="muted">—</span>;
        },
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: (info) => {
          const p = info.row.original;
          return (
            <div className="row" style={{ gap: 4 }}>
              <button
                className="btn btn-icon btn-ghost"
                title="Edit"
                aria-label={`Edit ${p.firstName}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setEditing(p);
                }}
              >
                <Pencil size={15} />
              </button>
              <button
                className="btn btn-icon btn-ghost"
                title="Delete"
                aria-label={`Delete ${p.firstName}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleting(p);
                }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          );
        },
      }),
    ],
    [],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await api.deletePerson(deleting.id);
      setDeleting(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete.");
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">People</h1>
          <p className="page-subtitle">
            {people ? `${people.length} people in your Rolodex` : "Loading…"}
          </p>
        </div>
        <div className="row">
          <button className="btn" onClick={() => setImporting(true)}>
            <Download size={15} />
            Import
          </button>
          <button className="btn btn-primary" onClick={() => setAdding(true)}>
            <Plus size={15} />
            Add person
          </button>
        </div>
      </div>

      {error ? <p className="error-text" style={{ marginBottom: 12 }}>{error}</p> : null}

      <div className="card">
        <div className="card-body" style={{ display: "flex", gap: 12, flexWrap: "wrap", padding: 14 }}>
          <input
            className="input"
            style={{ maxWidth: 300, flex: 1 }}
            placeholder="Search by name, company or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search people"
          />
          <select className="select" style={{ width: 150 }} value={circleFilter} onChange={(e) => setCircleFilter(e.target.value)} aria-label="Filter by circle">
            <option value="all">All circles</option>
            {(Object.keys(CIRCLE_LABELS) as Circle[]).map((c) => (
              <option key={c} value={c}>
                {CIRCLE_LABELS[c]}
              </option>
            ))}
          </select>
          <select className="select" style={{ width: 170 }} value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} aria-label="Filter by tag">
            <option value="all">All tags</option>
            {allTags.map((t) => (
              <option key={t} value={t}>
                #{t}
              </option>
            ))}
          </select>
          <span className="hint grow" style={{ alignSelf: "center" }}>
            {filtered.length} shown
          </span>
        </div>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">·</div>
            No people match your search and filters.
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((h) => (
                      <th key={h.id}>
                        {h.isPlaceholder ? null : h.column.getCanSort() ? (
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ padding: 0, fontWeight: 700, fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.05em" }}
                            onClick={h.column.getToggleSortingHandler()}
                          >
                            {flexRender(h.column.columnDef.header, h.getContext())}
                            <ArrowUpDown size={11} />
                          </button>
                        ) : (
                          flexRender(h.column.columnDef.header, h.getContext())
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="clickable" onClick={() => navigate(`/people/${row.original.id}`)}>
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {adding ? (
        <PersonFormModal
          onClose={() => setAdding(false)}
          onSaved={async () => {
            await refresh();
            setError(null);
          }}
        />
      ) : null}

      {editing ? (
        <PersonFormModal
          person={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            await refresh();
            setError(null);
          }}
        />
      ) : null}

      {importing ? (
        <ImportModal
          onClose={() => setImporting(false)}
          onDone={async () => {
            setImporting(false);
            await refresh();
          }}
        />
      ) : null}

      {deleting ? (
        <Modal
          title="Delete person"
          onClose={() => setDeleting(null)}
          footer={
            <>
              <button className="btn" onClick={() => setDeleting(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={confirmDelete}>
                Delete
              </button>
            </>
          }
        >
          <p>
            Are you sure you want to delete <strong>{deleting.firstName} {deleting.lastName}</strong>? All their
            interactions, dates, facts, news, reminders, gifts and connections will be removed too.
          </p>
        </Modal>
      ) : null}
    </div>
  );
}
