"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  LayoutGrid,
  Plus,
  Printer,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Table2,
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
  swalConnectGithubToken,
  swalError,
  swalExportPicker,
  swalLoading,
  swalPromptGithubWriteBeforeSave,
  swalRecordFormModal,
  swalSuccess,
  swalSyncGithubConfirm,
  swalToast,
} from "@/lib/swal";
import {
  bulkDeleteRecordsClient,
  createRecordClient,
  deleteRecordClient,
  getGithubToken,
  loadDatasetClient,
  pushCurrentDatasetToGithub,
  setGithubToken,
  syncFromGithubClient,
  updateRecordClient,
  withBasePath,
} from "@/lib/client-store";

function getBadgeClasses(value: string): string {
  const v = value.trim().toLowerCase();
  if (["active", "done", "closed", "resolved", "yes", "submitted", "ok"].includes(v)) {
    return "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-300";
  }
  if (["open", "pending", "in progress", "medium"].includes(v)) {
    return "bg-amber-500/10 text-amber-700 border-amber-500/25 dark:text-amber-300";
  }
  if (["critical", "high", "inactive", "failed", "down", "no"].includes(v)) {
    return "bg-rose-500/10 text-rose-700 border-rose-500/25 dark:text-rose-300";
  }
  if (["admin", "superadmin", "low"].includes(v)) {
    return "bg-blue-500/10 text-blue-700 border-blue-500/25 dark:text-blue-300";
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
    const vis: VisibilityState = {};
    initialMeta.columns.forEach((c, idx) => {
      if (initialMeta.columns.length > 12 && idx >= 9) {
        vis[c.key] = false;
      }
    });
    return vis;
  });
  const [density, setDensity] = useState<"compact" | "normal" | "comfortable">("normal");
  const [viewMode, setViewMode] = useState<"auto" | "table" | "cards">("auto");
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [revealedCells, setRevealedCells] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [inspectRecord, setInspectRecord] = useState<DataRecord | null>(null);
  const [hasGhPat, setHasGhPat] = useState(false);

  useEffect(() => {
    const syncPat = () => setHasGhPat(Boolean(getGithubToken()));
    syncPat();
    window.addEventListener("codei7-gh-token-changed", syncPat);
    return () => window.removeEventListener("codei7-gh-token-changed", syncPat);
  }, []);

  const ensureGithubWriteOrContinue = useCallback(async (): Promise<boolean> => {
    if (getGithubToken()) return true;
    const choice = await swalPromptGithubWriteBeforeSave();
    if (choice === "cancel") return false;
    if (choice === "connect") {
      const token = await swalConnectGithubToken("");
      if (!token) return false;
      setGithubToken(token);
      setHasGhPat(true);
      await swalToast("GitHub Write Token verified & connected", "success");
    }
    return true;
  }, []);

  const handleConnectTokenOnly = async () => {
    const res = await swalConnectGithubToken(getGithubToken());
    if (res === undefined) return;
    setGithubToken(res || "");
    setHasGhPat(Boolean(res));
    if (res && typeof window !== "undefined" && localStorage.getItem(`codei7_ds_${meta.slug}`)) {
      setLoading(true);
      try {
        void swalLoading("Syncing Local Edits to GitHub...", `Updating public/data/${meta.fileName}`);
        const pushed = await pushCurrentDatasetToGithub(meta.slug);
        setMeta(pushed.meta);
        setManifest(pushed.manifest);
        await swalSuccess(
          "Auto-Sync Active & Synced!",
          `Connected and synced ${pushed.recordCount} records to public/data/${meta.fileName} on GitHub.`
        );
        return;
      } catch (err) {
        await swalError(
          "Sync Failed",
          err instanceof Error ? err.message : "Connected token, but sync failed."
        );
        return;
      } finally {
        setLoading(false);
      }
    }
    await swalToast(
      res ? "Auto-Sync GitHub: ON (No manual push needed)" : "Disconnected GitHub Token",
      "info"
    );
  };

  const handlePushLocalToGithub = async () => {
    let token = getGithubToken();
    if (!token) {
      const entered = await swalConnectGithubToken("");
      if (!entered) return;
      setGithubToken(entered);
      setHasGhPat(true);
      token = entered;
    }
    setLoading(true);
    try {
      const res = await pushCurrentDatasetToGithub(meta.slug);
      setMeta(res.meta);
      setManifest(res.manifest);
      await swalSuccess(
        "Committed to GitHub!",
        `Pushed ${res.recordCount} records to public/data/${meta.fileName} on GitHub.`
      );
    } catch (err) {
      await swalError(
        "GitHub Commit Failed",
        err instanceof Error ? err.message : "Could not commit to GitHub."
      );
    } finally {
      setLoading(false);
    }
  };

  const reloadData = useCallback(
    async (src: "local" | "github") => {
      setLoading(true);
      try {
        const res = await loadDatasetClient(meta.slug, src);
        setRecords(res.records);
        setMeta(res.meta);
        setManifest(res.manifest);
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
        ? `Loaded ${meta.title} from GitHub Raw JSON`
        : `Loaded ${meta.title} from Local JSON`,
      "info"
    );
  };

  // Auto-detect up to 4 categorical filter columns
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

  const handleCreate = useCallback(async () => {
    const okToProceed = await ensureGithubWriteOrContinue();
    if (!okToProceed) return;

    const payload = await swalRecordFormModal({
      mode: "create",
      datasetTitle: meta.title,
      columns: meta.columns,
    });
    if (!payload) return;

    try {
      if (getGithubToken()) {
        void swalLoading("Saving to GitHub JSON...", `Updating public/data/${meta.fileName}`);
      }
      const res = await createRecordClient(meta.slug, payload);
      setRecords((prev) => [res.record, ...prev]);
      setMeta(res.meta);
      setManifest(res.manifest);
      await swalSuccess(
        "Record Created",
        res.githubSynced
          ? `Automatically saved to public/data/${meta.fileName} on GitHub.`
          : "Saved in browser storage only (connect GitHub Write Token for auto-commit)."
      );
    } catch (err) {
      await swalError("Create Failed", err instanceof Error ? err.message : "Error creating record.");
    }
  }, [ensureGithubWriteOrContinue, meta.columns, meta.fileName, meta.slug, meta.title]);

  const handleEdit = useCallback(
    async (rowRecord: DataRecord) => {
      const okToProceed = await ensureGithubWriteOrContinue();
      if (!okToProceed) return;

      const payload = await swalRecordFormModal({
        mode: "edit",
        datasetTitle: meta.title,
        columns: meta.columns,
        initialData: rowRecord,
      });
      if (!payload) return;

      try {
        if (getGithubToken()) {
          void swalLoading("Updating GitHub JSON...", `Saving changes to public/data/${meta.fileName}`);
        }
        const res = await updateRecordClient(meta.slug, rowRecord._id, payload);
        setRecords((prev) => prev.map((r) => (r._id === rowRecord._id ? res.record : r)));
        setMeta(res.meta);
        setManifest(res.manifest);
        if (inspectRecord?._id === rowRecord._id) {
          setInspectRecord(res.record);
        }
        await swalSuccess(
          "Record Updated",
          res.githubSynced
            ? `Automatically updated public/data/${meta.fileName} on GitHub.`
            : "Updated in browser storage only."
        );
      } catch (err) {
        await swalError("Update Failed", err instanceof Error ? err.message : "Error updating record.");
      }
    },
    [ensureGithubWriteOrContinue, inspectRecord?._id, meta.columns, meta.fileName, meta.slug, meta.title]
  );

  const handleDelete = useCallback(
    async (rowRecord: DataRecord) => {
      const okToProceed = await ensureGithubWriteOrContinue();
      if (!okToProceed) return;

      const firstKey = meta.columns[0]?.key;
      const label = firstKey ? String(rowRecord[firstKey] || rowRecord._id) : rowRecord._id;
      const confirmed = await swalConfirmDelete(label, rowRecord._id);
      if (!confirmed) return;

      try {
        if (getGithubToken()) {
          void swalLoading("Deleting from GitHub JSON...", `Updating public/data/${meta.fileName}`);
        }
        const res = await deleteRecordClient(meta.slug, rowRecord._id);
        setRecords((prev) => prev.filter((r) => r._id !== rowRecord._id));
        if (inspectRecord?._id === rowRecord._id) setInspectRecord(null);
        setMeta(res.meta);
        setManifest(res.manifest);
        await swalSuccess(
          "Record Deleted",
          res.githubSynced
            ? `Automatically removed from public/data/${meta.fileName} on GitHub.`
            : "Removed from browser storage only."
        );
      } catch (err) {
        await swalError("Delete Failed", err instanceof Error ? err.message : "Error deleting record.");
      }
    },
    [ensureGithubWriteOrContinue, inspectRecord?._id, meta.columns, meta.fileName, meta.slug]
  );

  const columns = useMemo<ColumnDef<DataRecord>[]>(() => {
    const selectCol: ColumnDef<DataRecord> = {
      id: "_select",
      header: ({ table }) => (
        <input
          type="checkbox"
          aria-label="Select all rows on page"
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          aria-label="Select row"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
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
            <div className="flex items-center gap-1">
              <span className="font-mono text-xs">{isOpen ? str : "••••••••"}</span>
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
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-800"
                title="Copy"
              >
                {copiedId === cellKey ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
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
              className="inline-flex max-w-[190px] items-center gap-1 truncate font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              <span className="truncate">{str}</span>
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          );
        }

        if (col.type === "badge") {
          return (
            <span
              className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium capitalize ${getBadgeClasses(
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
            className="block max-w-[230px] truncate text-slate-700 dark:text-slate-200"
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
            title="Inspect record"
            className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => void handleEdit(row.original)}
            title="Edit record"
            className="rounded p-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/50 transition-colors"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => void handleDelete(row.original)}
            title="Delete record"
            className="rounded p-1.5 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/50 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
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
    const okToProceed = await ensureGithubWriteOrContinue();
    if (!okToProceed) return;
    const confirmed = await swalConfirmBulkDelete(selectedRows.length);
    if (!confirmed) return;

    const ids = selectedRows.map((r) => r._id);
    try {
      if (getGithubToken()) {
        void swalLoading("Deleting from GitHub JSON...", `Updating public/data/${meta.fileName}`);
      }
      const res = await bulkDeleteRecordsClient(meta.slug, ids);
      const idSet = new Set(ids);
      setRecords((prev) => prev.filter((r) => !idSet.has(r._id)));
      setRowSelection({});
      setMeta(res.meta);
      setManifest(res.manifest);
      await swalSuccess(
        "Bulk Delete Complete",
        res.githubSynced
          ? `${res.deletedCount} records deleted and committed to GitHub.`
          : `${res.deletedCount} records removed.`
      );
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
      await swalToast(`Exported ${exportTargetRows.length} rows (.xlsx)`, "success");
    } else if (format === "csv") {
      exportAsCsv(exportTargetRows, meta.columns, meta.slug);
      await swalToast(`Exported ${exportTargetRows.length} rows (.csv)`, "success");
    } else if (format === "json") {
      exportAsJson(exportTargetRows, meta.slug);
      await swalToast(`Exported ${exportTargetRows.length} rows (.json)`, "success");
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
      const res = await syncFromGithubClient(meta.slug);
      setRecords(res.records);
      setMeta(res.meta);
      setManifest(res.manifest);
      await swalSuccess(
        "Synced from GitHub",
        `Loaded ${res.records.length} records from public GitHub JSON.`
      );
    } catch (err) {
      await swalError(
        "GitHub Sync Error",
        err instanceof Error
          ? err.message
          : "Verify the JSON files are pushed to GitHub main branch."
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
    density === "compact" ? "py-1.5 px-3" : density === "comfortable" ? "py-3.5 px-4" : "py-2.5 px-3.5";

  const showCardsOnMobile = viewMode === "auto" ? "block md:hidden" : viewMode === "cards" ? "block" : "hidden";
  const showTableOnDesktop = viewMode === "auto" ? "hidden md:block" : viewMode === "table" ? "block" : "hidden";

  return (
    <AppShell
      manifest={manifest}
      user={user}
      dataSource={dataSource}
      onChangeDataSource={handleSourceChange}
    >
      <div className="mx-auto max-w-[1600px] space-y-4">
        {/* Page Header */}
        <FadeInSection>
          <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
                  <DatasetIcon name={meta.icon} className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl dark:text-white">
                      {meta.title}
                    </h1>
                    <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {records.length} rows
                    </span>
                    <span className="hidden sm:inline-block rounded border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      Sheet: {meta.sheetName}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500 sm:text-sm dark:text-slate-400">
                    {meta.description}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="no-print flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleSyncGithub()}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors"
                >
                  <Github className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Sync GitHub</span>
                  <span className="sm:hidden">Sync</span>
                </button>

                <button
                  type="button"
                  onClick={() => void reloadData(dataSource)}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setExportMenuOpen((v) => !v)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export ({exportTargetRows.length})
                  </button>
                  <AnimatePresence>
                    {exportMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        transition={{ duration: 0.12 }}
                        className="absolute left-0 sm:left-auto sm:right-0 z-30 mt-1.5 w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-800 dark:bg-slate-900"
                      >
                        <button
                          type="button"
                          onClick={() => void runExport("xlsx")}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                          Excel (.xlsx)
                        </button>
                        <button
                          type="button"
                          onClick={() => void runExport("csv")}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <FileText className="h-3.5 w-3.5 text-sky-600" />
                          CSV (.csv)
                        </button>
                        <button
                          type="button"
                          onClick={() => void runExport("json")}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <FileJson className="h-3.5 w-3.5 text-amber-600" />
                          JSON (.json)
                        </button>
                        <button
                          type="button"
                          onClick={() => void runExport("print")}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <Printer className="h-3.5 w-3.5 text-blue-600" />
                          Print / PDF
                        </button>
                        <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                        <button
                          type="button"
                          onClick={() => {
                            setExportMenuOpen(false);
                            void handleSweetExportWizard();
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40"
                        >
                          <SlidersHorizontal className="h-3.5 w-3.5" />
                          Export Wizard
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <button
                  type="button"
                  onClick={() => void handleCreate()}
                  className="ml-auto sm:ml-0 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Record
                </button>
              </div>
            </div>

            {/* Public JSON & GitHub Write Status Strip */}
            <div className="no-print mt-3.5 flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs lg:flex-row lg:items-center lg:justify-between dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <Github className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                <span
                  className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                    hasGhPat
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                  }`}
                >
                  {hasGhPat ? "Auto-Sync GitHub: ON" : "Browser Only (Connect Token for Auto-Sync)"}
                </span>
                <code className="truncate font-mono text-[11px] text-blue-600 dark:text-blue-400">
                  {meta.githubRawUrl}
                </code>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => void handleConnectTokenOnly()}
                  className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[11px] font-medium transition-colors ${
                    hasGhPat
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                  }`}
                >
                  {hasGhPat ? "Token Active" : "Connect GitHub Token"}
                </button>
                {!hasGhPat && (
                  <button
                    type="button"
                    onClick={() => void handlePushLocalToGithub()}
                    disabled={loading}
                    className="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                  >
                    Sync Local Edits
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void copyValue(meta.githubRawUrl, "gh-raw-url")}
                  className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  {copiedId === "gh-raw-url" ? (
                    <Check className="h-3 w-3 text-emerald-600" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  Copy Raw
                </button>
                <a
                  href={meta.githubBlobUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  GitHub File <ExternalLink className="h-3 w-3" />
                </a>
                <a
                  href={withBasePath(meta.localUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  Pages JSON <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </FadeInSection>

        {/* Filter & Controls Toolbar */}
        <FadeInSection delay={0.04} className="no-print">
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-3 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  placeholder={`Search ${meta.title}...`}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-8 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
                {globalFilter && (
                  <button
                    type="button"
                    onClick={() => setGlobalFilter("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {(globalFilter || columnFilters.length > 0 || sorting.length > 0) && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
                  >
                    <FilterX className="h-3.5 w-3.5" />
                    Reset
                  </button>
                )}

                {/* Responsive Layout Toggle (Auto / Table / Cards) */}
                <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs dark:border-slate-700 dark:bg-slate-950">
                  <button
                    type="button"
                    onClick={() => setViewMode("table")}
                    title="Table View"
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium transition-colors ${
                      viewMode === "table"
                        ? "bg-white text-blue-600 shadow-2xs dark:bg-slate-800 dark:text-blue-400"
                        : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
                    }`}
                  >
                    <Table2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Table</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("cards")}
                    title="Cards View"
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium transition-colors ${
                      viewMode === "cards"
                        ? "bg-white text-blue-600 shadow-2xs dark:bg-slate-800 dark:text-blue-400"
                        : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
                    }`}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Cards</span>
                  </button>
                </div>

                {/* Density */}
                <div className="hidden sm:flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs dark:border-slate-700 dark:bg-slate-950">
                  {(["compact", "normal", "comfortable"] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDensity(d)}
                      className={`rounded-md px-2 py-1 capitalize font-medium transition-colors ${
                        density === d
                          ? "bg-white text-slate-900 shadow-2xs dark:bg-slate-800 dark:text-white"
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
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <Columns3 className="h-3.5 w-3.5" />
                    Columns
                  </button>
                  <AnimatePresence>
                    {colMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        transition={{ duration: 0.12 }}
                        className="absolute right-0 z-30 mt-1.5 max-h-64 w-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-800 dark:bg-slate-900"
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
                                className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600"
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

            {facetedFilters.length > 0 && (
              <div className="grid grid-cols-1 gap-2 border-t border-slate-100 pt-3 sm:grid-cols-2 lg:grid-cols-4 dark:border-slate-800">
                {facetedFilters.map(({ col, options }) => {
                  const activeVal =
                    (columnFilters.find((f) => f.id === col.key)?.value as string) || "";
                  return (
                    <div key={col.key}>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        {col.label}
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
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
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

        {/* Bulk Selection Bar */}
        <AnimatePresence>
          {selectedRows.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="no-print flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs dark:border-blue-800 dark:bg-blue-950/50"
            >
              <span className="font-semibold text-blue-900 dark:text-blue-200">
                {selectedRows.length} row{selectedRows.length > 1 ? "s" : ""} selected
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void runExport("xlsx")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                  Export Selected
                </button>
                <button
                  type="button"
                  onClick={() => void handleBulkDelete()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-2.5 py-1.5 font-medium text-white hover:bg-rose-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete ({selectedRows.length})
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Data Surface (Responsive Mobile Cards + Desktop DataTable) */}
        <FadeInSection delay={0.08}>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            {/* Mobile Cards View */}
            <div className={`${showCardsOnMobile} divide-y divide-slate-100 dark:divide-slate-800`}>
              {table.getRowModel().rows.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                  No records match your search or filters.
                </div>
              ) : (
                table.getRowModel().rows.map((row) => {
                  const rec = row.original;
                  const previewCols = meta.columns.slice(0, 5);
                  return (
                    <div
                      key={row.id}
                      className={`p-3.5 space-y-2.5 ${
                        row.getIsSelected() ? "bg-blue-50/60 dark:bg-blue-950/30" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={row.getIsSelected()}
                            onChange={row.getToggleSelectedHandler()}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                              {String(rec[meta.columns[0]?.key] || rec._id)}
                            </p>
                            {meta.columns[1] && (
                              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                {meta.columns[1].label}:{" "}
                                {meta.columns[1].sensitive
                                  ? "••••••••"
                                  : String(rec[meta.columns[1].key] || "—")}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => setInspectRecord(rec)}
                            className="rounded border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                            title="Inspect"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleEdit(rec)}
                            className="rounded border border-slate-200 p-1.5 text-blue-600 hover:bg-blue-50 dark:border-slate-700 dark:text-blue-400"
                            title="Edit"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(rec)}
                            className="rounded border border-slate-200 p-1.5 text-rose-600 hover:bg-rose-50 dark:border-slate-700 dark:text-rose-400"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pl-6 text-xs">
                        {previewCols.slice(2).map((col) => {
                          const val = String(rec[col.key] ?? "").trim();
                          return (
                            <div key={col.key} className="min-w-0">
                              <p className="truncate text-[10px] font-medium uppercase text-slate-400">
                                {col.label}
                              </p>
                              <p className="truncate font-medium text-slate-700 dark:text-slate-200">
                                {col.sensitive ? "••••••••" : val || "—"}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Table View */}
            <div className={`${showTableOnDesktop} overflow-x-auto`}>
              <table className="w-full border-collapse text-left text-xs">
                <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => {
                        const canSort = header.column.getCanSort();
                        const sorted = header.column.getIsSorted();
                        return (
                          <th
                            key={header.id}
                            onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                            className={`whitespace-nowrap px-3.5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 ${
                              canSort
                                ? "cursor-pointer select-none hover:text-slate-900 dark:hover:text-white"
                                : ""
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {canSort && (
                                <span className="text-slate-400">
                                  {sorted === "asc" ? (
                                    <ArrowUp className="h-3 w-3 text-blue-600" />
                                  ) : sorted === "desc" ? (
                                    <ArrowDown className="h-3 w-3 text-blue-600" />
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
                        className="py-14 text-center text-sm text-slate-500 dark:text-slate-400"
                      >
                        No records match your current search or filters.
                      </td>
                    </tr>
                  ) : (
                    table.getRowModel().rows.map((row) => (
                      <tr
                        key={row.id}
                        onDoubleClick={() => setInspectRecord(row.original)}
                        className={`transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                          row.getIsSelected() ? "bg-blue-50/50 dark:bg-blue-950/30" : ""
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
            <div className="no-print flex flex-col gap-3 border-t border-slate-200 bg-slate-50/70 px-4 py-2.5 text-xs sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex flex-wrap items-center justify-between gap-2 text-slate-500 dark:text-slate-400">
                <span>
                  Showing{" "}
                  <strong className="text-slate-900 dark:text-white">
                    {table.getRowModel().rows.length}
                  </strong>{" "}
                  of{" "}
                  <strong className="text-slate-900 dark:text-white">
                    {filteredRows.length}
                  </strong>{" "}
                  rows
                </span>
                <select
                  value={table.getState().pagination.pageSize}
                  onChange={(e) => table.setPageSize(Number(e.target.value))}
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  {[10, 15, 25, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      {size} / page
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-center sm:justify-end gap-1">
                <button
                  type="button"
                  onClick={() => table.setPageIndex(0)}
                  disabled={!table.getCanPreviousPage()}
                  className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  <ChevronsLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="px-2.5 font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {table.getState().pagination.pageIndex + 1} / {Math.max(1, table.getPageCount())}
                </span>
                <button
                  type="button"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                  disabled={!table.getCanNextPage()}
                  className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  <ChevronsRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </FadeInSection>
      </div>

      {/* Record Inspector Drawer */}
      <AnimatePresence>
        {inspectRecord && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setInspectRecord(null)}
              className="fixed inset-0 z-40 bg-slate-950/50"
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed inset-y-0 right-0 z-50 flex w-full sm:max-w-lg flex-col border-l border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 dark:border-slate-800">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Record Details
                  </h3>
                  <p className="truncate font-mono text-xs text-slate-500 dark:text-slate-400">
                    {inspectRecord._id}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectRecord(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5">
                {meta.columns.map((col) => {
                  const val = String(inspectRecord[col.key] ?? "").trim();
                  return (
                    <div
                      key={col.key}
                      className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/50"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          {col.label}
                        </span>
                        {val && (
                          <button
                            type="button"
                            onClick={() => void copyValue(val, `drawer-${col.key}`)}
                            className="text-slate-400 hover:text-blue-600"
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

              <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-3.5 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => void handleDelete(inspectRecord)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => void handleEdit(inspectRecord)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Edit Record
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </AppShell>
  );
}
