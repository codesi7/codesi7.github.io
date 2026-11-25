import fs from "node:fs";
import path from "node:path";
import type { DataRecord, DatasetManifest, DatasetMeta } from "./types";

const DATA_DIR = path.join(process.cwd(), "public", "data");
const MANIFEST_PATH = path.join(DATA_DIR, "manifest.json");

const GITHUB_OWNER = process.env.NEXT_PUBLIC_GITHUB_OWNER || "codesi7";
const GITHUB_REPO = process.env.NEXT_PUBLIC_GITHUB_REPO || "codei7";
const GITHUB_BRANCH = process.env.NEXT_PUBLIC_GITHUB_BRANCH || "main";
const GITHUB_DATA_PATH = process.env.NEXT_PUBLIC_GITHUB_DATA_PATH || "public/data";

export function getGithubRawUrl(fileName: string): string {
  return `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${GITHUB_DATA_PATH}/${fileName}`;
}

export function isGithubWriteEnabled(): boolean {
  return Boolean(process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN.trim().length > 0);
}

async function fetchFromGithubContentsApi<T>(fileName: string, token: string): Promise<T> {
  const repoFilePath = `${GITHUB_DATA_PATH}/${fileName}`;
  const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${repoFilePath}?ref=${GITHUB_BRANCH}`;
  const res = await fetch(apiUrl, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.raw+json",
      "User-Agent": "codei7-admin-dashboard",
    },
  });
  if (!res.ok) {
    throw new Error(`GitHub Contents API read failed (${res.status}) for ${repoFilePath}`);
  }
  return (await res.json()) as T;
}

export async function readManifest(source: "local" | "github" = "local"): Promise<DatasetManifest> {
  const token = process.env.GITHUB_TOKEN?.trim();

  // If on Vercel / production with GITHUB_TOKEN, prefer instant uncached Contents API read
  if ((source === "github" || process.env.VERCEL === "1") && token) {
    try {
      return await fetchFromGithubContentsApi<DatasetManifest>("manifest.json", token);
    } catch {
      // fall through to raw / local
    }
  }

  if (source === "github") {
    const res = await fetch(getGithubRawUrl("manifest.json"), { cache: "no-store" });
    if (res.ok) {
      return (await res.json()) as DatasetManifest;
    }
  }

  if (fs.existsSync(MANIFEST_PATH)) {
    const raw = fs.readFileSync(MANIFEST_PATH, "utf8");
    return JSON.parse(raw) as DatasetManifest;
  }

  const fallbackRes = await fetch(getGithubRawUrl("manifest.json"), { cache: "no-store" });
  if (!fallbackRes.ok) {
    throw new Error("Unable to load dataset manifest from local storage or GitHub.");
  }
  return (await fallbackRes.json()) as DatasetManifest;
}

export async function getDatasetMeta(slug: string): Promise<DatasetMeta | null> {
  const manifest = await readManifest("local");
  return manifest.datasets.find((d) => d.slug === slug) || null;
}

export async function readDatasetRecords(
  slug: string,
  source: "local" | "github" = "local"
): Promise<{ records: DataRecord[]; meta: DatasetMeta; sourceUsed: "local" | "github" }> {
  const manifest = await readManifest(source);
  const meta = manifest.datasets.find((d) => d.slug === slug);
  if (!meta) {
    throw new Error(`Dataset "${slug}" not found.`);
  }

  const token = process.env.GITHUB_TOKEN?.trim();

  // In production on Vercel with GITHUB_TOKEN, read directly from GitHub Contents API for zero-lag CRUD reads
  if ((source === "github" || process.env.VERCEL === "1") && token) {
    try {
      const records = await fetchFromGithubContentsApi<DataRecord[]>(meta.fileName, token);
      return { records, meta, sourceUsed: "github" };
    } catch {
      // fall through
    }
  }

  if (source === "github") {
    const res = await fetch(meta.githubRawUrl, { cache: "no-store" });
    if (res.ok) {
      const records = (await res.json()) as DataRecord[];
      return { records, meta, sourceUsed: "github" };
    }
  }

  const localPath = path.join(DATA_DIR, meta.fileName);
  if (fs.existsSync(localPath)) {
    const raw = fs.readFileSync(localPath, "utf8");
    return { records: JSON.parse(raw) as DataRecord[], meta, sourceUsed: "local" };
  }

  const fallbackRes = await fetch(meta.githubRawUrl, { cache: "no-store" });
  if (!fallbackRes.ok) {
    throw new Error(`Unable to load dataset "${slug}" locally or from GitHub.`);
  }
  const records = (await fallbackRes.json()) as DataRecord[];
  return { records, meta, sourceUsed: "github" };
}

async function persistDatasetAndManifest(
  slug: string,
  records: DataRecord[]
): Promise<{ meta: DatasetMeta; githubSynced: boolean; githubError?: string }> {
  const manifest = await readManifest("local");
  const idx = manifest.datasets.findIndex((d) => d.slug === slug);
  if (idx === -1) {
    throw new Error(`Dataset "${slug}" not found in manifest.`);
  }

  const meta = manifest.datasets[idx];
  const filePath = path.join(DATA_DIR, meta.fileName);
  const serializedRecords = JSON.stringify(records, null, 2);

  const now = new Date().toISOString();
  manifest.datasets[idx] = {
    ...meta,
    recordCount: records.length,
    updatedAt: now,
  };
  manifest.generatedAt = now;
  manifest.totalRecords = manifest.datasets.reduce((sum, d) => sum + d.recordCount, 0);

  const serializedManifest = JSON.stringify(manifest, null, 2);
  const ghToken = process.env.GITHUB_TOKEN?.trim();

  // Attempt local disk write (works locally / VPS; read-only on Vercel serverless)
  let localWritten = false;
  let localWriteError: unknown = null;
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(filePath, serializedRecords, "utf8");
    fs.writeFileSync(MANIFEST_PATH, serializedManifest, "utf8");
    localWritten = true;
  } catch (err) {
    localWriteError = err;
  }

  if (!localWritten && !ghToken) {
    const msg =
      localWriteError instanceof Error ? localWriteError.message : "Filesystem is read-only";
    throw new Error(
      `Cannot persist changes (${msg}). Set GITHUB_TOKEN in your deployment environment variables so CRUD writes directly to GitHub.`
    );
  }

  // Sync to GitHub Contents API whenever GITHUB_TOKEN is configured
  let githubSynced = false;
  let githubError: string | undefined;
  if (ghToken) {
    try {
      await pushFileToGithub(
        `${GITHUB_DATA_PATH}/${meta.fileName}`,
        serializedRecords,
        `chore(data): update ${meta.fileName} via Admin Dashboard`,
        ghToken
      );
      await pushFileToGithub(
        `${GITHUB_DATA_PATH}/manifest.json`,
        serializedManifest,
        `chore(data): update manifest.json counts`,
        ghToken
      );
      githubSynced = true;
    } catch (err) {
      githubError = err instanceof Error ? err.message : "GitHub API sync failed";
      if (!localWritten) {
        throw new Error(githubError);
      }
    }
  }

  return { meta: manifest.datasets[idx], githubSynced, githubError };
}

async function pushFileToGithub(
  repoFilePath: string,
  content: string,
  message: string,
  token: string
) {
  const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${repoFilePath}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "User-Agent": "codei7-admin-dashboard",
  };

  let sha: string | undefined;
  const getRes = await fetch(`${apiUrl}?ref=${GITHUB_BRANCH}`, {
    cache: "no-store",
    headers,
  });
  if (getRes.ok) {
    const existing = (await getRes.json()) as { sha?: string };
    sha = existing.sha;
  }

  const putRes = await fetch(apiUrl, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      message,
      content: Buffer.from(content, "utf8").toString("base64"),
      branch: GITHUB_BRANCH,
      ...(sha ? { sha } : {}),
    }),
  });

  if (!putRes.ok) {
    const errText = await putRes.text();
    throw new Error(`GitHub PUT ${repoFilePath} failed (${putRes.status}): ${errText}`);
  }
}

export async function createRecord(
  slug: string,
  payload: Record<string, unknown>
): Promise<{ record: DataRecord; meta: DatasetMeta; githubSynced: boolean; githubError?: string }> {
  const { records, meta } = await readDatasetRecords(slug, "local");
  const cleanRecord: DataRecord = {
    _id: `${slug}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  };

  for (const col of meta.columns) {
    const val = payload[col.key];
    cleanRecord[col.key] = val === undefined || val === null ? "" : (val as string | number);
  }

  const updated = [cleanRecord, ...records];
  const saved = await persistDatasetAndManifest(slug, updated);
  return { record: cleanRecord, ...saved };
}

export async function updateRecord(
  slug: string,
  id: string,
  payload: Record<string, unknown>
): Promise<{ record: DataRecord; meta: DatasetMeta; githubSynced: boolean; githubError?: string }> {
  const { records, meta } = await readDatasetRecords(slug, "local");
  const idx = records.findIndex((r) => r._id === id);
  if (idx === -1) {
    throw new Error(`Record "${id}" not found in "${slug}".`);
  }

  const updatedRecord: DataRecord = { ...records[idx] };
  for (const col of meta.columns) {
    if (col.key in payload) {
      const val = payload[col.key];
      updatedRecord[col.key] = val === undefined || val === null ? "" : (val as string | number);
    }
  }

  const updated = [...records];
  updated[idx] = updatedRecord;
  const saved = await persistDatasetAndManifest(slug, updated);
  return { record: updatedRecord, ...saved };
}

export async function deleteRecord(
  slug: string,
  id: string
): Promise<{ deletedId: string; meta: DatasetMeta; githubSynced: boolean; githubError?: string }> {
  const { records } = await readDatasetRecords(slug, "local");
  const filtered = records.filter((r) => r._id !== id);
  if (filtered.length === records.length) {
    throw new Error(`Record "${id}" not found in "${slug}".`);
  }
  const saved = await persistDatasetAndManifest(slug, filtered);
  return { deletedId: id, ...saved };
}

export async function bulkDeleteRecords(
  slug: string,
  ids: string[]
): Promise<{ deletedCount: number; meta: DatasetMeta; githubSynced: boolean; githubError?: string }> {
  const idSet = new Set(ids);
  const { records } = await readDatasetRecords(slug, "local");
  const filtered = records.filter((r) => !idSet.has(r._id));
  const deletedCount = records.length - filtered.length;
  const saved = await persistDatasetAndManifest(slug, filtered);
  return { deletedCount, ...saved };
}

export async function syncDatasetFromGithub(slug: string) {
  const manifest = await readManifest("local");
  const meta = manifest.datasets.find((d) => d.slug === slug);
  if (!meta) throw new Error(`Dataset "${slug}" not found.`);

  const token = process.env.GITHUB_TOKEN?.trim();
  let remoteRecords: DataRecord[];
  if (token) {
    remoteRecords = await fetchFromGithubContentsApi<DataRecord[]>(meta.fileName, token);
  } else {
    const res = await fetch(meta.githubRawUrl, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`GitHub Raw fetch failed (${res.status}) for ${meta.githubRawUrl}`);
    }
    remoteRecords = (await res.json()) as DataRecord[];
  }

  const saved = await persistDatasetAndManifest(slug, remoteRecords);
  return { records: remoteRecords, ...saved };
}
