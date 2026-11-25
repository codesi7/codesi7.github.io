"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DatasetDataTable } from "./DatasetDataTable";
import { getSessionUser, loadDatasetClient } from "@/lib/client-store";
import type { AuthUser, DataRecord, DatasetManifest, DatasetMeta } from "@/lib/types";

export function DatasetPageClient({ slug }: { slug: string }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [data, setData] = useState<{
    manifest: DatasetManifest;
    meta: DatasetMeta;
    records: DataRecord[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sessionUser = getSessionUser();
    if (!sessionUser) {
      router.replace("/login");
      return;
    }
    setUser(sessionUser);
    loadDatasetClient(slug, "local")
      .then((res) => setData(res))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load dataset"));
  }, [router, slug]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-sm text-rose-600">
        {error}
      </div>
    );
  }

  if (!user || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] dark:bg-[#0b1120]">
        <div className="flex items-center gap-2.5 text-sm font-medium text-slate-500">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          Loading dataset...
        </div>
      </div>
    );
  }

  return (
    <DatasetDataTable
      initialManifest={data.manifest}
      initialMeta={data.meta}
      initialRecords={data.records}
      user={user}
    />
  );
}
