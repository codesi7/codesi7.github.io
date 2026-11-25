"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OverviewDashboard } from "@/components/OverviewDashboard";
import { getSessionUser, loadOverviewClient } from "@/lib/client-store";
import type { AuthUser, DashboardOverviewStats, DatasetManifest } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [payload, setPayload] = useState<{
    manifest: DatasetManifest;
    stats: DashboardOverviewStats;
  } | null>(null);

  useEffect(() => {
    const sessionUser = getSessionUser();
    if (!sessionUser) {
      router.replace("/login");
      return;
    }
    setUser(sessionUser);
    loadOverviewClient("local").then((res) => setPayload(res));
  }, [router]);

  if (!user || !payload) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] dark:bg-[#0b1120]">
        <div className="flex items-center gap-2.5 text-sm font-medium text-slate-500">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          Loading operations portal...
        </div>
      </div>
    );
  }

  return (
    <OverviewDashboard
      initialManifest={payload.manifest}
      initialStats={payload.stats}
      user={user}
    />
  );
}
