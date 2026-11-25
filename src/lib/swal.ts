import Swal from "sweetalert2";
import type { ColumnSchema, DataRecord } from "./types";

function isDarkMode(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

function baseThemeOptions() {
  const dark = isDarkMode();
  return {
    background: dark ? "#0f172a" : "#ffffff",
    color: dark ? "#f1f5f9" : "#0f172a",
    customClass: {
      popup: "rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xl",
      title: "font-semibold tracking-tight text-lg",
      confirmButton:
        "px-5 py-2.5 rounded-xl font-medium text-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all mx-1.5",
      cancelButton:
        "px-5 py-2.5 rounded-xl font-medium text-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all mx-1.5",
      denyButton:
        "px-5 py-2.5 rounded-xl font-medium text-sm bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all mx-1.5",
    },
    buttonsStyling: false,
  };
}

export function swalToast(
  title: string,
  icon: "success" | "error" | "info" | "warning" = "success"
) {
  const dark = isDarkMode();
  return Swal.fire({
    toast: true,
    position: "top-end",
    icon,
    title,
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    background: dark ? "#1e293b" : "#ffffff",
    color: dark ? "#f8fafc" : "#0f172a",
    customClass: {
      popup: "rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg",
    },
  });
}

export function swalSuccess(title: string, text?: string) {
  return Swal.fire({
    ...baseThemeOptions(),
    icon: "success",
    title,
    text,
    confirmButtonText: "Done",
  });
}

export function swalError(title: string, text?: string) {
  return Swal.fire({
    ...baseThemeOptions(),
    icon: "error",
    title,
    text,
    confirmButtonText: "Close",
  });
}

export async function swalConfirmDelete(recordLabel: string, id: string): Promise<boolean> {
  const result = await Swal.fire({
    ...baseThemeOptions(),
    icon: "warning",
    title: "Delete Record?",
    html: `<div class="text-sm text-slate-500 dark:text-slate-400 space-y-2">
      <p>You are about to permanently remove <strong class="text-slate-900 dark:text-white">${escapeHtml(recordLabel)}</strong>.</p>
      <p class="font-mono text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 inline-block">ID: ${escapeHtml(id)}</p>
      <p class="text-rose-500 text-xs font-medium">This action updates the live JSON dataset and cannot be undone.</p>
    </div>`,
    showCancelButton: true,
    confirmButtonText: "Yes, Delete Record",
    cancelButtonText: "Cancel",
    customClass: {
      ...baseThemeOptions().customClass,
      confirmButton:
        "px-5 py-2.5 rounded-xl font-medium text-sm bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all mx-1.5",
    },
  });
  return result.isConfirmed;
}

export async function swalConfirmBulkDelete(count: number): Promise<boolean> {
  const result = await Swal.fire({
    ...baseThemeOptions(),
    icon: "warning",
    title: `Delete ${count} Selected Records?`,
    html: `<p class="text-sm text-slate-500 dark:text-slate-400">All <strong class="text-rose-600">${count}</strong> selected rows will be permanently removed from the JSON datastore.</p>`,
    showCancelButton: true,
    confirmButtonText: `Delete ${count} Records`,
    cancelButtonText: "Keep Records",
    customClass: {
      ...baseThemeOptions().customClass,
      confirmButton:
        "px-5 py-2.5 rounded-xl font-medium text-sm bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all mx-1.5",
    },
  });
  return result.isConfirmed;
}

export async function swalConfirmSave(mode: "create" | "edit", datasetTitle: string): Promise<boolean> {
  const result = await Swal.fire({
    ...baseThemeOptions(),
    icon: "question",
    title: mode === "create" ? `Add New ${datasetTitle} Entry?` : `Save Changes to ${datasetTitle}?`,
    text:
      mode === "create"
        ? "This new record will be appended to the public JSON dataset immediately."
        : "The existing record will be updated in the JSON dataset.",
    showCancelButton: true,
    confirmButtonText: mode === "create" ? "Confirm & Create" : "Confirm & Update",
    cancelButtonText: "Review Again",
  });
  return result.isConfirmed;
}

export async function swalRecordFormModal(options: {
  mode: "create" | "edit";
  datasetTitle: string;
  columns: ColumnSchema[];
  initialData?: DataRecord;
}): Promise<Record<string, string | number> | null> {
  const { mode, datasetTitle, columns, initialData } = options;
  const dark = isDarkMode();

  const inputHtml = columns
    .map((col, idx) => {
      const val = initialData ? String(initialData[col.key] ?? "") : "";
      const safeId = `swal-field-${idx}`;
      const inputCls = `w-full px-3 py-2 text-sm rounded-lg border ${
        dark
          ? "bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500"
          : "bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400"
      } focus:outline-none focus:ring-2 focus:ring-indigo-500`;

      if (col.type === "textarea") {
        return `<div class="text-left">
          <label for="${safeId}" class="block text-xs font-semibold uppercase tracking-wider mb-1 ${
          dark ? "text-slate-300" : "text-slate-600"
        }">${escapeHtml(col.label)}</label>
          <textarea id="${safeId}" rows="3" class="${inputCls}" placeholder="Enter ${escapeHtml(col.label)}...">${escapeHtml(val)}</textarea>
        </div>`;
      }

      const htmlType =
        col.type === "number"
          ? "number"
          : col.type === "email"
          ? "email"
          : col.type === "url"
          ? "url"
          : "text";

      return `<div class="text-left">
        <label for="${safeId}" class="block text-xs font-semibold uppercase tracking-wider mb-1 ${
        dark ? "text-slate-300" : "text-slate-600"
      }">${escapeHtml(col.label)}</label>
        <input id="${safeId}" type="${htmlType}" value="${escapeAttr(val)}" class="${inputCls}" placeholder="Enter ${escapeHtml(col.label)}..." />
      </div>`;
    })
    .join("");

  const result = await Swal.fire({
    ...baseThemeOptions(),
    title: mode === "create" ? `Create ${datasetTitle} Record` : `Edit ${datasetTitle} Record`,
    width: columns.length > 6 ? "760px" : "560px",
    html: `
      <div class="grid grid-cols-1 ${columns.length > 5 ? "sm:grid-cols-2" : ""} gap-3.5 max-h-[60vh] overflow-y-auto px-1 py-2">
        ${inputHtml}
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: mode === "create" ? "Create Record" : "Update Record",
    cancelButtonText: "Cancel",
    focusConfirm: false,
    preConfirm: () => {
      const payload: Record<string, string | number> = {};
      let hasAnyValue = false;

      columns.forEach((col, idx) => {
        const el = document.getElementById(`swal-field-${idx}`) as
          | HTMLInputElement
          | HTMLTextAreaElement
          | null;
        const raw = el ? el.value.trim() : "";
        if (raw !== "") hasAnyValue = true;
        if (col.type === "number" && raw !== "") {
          const num = Number(raw);
          payload[col.key] = Number.isNaN(num) ? raw : num;
        } else {
          payload[col.key] = raw;
        }
      });

      if (!hasAnyValue) {
        Swal.showValidationMessage("Please fill in at least one field before saving.");
        return false;
      }
      return payload;
    },
  });

  if (!result.isConfirmed || !result.value) return null;
  return result.value as Record<string, string | number>;
}

export async function swalLogoutConfirm(): Promise<boolean> {
  const result = await Swal.fire({
    ...baseThemeOptions(),
    icon: "question",
    title: "Sign Out of Admin Portal?",
    text: "Your active corporate session will be terminated securely.",
    showCancelButton: true,
    confirmButtonText: "Sign Out",
    cancelButtonText: "Stay Signed In",
  });
  return result.isConfirmed;
}

export async function swalSyncGithubConfirm(githubRawUrl: string): Promise<boolean> {
  const result = await Swal.fire({
    ...baseThemeOptions(),
    icon: "info",
    title: "Sync Live from GitHub JSON?",
    html: `<div class="text-sm text-slate-500 dark:text-slate-400 space-y-2">
      <p>Fetch the latest public JSON snapshot directly from GitHub:</p>
      <code class="block text-[11px] p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 break-all text-indigo-600 dark:text-indigo-400">${escapeHtml(githubRawUrl)}</code>
    </div>`,
    showCancelButton: true,
    confirmButtonText: "Pull from GitHub",
    cancelButtonText: "Cancel",
  });
  return result.isConfirmed;
}

export async function swalExportPicker(rowCount: number): Promise<"xlsx" | "csv" | "json" | "print" | null> {
  const result = await Swal.fire({
    ...baseThemeOptions(),
    icon: "info",
    title: "Export Dataset",
    html: `<p class="text-sm text-slate-500 dark:text-slate-400 mb-3">Choose export format for <strong>${rowCount}</strong> active rows:</p>`,
    input: "select",
    inputOptions: {
      xlsx: "Excel Workbook (.xlsx)",
      csv: "CSV Spreadsheet (.csv)",
      json: "JSON Data (.json)",
      print: "Printable Executive Report (PDF/Print)",
    },
    inputValue: "xlsx",
    showCancelButton: true,
    confirmButtonText: "Download / Export",
    cancelButtonText: "Cancel",
  });
  if (!result.isConfirmed) return null;
  return result.value as "xlsx" | "csv" | "json" | "print";
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
