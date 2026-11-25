import * as XLSX from "xlsx";
import type { ColumnSchema, DataRecord } from "./types";

function stripInternal(records: DataRecord[], columns: ColumnSchema[]) {
  return records.map((rec) => {
    const clean: Record<string, string | number | boolean> = {};
    for (const col of columns) {
      const val = rec[col.key];
      clean[col.key] = val === undefined || val === null ? "" : (val as string | number | boolean);
    }
    return clean;
  });
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportAsXlsx(
  records: DataRecord[],
  columns: ColumnSchema[],
  slug: string
) {
  const rows = stripInternal(records, columns);
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, slug.slice(0, 31));
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  triggerDownload(blob, `${slug}-export-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportAsCsv(
  records: DataRecord[],
  columns: ColumnSchema[],
  slug: string
) {
  const headers = columns.map((c) => c.key);
  const escapeCsv = (val: unknown) => {
    const str = String(val ?? "");
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const lines = [
    headers.map(escapeCsv).join(","),
    ...records.map((r) => headers.map((h) => escapeCsv(r[h])).join(",")),
  ];
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
    type: "text/csv;charset=utf-8;",
  });
  triggerDownload(blob, `${slug}-export-${new Date().toISOString().slice(0, 10)}.csv`);
}

export function exportAsJson(records: DataRecord[], slug: string) {
  const json = JSON.stringify(records, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
  triggerDownload(blob, `${slug}-export-${new Date().toISOString().slice(0, 10)}.json`);
}
