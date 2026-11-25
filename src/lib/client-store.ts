"use client";

import type {
  AuthUser,
  DashboardOverviewStats,
  DataRecord,
  DatasetManifest,
  DatasetMeta,
} from "./types";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";
const GITHUB_OWNER = process.env.NEXT_PUBLIC_GITHUB_OWNER || "codesi7";
const GITHUB_REPO = process.env.NEXT_PUBLIC_GITHUB_REPO || "codesi7.github.io";
const GITHUB_BRANCH = process.env.NEXT_PUBLIC_GITHUB_BRANCH || "main";
const GITHUB_DATA_PATH = process.env.NEXT_PUBLIC_GITHUB_DATA_PATH || "public/data";

const SESSION_KEY = "codei7_session_user";
const PAT_KEY = "codei7_github_pat";
const MANIFEST_STORAGE_KEY = "codei7_manifest_override";
const DS_STORAGE_PREFIX = "codei7_ds_";

export function withBasePath(path: string): string {
  if (!path.startsWith("/")) return `${BASE_PATH}/${path}`;
  return `${BASE_PATH}${path}`;
}

export function getGithubRawUrl(fileName: string): string {
  return `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${GITHUB_DATA_PATH}/${fileName}`;
}

export function getGithubToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(PAT_KEY) || "";
}

export function setGithubToken(token: string) {
  if (typeof window === "undefined") return;
  const clean = token.trim();
  if (clean) {
    localStorage.setItem(PAT_KEY, clean);
  } else {
    localStorage.removeItem(PAT_KEY);
  }
  window.dispatchEvent(new Event("codei7-gh-token-changed"));
}

export async function verifyGithubToken(token: string): Promise<{ valid: boolean; message: string }> {
  const clean = token.trim();
  if (!clean) return { valid: false, message: "Token cannot be empty." };
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}?_=${Date.now()}`,
      {
        headers: {
          Authorization: `Bearer ${clean}`,
          Accept: "application/vnd.github+json",
        },
      }
    );
    if (!res.ok) {
      if (res.status === 401) return { valid: false, message: "Invalid or expired GitHub token." };
      if (res.status === 404) {
        return {
          valid: false,
          message: `Token cannot access ${GITHUB_OWNER}/${GITHUB_REPO}. Check repository permissions.`,
        };
      }
      return { valid: false, message: `GitHub API returned HTTP ${res.status}.` };
    }
    const repo = (await res.json()) as { permissions?: { push?: boolean } };
    if (repo.permissions && repo.permissions.push === false) {
      return {
        valid: false,
        message: "Token has read-only access. Enable Contents: Read & Write (or repo scope).",
      };
    }
    return { valid: true, message: `Connected to ${GITHUB_OWNER}/${GITHUB_REPO}` };
  } catch (err) {
    return {
      valid: false,
      message: err instanceof Error ? err.message : "Network error verifying token.",
    };
  }
}

export function getSessionUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function logoutUser() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
}

function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function fetchGithubApiJson<T>(fileName: string, token: string): Promise<T> {
  const repoFilePath = `${GITHUB_DATA_PATH}/${fileName}`;
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${repoFilePath}?ref=${GITHUB_BRANCH}&_=${Date.now()}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.raw+json",
    },
  });
  if (!res.ok) {
    throw new Error(`GitHub API read failed (${res.status}) for ${fileName}`);
  }
  return (await res.json()) as T;
}

async function pushFileToGithubClient(
  fileName: string,
  content: string,
  message: string,
  token: string
) {
  const repoFilePath = `${GITHUB_DATA_PATH}/${fileName}`;
  const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${repoFilePath}`;

  let sha: string | undefined;
  const getRes = await fetch(`${apiUrl}?ref=${GITHUB_BRANCH}&_=${Date.now()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
  });
  if (getRes.ok) {
    const existing = (await getRes.json()) as { sha?: string };
    sha = existing.sha;
  }

  const putRes = await fetch(apiUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      content: utf8ToBase64(content),
      branch: GITHUB_BRANCH,
      ...(sha ? { sha } : {}),
    }),
  });

  if (!putRes.ok) {
    const txt = await putRes.text();
    throw new Error(`GitHub commit failed (${putRes.status}): ${txt}`);
  }
}

export async function loadManifestClient(
  source: "local" | "github" = "local"
): Promise<DatasetManifest> {
  const pat = getGithubToken();

  if (source === "github") {
    if (pat) {
      try {
        return await fetchGithubApiJson<DatasetManifest>("manifest.json", pat);
      } catch {
        // fall through
      }
    }
    const ghRes = await fetch(`${getGithubRawUrl("manifest.json")}?_=${Date.now()}`);
    if (ghRes.ok) return (await ghRes.json()) as DatasetManifest;
  }

  if (typeof window !== "undefined") {
    const cached = localStorage.getItem(MANIFEST_STORAGE_KEY);
    if (cached) {
      try {
        return JSON.parse(cached) as DatasetManifest;
      } catch {
        // ignore invalid
      }
    }
  }

  // If GitHub PAT is active and no local override, read fresh from GitHub API
  if (pat) {
    try {
      return await fetchGithubApiJson<DatasetManifest>("manifest.json", pat);
    } catch {
      // fall through
    }
  }

  const localRes = await fetch(withBasePath("/data/manifest.json"));
  if (localRes.ok) {
    return (await localRes.json()) as DatasetManifest;
  }

  const fallbackRes = await fetch(`${getGithubRawUrl("manifest.json")}?_=${Date.now()}`);
  if (!fallbackRes.ok) throw new Error("Unable to load dataset manifest.");
  return (await fallbackRes.json()) as DatasetManifest;
}

export async function loadDatasetClient(
  slug: string,
  source: "local" | "github" = "local"
): Promise<{ records: DataRecord[]; meta: DatasetMeta; manifest: DatasetManifest }> {
  const manifest = await loadManifestClient(source);
  const meta = manifest.datasets.find((d) => d.slug === slug);
  if (!meta) throw new Error(`Dataset "${slug}" not found.`);

  const pat = getGithubToken();

  if (source === "github") {
    if (pat) {
      try {
        const records = await fetchGithubApiJson<DataRecord[]>(meta.fileName, pat);
        localStorage.setItem(`${DS_STORAGE_PREFIX}${slug}`, JSON.stringify(records, null, 2));
        return { records, meta, manifest };
      } catch {
        // fall through
      }
    }
    const ghRes = await fetch(`${meta.githubRawUrl}?_=${Date.now()}`);
    if (ghRes.ok) {
      return { records: (await ghRes.json()) as DataRecord[], meta, manifest };
    }
  }

  if (typeof window !== "undefined") {
    const localOverride = localStorage.getItem(`${DS_STORAGE_PREFIX}${slug}`);
    if (localOverride) {
      try {
        return { records: JSON.parse(localOverride) as DataRecord[], meta, manifest };
      } catch {
        // ignore
      }
    }
  }

  if (pat) {
    try {
      const records = await fetchGithubApiJson<DataRecord[]>(meta.fileName, pat);
      return { records, meta, manifest };
    } catch {
      // fall through
    }
  }

  const res = await fetch(withBasePath(meta.localUrl));
  if (res.ok) {
    return { records: (await res.json()) as DataRecord[], meta, manifest };
  }

  const fallbackRes = await fetch(`${meta.githubRawUrl}?_=${Date.now()}`);
  if (!fallbackRes.ok) throw new Error(`Unable to load "${slug}" dataset.`);
  return { records: (await fallbackRes.json()) as DataRecord[], meta, manifest };
}

export async function loginWithSheet(emailInput: string, passwordInput: string): Promise<AuthUser> {
  const email = emailInput.trim().toLowerCase();
  const password = passwordInput.trim();
  if (!email || !password) {
    throw new Error("Email and password are required.");
  }

  const { records } = await loadDatasetClient("login", "local");
  const matched = records.find(
    (u) =>
      String(u.email || "").trim().toLowerCase() === email &&
      String(u.password || "").trim() === password
  );

  if (!matched) {
    throw new Error("Invalid credentials. Check your email and password.");
  }

  const status = String(matched.status || "").trim().toLowerCase();
  if (status && status !== "active") {
    throw new Error("This account is inactive. Contact an administrator.");
  }

  const user: AuthUser = {
    _id: matched._id,
    name: String(matched.name || "Admin"),
    email: String(matched.email || email),
    role: String(matched.role || "admin"),
    status: String(matched.status || "active"),
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return user;
}

async function persistDatasetClient(
  slug: string,
  records: DataRecord[]
): Promise<{ meta: DatasetMeta; manifest: DatasetManifest; githubSynced: boolean }> {
  const manifest = await loadManifestClient("local");
  const idx = manifest.datasets.findIndex((d) => d.slug === slug);
  if (idx === -1) throw new Error(`Dataset "${slug}" not found.`);

  const meta = manifest.datasets[idx];
  const now = new Date().toISOString();
  const updatedMeta: DatasetMeta = {
    ...meta,
    recordCount: records.length,
    updatedAt: now,
  };

  const nextDatasets = [...manifest.datasets];
  nextDatasets[idx] = updatedMeta;

  const nextManifest: DatasetManifest = {
    ...manifest,
    generatedAt: now,
    totalRecords: nextDatasets.reduce((sum, d) => sum + d.recordCount, 0),
    datasets: nextDatasets,
  };

  const serializedRecords = JSON.stringify(records, null, 2);
  const serializedManifest = JSON.stringify(nextManifest, null, 2);

  localStorage.setItem(`${DS_STORAGE_PREFIX}${slug}`, serializedRecords);
  localStorage.setItem(MANIFEST_STORAGE_KEY, serializedManifest);

  let githubSynced = false;
  const pat = getGithubToken();
  if (pat) {
    await pushFileToGithubClient(
      meta.fileName,
      serializedRecords,
      `chore(data): update ${meta.fileName} via Admin Dashboard`,
      pat
    );
    await pushFileToGithubClient(
      "manifest.json",
      serializedManifest,
      `chore(data): update manifest.json counts`,
      pat
    );
    githubSynced = true;
  }

  return { meta: updatedMeta, manifest: nextManifest, githubSynced };
}

export async function pushCurrentDatasetToGithub(slug: string): Promise<{
  meta: DatasetMeta;
  manifest: DatasetManifest;
  recordCount: number;
}> {
  const pat = getGithubToken();
  if (!pat) {
    throw new Error("Connect a GitHub Personal Access Token first.");
  }
  const { records } = await loadDatasetClient(slug, "local");
  const saved = await persistDatasetClient(slug, records);
  return { meta: saved.meta, manifest: saved.manifest, recordCount: records.length };
}

export async function createRecordClient(
  slug: string,
  payload: Record<string, unknown>
): Promise<{
  record: DataRecord;
  meta: DatasetMeta;
  manifest: DatasetManifest;
  githubSynced: boolean;
}> {
  const { records, meta } = await loadDatasetClient(slug, "local");
  const cleanRecord: DataRecord = {
    _id: `${slug}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  };
  for (const col of meta.columns) {
    const val = payload[col.key];
    cleanRecord[col.key] = val === undefined || val === null ? "" : (val as string | number);
  }
  const updated = [cleanRecord, ...records];
  const saved = await persistDatasetClient(slug, updated);
  return { record: cleanRecord, ...saved };
}

export async function updateRecordClient(
  slug: string,
  id: string,
  payload: Record<string, unknown>
): Promise<{
  record: DataRecord;
  meta: DatasetMeta;
  manifest: DatasetManifest;
  githubSynced: boolean;
}> {
  const { records, meta } = await loadDatasetClient(slug, "local");
  const idx = records.findIndex((r) => r._id === id);
  if (idx === -1) throw new Error(`Record "${id}" not found.`);

  const updatedRecord: DataRecord = { ...records[idx] };
  for (const col of meta.columns) {
    if (col.key in payload) {
      const val = payload[col.key];
      updatedRecord[col.key] = val === undefined || val === null ? "" : (val as string | number);
    }
  }
  const updated = [...records];
  updated[idx] = updatedRecord;
  const saved = await persistDatasetClient(slug, updated);
  return { record: updatedRecord, ...saved };
}

export async function deleteRecordClient(
  slug: string,
  id: string
): Promise<{
  deletedId: string;
  meta: DatasetMeta;
  manifest: DatasetManifest;
  githubSynced: boolean;
}> {
  const { records } = await loadDatasetClient(slug, "local");
  const filtered = records.filter((r) => r._id !== id);
  if (filtered.length === records.length) throw new Error(`Record "${id}" not found.`);
  const saved = await persistDatasetClient(slug, filtered);
  return { deletedId: id, ...saved };
}

export async function bulkDeleteRecordsClient(
  slug: string,
  ids: string[]
): Promise<{
  deletedCount: number;
  meta: DatasetMeta;
  manifest: DatasetManifest;
  githubSynced: boolean;
}> {
  const idSet = new Set(ids);
  const { records } = await loadDatasetClient(slug, "local");
  const filtered = records.filter((r) => !idSet.has(r._id));
  const deletedCount = records.length - filtered.length;
  const saved = await persistDatasetClient(slug, filtered);
  return { deletedCount, ...saved };
}

export async function syncFromGithubClient(slug: string): Promise<{
  records: DataRecord[];
  meta: DatasetMeta;
  manifest: DatasetManifest;
}> {
  const manifest = await loadManifestClient("github");
  const meta = manifest.datasets.find((d) => d.slug === slug);
  if (!meta) throw new Error(`Dataset "${slug}" not found.`);

  const pat = getGithubToken();
  let remoteRecords: DataRecord[];
  if (pat) {
    remoteRecords = await fetchGithubApiJson<DataRecord[]>(meta.fileName, pat);
  } else {
    const res = await fetch(`${meta.githubRawUrl}?_=${Date.now()}`);
    if (!res.ok) throw new Error(`GitHub Raw fetch failed (${res.status}).`);
    remoteRecords = (await res.json()) as DataRecord[];
  }

  localStorage.setItem(`${DS_STORAGE_PREFIX}${slug}`, JSON.stringify(remoteRecords, null, 2));
  localStorage.setItem(MANIFEST_STORAGE_KEY, JSON.stringify(manifest, null, 2));
  return { records: remoteRecords, meta, manifest };
}

export async function loadOverviewClient(
  source: "local" | "github" = "local"
): Promise<{ manifest: DatasetManifest; stats: DashboardOverviewStats }> {
  const manifest = await loadManifestClient(source);

  const [
    ticketsRes,
    camerasRes,
    outletRes,
    corpRes,
    internetRes,
    edcRes,
    stockRes,
  ] = await Promise.all([
    loadDatasetClient("know-ticket", source),
    loadDatasetClient("camera", source),
    loadDatasetClient("outlet-laptop", source),
    loadDatasetClient("corporate-laptop", source),
    loadDatasetClient("internet", source),
    loadDatasetClient("edc", source),
    loadDatasetClient("stock", source),
  ]);

  const tickets = ticketsRes.records;
  const cameras = camerasRes.records;
  const outlets = outletRes.records;
  const corpLaptops = corpRes.records;

  const categoryMap = new Map<string, number>();
  const severityMap = new Map<string, number>();
  const statusMap = new Map<string, number>();
  let openTickets = 0;
  let criticalHighTickets = 0;

  for (const t of tickets) {
    const cat = String(t["Category"] || "Uncategorized").trim() || "Uncategorized";
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);

    const sevRaw = String(t["Severity"] || "-").trim();
    const sev = sevRaw === "-" || !sevRaw ? "Unspecified" : sevRaw;
    severityMap.set(sev, (severityMap.get(sev) || 0) + 1);
    if (["critical", "high"].includes(sev.toLowerCase())) {
      criticalHighTickets++;
    }

    const st = String(t["Status"] || "Unknown").trim() || "Unknown";
    statusMap.set(st, (statusMap.get(st) || 0) + 1);
    if (st.toLowerCase() === "open") {
      openTickets++;
    }
  }

  const activeCameras = cameras.filter(
    (c) => String(c["Status"] || "").trim().toLowerCase() === "active"
  ).length;

  const zoneMap = new Map<
    string,
    { zone: string; laptops: number; pos: number; printers: number; cameras: number }
  >();
  for (const o of outlets) {
    const zone = String(o["Zone"] || "Other").trim() || "Other";
    const cur = zoneMap.get(zone) || { zone, laptops: 0, pos: 0, printers: 0, cameras: 0 };
    cur.laptops += Number(o["Laptop Quantity"]) || 0;
    cur.pos += Number(o["POS Quantity"]) || 0;
    cur.printers += Number(o["Printer Quantity"]) || 0;
    cur.cameras += Number(o["Camera"]) || 0;
    zoneMap.set(zone, cur);
  }

  const stats: DashboardOverviewStats = {
    totalDatasets: manifest.totalDatasets,
    totalRecords: manifest.totalRecords,
    totalTickets: tickets.length,
    openTickets,
    criticalHighTickets,
    totalCameras: cameras.length,
    activeCameras,
    totalOutlets: outlets.length,
    totalCorporateLaptops: corpLaptops.length,
    totalInternetLinks: internetRes.records.length,
    totalEdcTerminals: edcRes.records.length,
    ticketByCategory: Array.from(categoryMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 7),
    ticketBySeverity: Array.from(severityMap.entries()).map(([name, value]) => ({
      name,
      value,
    })),
    ticketByStatus: Array.from(statusMap.entries()).map(([name, value]) => ({
      name,
      value,
    })),
    hardwareByZone: Array.from(zoneMap.values())
      .sort((a, b) => b.laptops + b.pos - (a.laptops + a.pos))
      .slice(0, 8),
    recentTickets: tickets.slice(0, 6),
    recentStock: stockRes.records.slice(0, 6),
  };

  return { manifest, stats };
}
