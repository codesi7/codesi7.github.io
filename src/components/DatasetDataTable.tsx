"use client";

import React, { useCallback, useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Columns3,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  FileJson,
  FileSpreadsheet,
  FileText,
  FilterX,
  Github,
  Plus,
  Printer,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import type { AuthUser, ColumnSchema, DataRecord, DatasetManifest, DatasetMeta } from "@/lib/types";
import { AppShell } from "./AppShell";
import { DatasetIcon } from "./IconResolver";
import { FadeInSection } from "./MotionPrimitives";
import { exportAsCsv, exportAsJson, exportAsXlsx } from "@/lib/export-utils";
import {
  swalConfirmBulkDelete,
  swalConfirmDelete,
  swalError,
  swalExportPicker,
  swalRecordFormModal,
  swalSuccess,
  swalSyncGithubConfirm,
  swalToast,
} from "@/lib/swal";

function getBadgeClasses(value: string): string {
  const v = value.trim().toLowerCase();
  if (["active", "done", "closed", "resolved", "yes", "submitted", "ok"].includes(v)) {
    return "bg-emerald-500/12 text-emerald-700 border-emerald-500/25 dark:text-emerald-300";
  }
  if (["open", "pending", "in progress", "medium"].includes(v)) {
    return "bg-amber-500/12 text-amber-700 border-amber-500/25 dark:text-amber-300";
  }
  if (["critical", "high", "inactive", "failed", "down", "no"].includes(v)) {
    return "bg-rose-500/12 text-rose-700 border-rose-500/25 dark:text-rose-300";
  }
  if (["admin", "superadmin", "low"].includes(v)) {
    return "bg-indigo-500/12 text-indigo-700 border-indigo-500/25 dark:text-indigo-300";
  }
  return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
}

export function DatasetDataTable({
  initialManifest,
  initialMeta,
  initialRecords,
  user,
}: {
  initialManifest: DatasetManifest;
  initialMeta: DatasetMeta;
  initialRecords: DataRecord[];
  user: AuthUser;
}) {
  const [manifest, setManifest] = useState<DatasetManifest>(initialManifest);
  const [meta, setMeta] = useState<DatasetMeta>(initialMeta);
  const [records, setRecords] = useState<DataRecord[]>(initialRecords);
  const [dataSource, setDataSource] = useState<"local" | "github">("local");
  const [loading, setLoading] = useState(false);

  // Table states
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    // For very wide sheets (> 10 cols), hide trailing low-priority columns by default for cleaner layout while keeping all accessible
    const vis: VisibilityState = {};
    initialMeta.columns.forEach((c, idx) => {
      if (initialMeta.columns.length > 12 && idx >= 9) {
        vis[c.key] = false;
      }
    });
    return vis;
  });
  const [density, setDensity] = useState<"compact" | "normal" | "comfortable">("normal");
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [revealedCells, setRevealedCells] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [inspectRecord, setInspectRecord] = useState<DataRecord | null>(null);

  const reloadData = useCallback(
    async (src: "local" | "github") => {
      setLoading(true);
      try {
        const res = await fetch(`/api/data/${meta.slug}?source=${src}`, { cache: "no-store" });
        const json = (await res.json()) as {
          records?: DataRecord[];
          meta?: DatasetMeta;
          error?: string;
        };
        if (!res.ok || !json.records) {
          throw new Error(json.error || "Failed to fetch dataset.");
        }
        setRecords(json.records);
        if (json.meta) setMeta(json.meta);
        setRowSelection({});
      } catch (err) {
        await swalError(
          "Fetch Error",
          err instanceof Error ? err.message : "Could not load records."
        );
      } finally {
        setLoading(false);
      }
    },
    [meta.slug]
  );

  const handleSourceChange = (src: "local" | "github") => {
    setDataSource(src);
    void reloadData(src);
    void swalToast(
      src === "github"
        ? `Loaded ${meta.title} from GitHub Public Raw JSON`
        : `Loaded ${meta.title} from Local JSON Store`,
      "info"
    );
  };

  // Auto-detect top 4 categorical filter columns (2..35 unique non-empty values, non-password)
  const facetedFilters = useMemo(() => {
    const candidates: { col: ColumnSchema; options: string[] }[] = [];
    for (const col of meta.columns) {
      if (col.sensitive || col.type === "textarea" || col.type === "url") continue;
      const vals = new Set<string>();
      for (const r of records) {
        const v = String(r[col.key] ?? "").trim();
        if (v) vals.add(v);
      }
      if (vals.size >= 2 && vals.size <= 35) {
        candidates.push({
          col,
          options: Array.from(vals).sort((a, b) => a.localeCompare(b)),
        });
      }
    }
    // Prioritize badge/status/zone/state/city/category columns
    candidates.sort((a, b) => {
      const score = (c: ColumnSchema) => {
        const k = c.key.toLowerCase();
        if (["status", "current status", "severity", "category", "role"].includes(k)) return 0;
        if (["state", "zone", "city", "store type", "brand", "laptop type"].includes(k)) return 1;
        return 2;
      };
      return score(a.col) - score(b.col);
    });
    return candidates.slice(0, 4);
  }, [meta.columns, records]);

  const copyValue = async (val: string, key: string) => {
    await navigator.clipboard.writeText(val);
    setCopiedId(key);
    void swalToast("Copied to clipboard", "success");
    setTimeout(() => setCopiedId(null), 1500);
  };

  // CRUD Handlers using SweetAlert2
  const handleCreate = useCallback(async () => {
    const payload = await swalRecordFormModal({
      mode: "create",
      datasetTitle: meta.title,
      columns: meta.columns,
    });
    if (!payload) return;

    try {
      const res = await fetch(`/api/data/${meta.slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as {
        record?: DataRecord;
        meta?: DatasetMeta;
        githubSynced?: boolean;
        error?: string;
      };
      if (!res.ok || !json.record) {
        throw new Error(json.error || "Failed to create record.");
      }

      setRecords((prev) => [json.record!, ...prev]);
      if (json.meta) {
        setMeta(json.meta);
        setManifest((m) => ({
          ...m,
          totalRecords: m.totalRecords + 1,
          datasets: m.datasets.map((d) => (d.slug === meta.slug ? json.meta! : d)),
        }));
      }
      await swalSuccess(
        "Record Created!",
        json.githubSynced
          ? "Saved to local JSON and pushed directly to GitHub."
          : "New entry added to the JSON dataset."
      );
    } catch (err) {
      await swalError("Create Failed", err instanceof Error ? err.message : "Error creating record.");
    }
  }, [meta.columns, meta.slug, meta.title]);

  const handleEdit = useCallback(
    async (rowRecord: DataRecord) => {
      const payload = await swalRecordFormModal({
        mode: "edit",
        datasetTitle: meta.title,
        columns: meta.columns,
        initialData: rowRecord,
      });
      if (!payload) return;

      try {
        const res = await fetch(`/api/data/${meta.slug}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ _id: rowRecord._id, data: payload }),
        });
        const json = (await res.json()) as {
          record?: DataRecord;
          meta?: DatasetMeta;
          githubSynced?: boolean;
          error?: string;
        };
        if (!res.ok || !json.record) {
          throw new Error(json.error || "Failed to update record.");
        }

        setRecords((prev) => prev.map((r) => (r._id === rowRecord._id ? json.record! : r)));
        if (inspectRecord?._id === rowRecord._id) {
          setInspectRecord(json.record);
        }
        await swalSuccess(
          "Record Updated!",
          json.githubSynced
            ? "Changes saved locally and synced to GitHub."
            : "JSON dataset updated successfully."
        );
      } catch (err) {
        await swalError("Update Failed", err instanceof Error ? err.message : "Error updating record.");
      }
    },
    [inspectRecord?._id, meta.columns, meta.slug, meta.title]
  );

  const handleDelete = useCallback(
    async (rowRecord: DataRecord) => {
      const firstKey = meta.columns[0]?.key;
      const label = firstKey ? String(rowRecord[firstKey] || rowRecord._id) : rowRecord._id;
      const confirmed = await swalConfirmDelete(label, rowRecord._id);
      if (!confirmed) return;

      try {
        const res = await fetch(`/api/data/${meta.slug}?id=${encodeURIComponent(rowRecord._id)}`, {
          method: "DELETE",
        });
        const json = (await res.json()) as {
          meta?: DatasetMeta;
          githubSynced?: boolean;
          error?: string;
        };
        if (!res.ok) {
          throw new Error(json.error || "Delete failed.");
        }

        setRecords((prev) => prev.filter((r) => r._id !== rowRecord._id));
        if (inspectRecord?._id === rowRecord._id) setInspectRecord(null);
        if (json.meta) {
          setMeta(json.meta);
          setManifest((m) => ({
            ...m,
            totalRecords: Math.max(0, m.totalRecords - 1),
            datasets: m.datasets.map((d) => (d.slug === meta.slug ? json.meta! : d)),
          }));
        }
        await swalSuccess("Record Deleted", "Entry permanently removed from JSON datastore.");
      } catch (err) {
        await swalError("Delete Failed", err instanceof Error ? err.message : "Error deleting record.");
      }
    },
    [inspectRecord?._id, meta.columns, meta.slug]
  );

  // Build TanStack Columns
  const columns = useMemo<ColumnDef<DataRecord>[]>(() => {
    const selectCol: ColumnDef<DataRecord> = {
      id: "_select",
      header: ({ table }) => (
        <input
          type="checkbox"
          aria-label="Select all rows on page"
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          aria-label="Select row"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    };

    const dataCols: ColumnDef<DataRecord>[] = meta.columns.map((col) => ({
      id: col.key,
      accessorFn: (row) => String(row[col.key] ?? ""),
      header: col.label,
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue) return true;
        return String(row.getValue(columnId) ?? "").trim() === String(filterValue).trim();
      },
      cell: ({ row }) => {
        const raw = row.original[col.key];
        const str = String(raw ?? "").trim();
        if (!str) {
          return <span className="text-slate-300 dark:text-slate-600">—</span>;
        }

        if (col.sensitive) {
          const cellKey = `${row.original._id}-${col.key}`;
          const isOpen = !!revealedCells[cellKey];
          return (
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs">
                {isOpen ? str : "••••••••"}
              </span>
              <button
                type="button"
                onClick={() =>
                  setRevealedCells((prev) => ({ ...prev, [cellKey]: !prev[cellKey] }))
                }
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                title={isOpen ? "Hide" : "Reveal"}
              >
                {isOpen ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => void copyValue(str, cellKey)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800"
                title="Copy"
              >
                {copiedId === cellKey ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          );
        }

        if (col.type === "url" && /^https?:\/\//i.test(str)) {
          return (
            <a
              href={str}
              target="_blank"
              rel="noreferrer"
              className="inline-flex max-w-[200px] items-center gap-1 truncate font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            >
              <span className="truncate">{str}</span>
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          );
        }

        if (col.type === "badge") {
          return (
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${getBadgeClasses(
                str
              )}`}
            >
              {str}
            </span>
          );
        }

        return (
          <span
            title={str}
            className="block max-w-[240px] truncate text-slate-700 dark:text-slate-200"
          >
            {str}
          </span>
        );
      },
    }));

    const actionsCol: ColumnDef<DataRecord> = {
      id: "_actions",
      header: () => <span className="block text-right">Actions</span>,
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => setInspectRecord(row.original)}
            title="Inspect full record"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => void handleEdit(row.original)}
            title="Edit with SweetAlert2"
            className="rounded-lg p-1.5 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/50 transition"
          >
            <Edit3 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => void handleDelete(row.original)}
            title="Delete with SweetAlert2"
            className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/50 transition"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    };

    return [selectCol, ...dataCols, actionsCol];
  }, [copiedId, handleDelete, handleEdit, meta.columns, revealedCells]);

  const table = useReactTable({
    data: records,
    columns,
    state: {
      globalFilter,
      columnFilters,
      sorting,
      rowSelection,
      columnVisibility,
    },
    getRowId: (row) => row._id,
    enableRowSelection: true,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 15 },
    },
  });

  const filteredRows = table.getFilteredRowModel().rows.map((r) => r.original);
  const selectedRows = table.getSelectedRowModel().rows.map((r) => r.original);
  const exportTargetRows = selectedRows.length > 0 ? selectedRows : filteredRows;

  const handleBulkDelete = async () => {
    if (selectedRows.length === 0) return;
    const confirmed = await swalConfirmBulkDelete(selectedRows.length);
    if (!confirmed) return;

    const ids = selectedRows.map((r) => r._id);
    try {
      const res = await fetch(`/api/data/${meta.slug}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const json = (await res.json()) as {
        deletedCount?: number;
        meta?: DatasetMeta;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error || "Bulk delete failed.");

      const idSet = new Set(ids);
      setRecords((prev) => prev.filter((r) => !idSet.has(r._id)));
      setRowSelection({});
      if (json.meta) {
        setMeta(json.meta);
        setManifest((m) => ({
          ...m,
          totalRecords: Math.max(0, m.totalRecords - (json.deletedCount || ids.length)),
          datasets: m.datasets.map((d) => (d.slug === meta.slug ? json.meta! : d)),
        }));
      }
      await swalSuccess("Bulk Delete Complete", `${json.deletedCount ?? ids.length} records removed.`);
    } catch (err) {
      await swalError("Bulk Delete Failed", err instanceof Error ? err.message : "Error deleting.");
    }
  };

  const runExport = async (format: "xlsx" | "csv" | "json" | "print") => {
    setExportMenuOpen(false);
    if (exportTargetRows.length === 0) {
      await swalError("Nothing to Export", "No matching rows in the current filter.");
      return;
    }
    if (format === "xlsx") {
      exportAsXlsx(exportTargetRows, meta.columns, meta.slug);
      await swalToast(`Exported ${exportTargetRows.length} rows to Excel (.xlsx)`, "success");
    } else if (format === "csv") {
      exportAsCsv(exportTargetRows, meta.columns, meta.slug);
      await swalToast(`Exported ${exportTargetRows.length} rows to CSV`, "success");
    } else if (format === "json") {
      exportAsJson(exportTargetRows, meta.slug);
      await swalToast(`Exported ${exportTargetRows.length} rows to JSON`, "success");
    } else if (format === "print") {
      window.print();
    }
  };

  const handleSweetExportWizard = async () => {
    const choice = await swalExportPicker(exportTargetRows.length);
    if (choice) {
      await runExport(choice);
    }
  };

  const handleSyncGithub = async () => {
    const ok = await swalSyncGithubConfirm(meta.githubRawUrl);
    if (!ok) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/data/${meta.slug}/sync`, { method: "POST" });
      const json = (await res.json()) as {
        records?: DataRecord[];
        meta?: DatasetMeta;
        error?: string;
      };
      if (!res.ok || !json.records) {
        throw new Error(json.error || "GitHub sync failed.");
      }
      setRecords(json.records);
      if (json.meta) setMeta(json.meta);
      await swalSuccess(
        "Synced from GitHub!",
        `Pulled ${json.records.length} live records from public GitHub JSON.`
      );
    } catch (err) {
      await swalError(
        "GitHub Sync Error",
        err instanceof Error
          ? err.message
          : "Ensure public JSON files are pushed to GitHub main branch."
      );
    } finally {
      setLoading(false);
    }
  };

  const clearAllFilters = () => {
    setGlobalFilter("");
    setColumnFilters([]);
    setSorting([]);
  };

  const paddingClass =
    density === "compact" ? "py-2 px-3" : density === "comfortable" ? "py-4 px-4" : "py-3 px-3.5";

  return (
    <AppShell
      manifest={manifest}
      user={user}
      dataSource={dataSource}
      onChangeDataSource={handleSourceChange}
    >
      <div className="mx-auto max-w-[1600px] space-y-5">
        {/* Header Card */}
        <FadeInSection>
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25">
                  <DatasetIcon name={meta.icon} className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
                      {meta.title}
                    </h1>
                    <span className="rounded-lg bg-indigo-50 px-2.5 py-0.5 font-mono text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      {records.length} records
                    </span>
                    <span className="rounded-lg border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      Sheet: {meta.sheetName}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 sm:text-sm dark:text-slate-400">
                    {meta.description}
                  </p>
                </div>
              </div>

              {/* Primary Action Buttons */}
              <div className="no-print flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleSyncGithub()}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition"
                >
                  <Github className="h-3.5 w-3.5" />
                  Sync GitHub
                </button>

                <button
                  type="button"
                  onClick={() => void reloadData(dataSource)}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </button>

                {/* Export Dropdown + Wizard */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setExportMenuOpen((v) => !v)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export ({exportTargetRows.length})
                  </button>
                  <AnimatePresence>
                    {exportMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.97 }}
                        className="absolute right-0 z-30 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900"
                      >
                        <button
                          type="button"
                          onClick={() => void runExport("xlsx")}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                          Export Excel (.xlsx)
                        </button>
                        <button
                          type="button"
                          onClick={() => void runExport("csv")}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <FileText className="h-4 w-4 text-sky-600" />
                          Export CSV (.csv)
                        </button>
                        <button
                          type="button"
                          onClick={() => void runExport("json")}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <FileJson className="h-4 w-4 text-amber-600" />
                          Export JSON (.json)
                        </button>
                        <button
                          type="button"
                          onClick={() => void runExport("print")}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <Printer className="h-4 w-4 text-indigo-600" />
                          Print / Save PDF
                        </button>
                        <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                        <button
                          type="button"
                          onClick={() => {
                            setExportMenuOpen(false);
                            void handleSweetExportWizard();
                          }}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
                        >
                          <SlidersHorizontal className="h-4 w-4" />
                          SweetAlert2 Export Wizard
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <button
                  type="button"
                  onClick={() => void handleCreate()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-500/25 hover:from-indigo-500 hover:to-violet-500 transition"
                >
                  <Plus className="h-4 w-4" />
                  Add Record
                </button>
              </div>
            </div>

            {/* Public JSON & GitHub Raw Endpoint Bar */}
            <div className="no-print mt-4 flex flex-col gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-2.5 text-xs sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex items-center gap-2 min-w-0">
                <Github className="h-4 w-4 shrink-0 text-slate-600 dark:text-slate-300" />
                <span className="font-semibold text-slate-700 dark:text-slate-200 shrink-0">
                  Public GitHub JSON:
                </span>
                <code className="truncate font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
                  {meta.githubRawUrl}
                </code>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => void copyValue(meta.githubRawUrl, "gh-raw-url")}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  {copiedId === "gh-raw-url" ? (
                    <Check className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  Copy Raw URL
                </button>
                <a
                  href={meta.localUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  Open JSON <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </FadeInSection>

        {/* Filter & Toolbar Strip */}
        <FadeInSection delay={0.08} className="no-print">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-3 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  placeholder={`Search across ${meta.columns.length} columns in ${meta.title}...`}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-10 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
                {globalFilter && (
                  <button
                    type="button"
                    onClick={() => setGlobalFilter("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Controls: Density, Columns, Clear Filters */}
              <div className="flex flex-wrap items-center gap-2">
                {(globalFilter || columnFilters.length > 0 || sorting.length > 0) && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
                  >
                    <FilterX className="h-3.5 w-3.5" />
                    Reset Filters
                  </button>
                )}

                <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5 text-xs dark:border-slate-700 dark:bg-slate-800">
                  {(["compact", "normal", "comfortable"] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDensity(d)}
                      className={`rounded-lg px-2.5 py-1 capitalize font-medium transition ${
                        density === d
                          ? "bg-white text-indigo-600 shadow-2xs dark:bg-slate-900 dark:text-indigo-400"
                          : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>

                {/* Column Visibility */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setColMenuOpen((v) => !v)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <Columns3 className="h-3.5 w-3.5" />
                    Columns
                  </button>
                  <AnimatePresence>
                    {colMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        className="absolute right-0 z-30 mt-2 max-h-72 w-60 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900"
                      >
                        {table
                          .getAllLeafColumns()
                          .filter((c) => c.getCanHide())
                          .map((column) => (
                            <label
                              key={column.id}
                              className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <input
                                type="checkbox"
                                checked={column.getIsVisible()}
                                onChange={column.getToggleVisibilityHandler()}
                                className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600"
                              />
                              <span className="truncate text-slate-700 dark:text-slate-200">
                                {String(column.columnDef.header)}
                              </span>
                            </label>
                          ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Faceted Dropdown Filters */}
            {facetedFilters.length > 0 && (
              <div className="grid grid-cols-1 gap-2.5 border-t border-slate-100 pt-3 sm:grid-cols-2 lg:grid-cols-4 dark:border-slate-800">
                {facetedFilters.map(({ col, options }) => {
                  const activeVal =
                    (columnFilters.find((f) => f.id === col.key)?.value as string) || "";
                  return (
                    <div key={col.key}>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Filter by {col.label}
                      </label>
                      <select
                        value={activeVal}
                        onChange={(e) => {
                          const val = e.target.value;
                          setColumnFilters((prev) => {
                            const others = prev.filter((f) => f.id !== col.key);
                            return val ? [...others, { id: col.key, value: val }] : others;
                          });
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                      >
                        <option value="">All {col.label} ({options.length})</option>
                        {options.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </FadeInSection>

        {/* Bulk Action Bar */}
        <AnimatePresence>
          {selectedRows.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-300 bg-indigo-50 px-4 py-3 text-xs shadow-sm dark:border-indigo-500/40 dark:bg-indigo-950/60"
            >
              <span className="font-semibold text-indigo-900 dark:text-indigo-200">
                {selectedRows.length} row{selectedRows.length > 1 ? "s" : ""} selected
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void runExport("xlsx")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 font-semibold text-slate-700 shadow-2xs hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-200"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                  Export Selected (.xlsx)
                </button>
                <button
                  type="button"
                  onClick={() => void handleBulkDelete()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 font-semibold text-white hover:bg-rose-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Selected ({selectedRows.length})
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* DataTable Card */}
        <FadeInSection delay={0.14}>
          <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/90">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => {
                        const canSort = header.column.getCanSort();
                        const sorted = header.column.getIsSorted();
                        return (
                          <th
                            key={header.id}
                            onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                            className={`whitespace-nowrap px-3.5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ${
                              canSort ? "cursor-pointer select-none hover:text-slate-900 dark:hover:text-white" : ""
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {canSort && (
                                <span className="text-slate-400">
                                  {sorted === "asc" ? (
                                    <ArrowUp className="h-3.5 w-3.5 text-indigo-600" />
                                  ) : sorted === "desc" ? (
                                    <ArrowDown className="h-3.5 w-3.5 text-indigo-600" />
                                  ) : (
                                    <ArrowUpDown className="h-3 w-3 opacity-50" />
                                  )}
                                </span>
                              )}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {table.getRowModel().rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={columns.length}
                        className="py-16 text-center text-sm text-slate-500 dark:text-slate-400"
                      >
                        No records match your current search or filters.
                      </td>
                    </tr>
                  ) : (
                    table.getRowModel().rows.map((row) => (
                      <tr
                        key={row.id}
                        onDoubleClick={() => setInspectRecord(row.original)}
                        className={`transition-colors hover:bg-indigo-50/40 dark:hover:bg-indigo-950/25 ${
                          row.getIsSelected() ? "bg-indigo-50/60 dark:bg-indigo-950/40" : ""
                        }`}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className={`whitespace-nowrap ${paddingClass}`}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="no-print flex flex-col gap-3 border-t border-slate-200/80 bg-slate-50/70 px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                <span>
                  Showing{" "}
                  <strong className="text-slate-900 dark:text-white">
                    {table.getRowModel().rows.length}
                  </strong>{" "}
                  of{" "}
                  <strong className="text-slate-900 dark:text-white">
                    {filteredRows.length}
                  </strong>{" "}
                  filtered rows
                </span>
                <select
                  value={table.getState().pagination.pageSize}
                  onChange={(e) => table.setPageSize(Number(e.target.value))}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  {[10, 15, 25, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      {size} / page
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => table.setPageIndex(0)}
                  disabled={!table.getCanPreviousPage()}
                  className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-2.5 font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Page {table.getState().pagination.pageIndex + 1} / {Math.max(1, table.getPageCount())}
                </span>
                <button
                  type="button"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                  disabled={!table.getCanNextPage()}
                  className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </FadeInSection>
      </div>

      {/* Record Inspector Slide-over Drawer */}
      <AnimatePresence>
        {inspectRecord && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setInspectRecord(null)}
              className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-xs"
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Record Details
                  </h3>
                  <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
                    {inspectRecord._id}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectRecord(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-3">
                {meta.columns.map((col) => {
                  const val = String(inspectRecord[col.key] ?? "").trim();
                  return (
                    <div
                      key={col.key}
                      className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/50"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {col.label}
                        </span>
                        {val && (
                          <button
                            type="button"
                            onClick={() => void copyValue(val, `drawer-${col.key}`)}
                            className="text-slate-400 hover:text-indigo-600"
                            title="Copy field"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm font-medium text-slate-900 dark:text-slate-100">
                        {val || "—"}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => void handleDelete(inspectRecord)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => void handleEdit(inspectRecord)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                >
                  <Edit3 className="h-4 w-4" />
                  Edit with SweetAlert2
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </AppShell>
  );
}
