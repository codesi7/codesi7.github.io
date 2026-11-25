"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpRight,
  Camera,
  Check,
  Copy,
  CreditCard,
  Database,
  ExternalLink,
  Github,
  Laptop,
  MonitorSmartphone,
  RefreshCw,
  Wifi,
} from "lucide-react";
import type { AuthUser, DashboardOverviewStats, DatasetManifest } from "@/lib/types";
import { AppShell } from "./AppShell";
import { AnimatedCounter, FadeInSection } from "./MotionPrimitives";
import { DatasetIcon } from "./IconResolver";
import { swalToast } from "@/lib/swal";
import { loadOverviewClient, withBasePath } from "@/lib/client-store";

const PIE_COLORS = ["#059669", "#2563eb", "#d97706", "#dc2626", "#64748b"];

export function OverviewDashboard({
  initialManifest,
  initialStats,
  user,
}: {
  initialManifest: DatasetManifest;
  initialStats: DashboardOverviewStats;
  user: AuthUser;
}) {
  const [manifest, setManifest] = useState<DatasetManifest>(initialManifest);
  const [stats, setStats] = useState<DashboardOverviewStats>(initialStats);
  const [dataSource, setDataSource] = useState<"local" | "github">("local");
  const [refreshing, setRefreshing] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const loadOverview = useCallback(async (src: "local" | "github") => {
    setRefreshing(true);
    try {
      const data = await loadOverviewClient(src);
      setManifest(data.manifest);
      setStats(data.stats);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (dataSource === "github") {
      void loadOverview("github");
    }
  }, [dataSource, loadOverview]);

  const handleSourceChange = (src: "local" | "github") => {
    setDataSource(src);
    void loadOverview(src);
    void swalToast(
      src === "github" ? "Using GitHub Raw Public JSON" : "Using Local JSON Store",
      "info"
    );
  };

  const handleCopy = async (text: string, slug: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedSlug(slug);
    void swalToast("GitHub Raw URL copied", "success");
    setTimeout(() => setCopiedSlug(null), 1600);
  };

  const kpis = [
    {
      label: "Total Records",
      value: stats.totalRecords,
      sub: `${stats.totalDatasets} JSON sheets`,
      icon: Database,
      href: "/datasets/stock",
    },
    {
      label: "Remote Endpoints",
      value: stats.totalAnydesk,
      sub: "AnyDesk & RustDesk access",
      icon: MonitorSmartphone,
      href: "/datasets/anydesk",
    },
    {
      label: "CCTV Cameras",
      value: stats.activeCameras,
      sub: `${stats.totalCameras} total store cameras`,
      icon: Camera,
      href: "/datasets/camera",
    },
    {
      label: "Hardware Fleet",
      value: stats.totalOutlets + stats.totalCorporateLaptops,
      sub: `${stats.totalOutlets} outlets • ${stats.totalCorporateLaptops} corp laptops`,
      icon: Laptop,
      href: "/datasets/corporate-laptop",
    },
    {
      label: "Internet & Wi-Fi",
      value: stats.totalInternetLinks,
      sub: `${stats.totalNanWifi} NAN Wi-Fi outlets`,
      icon: Wifi,
      href: "/datasets/internet",
    },
    {
      label: "EDC & Webmail",
      value: stats.totalEdcTerminals,
      sub: `${stats.totalPrimeWebmails} outlet webmail logins`,
      icon: CreditCard,
      href: "/datasets/edc",
    },
  ];

  return (
    <AppShell
      manifest={manifest}
      user={user}
      dataSource={dataSource}
      onChangeDataSource={handleSourceChange}
    >
      <div className="mx-auto max-w-7xl space-y-5">
        {/* Clean Corporate Header */}
        <FadeInSection>
          <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
                Operations Overview
              </h1>
              <p className="mt-0.5 text-xs text-slate-500 sm:text-sm dark:text-slate-400">
                Signed in as <span className="font-medium text-slate-800 dark:text-slate-200">{user.name}</span> • Source:{" "}
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {dataSource === "github" ? "GitHub Raw JSON" : "Local JSON"}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void loadOverview(dataSource)}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 transition-colors"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <a
                href={manifest.github.repoUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
              >
                <Github className="h-3.5 w-3.5" />
                GitHub Repo
                <ExternalLink className="h-3 w-3 opacity-75" />
              </a>
            </div>
          </div>
        </FadeInSection>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {kpis.map((kpi) => (
            <Link
              key={kpi.label}
              href={kpi.href}
              className="group flex items-start justify-between rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500/40"
            >
              <div className="min-w-0 space-y-1">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {kpi.label}
                </p>
                <p className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[26px] dark:text-white">
                  <AnimatedCounter value={kpi.value} />
                </p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{kpi.sub}</p>
              </div>
              <div className="flex flex-col items-end justify-between gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                  <kpi.icon className="h-4 w-4" />
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 transition-colors group-hover:text-blue-600" />
              </div>
            </Link>
          ))}
        </div>

        {/* Analytics Charts */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <FadeInSection delay={0.05} className="min-w-0 lg:col-span-7">
            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    AnyDesk Endpoints by State
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Remote desktop distribution ({stats.totalAnydesk} total)
                  </p>
                </div>
                <Link
                  href="/datasets/anydesk"
                  className="shrink-0 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  View table →
                </Link>
              </div>
              <div className="h-60 sm:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.anydeskByState}
                    margin={{ top: 8, right: 8, left: -16, bottom: 24 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10 }}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                    />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid rgba(148,163,184,0.25)",
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="count" name="Endpoints" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </FadeInSection>

          <FadeInSection delay={0.08} className="min-w-0 lg:col-span-5">
            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    CCTV Camera Status
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Active vs inactive store systems
                  </p>
                </div>
                <Link
                  href="/datasets/camera"
                  className="shrink-0 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  View table →
                </Link>
              </div>
              <div className="h-60 sm:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.cameraByStatus}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="45%"
                      innerRadius={48}
                      outerRadius={78}
                      paddingAngle={3}
                    >
                      {stats.cameraByStatus.map((entry, index) => (
                        <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid rgba(148,163,184,0.25)",
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </FadeInSection>

          <FadeInSection delay={0.11} className="min-w-0 lg:col-span-7">
            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    Outlet Hardware by Zone
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Laptops, POS, and printers deployed
                  </p>
                </div>
                <Link
                  href="/datasets/outlet-laptop"
                  className="shrink-0 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  View table →
                </Link>
              </div>
              <div className="h-60 sm:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.hardwareByZone}
                    margin={{ top: 8, right: 8, left: -16, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                    <XAxis dataKey="zone" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid rgba(148,163,184,0.25)",
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="laptops" name="Laptops" fill="#2563eb" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="pos" name="POS" fill="#0284c7" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="printers" name="Printers" fill="#059669" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </FadeInSection>

          <FadeInSection delay={0.14} className="min-w-0 lg:col-span-5">
            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    Internet Links by Brand
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    ISP distribution across kitchens
                  </p>
                </div>
                <Link
                  href="/datasets/internet"
                  className="shrink-0 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  View table →
                </Link>
              </div>
              <div className="h-60 sm:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.internetByBrand}
                    layout="vertical"
                    margin={{ top: 8, right: 16, left: 10, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid rgba(148,163,184,0.25)",
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="value" name="Links" fill="#0284c7" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </FadeInSection>
        </div>

        {/* All 12 JSON Modules Directory */}
        <FadeInSection delay={0.16}>
          <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Data Modules &amp; Public JSON Endpoints
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {manifest.totalDatasets} sheets • {manifest.totalRecords} total records
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {manifest.datasets.map((ds) => (
                <div
                  key={ds.slug}
                  className="flex flex-col justify-between rounded-lg border border-slate-200 bg-slate-50/60 p-3.5 transition-colors hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-950/50 dark:hover:border-slate-700"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-blue-600 dark:border-slate-800 dark:bg-slate-900 dark:text-blue-400">
                          <DatasetIcon name={ds.icon} className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                            {ds.title}
                          </h3>
                          <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                            {ds.category}
                          </p>
                        </div>
                      </div>
                      <span className="shrink-0 rounded bg-white px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                        {ds.recordCount}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs text-slate-600 dark:text-slate-400">
                      {ds.description}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-200 pt-2.5 dark:border-slate-800">
                    <Link
                      href={`/datasets/${ds.slug}`}
                      className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
                    >
                      Open Table <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => void handleCopy(ds.githubRawUrl, ds.slug)}
                        title="Copy GitHub Raw URL"
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                      >
                        {copiedSlug === ds.slug ? (
                          <Check className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        Raw URL
                      </button>
                      <a
                        href={withBasePath(ds.localUrl)}
                        target="_blank"
                        rel="noreferrer"
                        title="Open JSON"
                        className="rounded-md border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </FadeInSection>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <FadeInSection delay={0.18}>
            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  AnyDesk &amp; Remote Endpoints
                </h3>
                <Link
                  href="/datasets/anydesk"
                  className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  View all →
                </Link>
              </div>
              <div className="space-y-2">
                {stats.recentAnydesk.map((a) => (
                  <div
                    key={a._id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-slate-950/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">
                        {String(a["Store Name"] || "")}
                      </p>
                      <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                        {String(a["State"] || "")} • ID: {String(a["Anydesk ID"] || "—")}
                      </p>
                    </div>
                    <span className="shrink-0 rounded border border-slate-200 bg-white px-2 py-0.5 font-mono text-[11px] text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                      {String(a["State"] || "—")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </FadeInSection>

          <FadeInSection delay={0.2}>
            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Recent Stock Entries
                </h3>
                <Link
                  href="/datasets/stock"
                  className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  View all →
                </Link>
              </div>
              <div className="space-y-2">
                {stats.recentStock.map((s) => (
                  <div
                    key={s._id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-slate-950/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">
                        {String(s["Store Name"] || "Unknown Store")}
                      </p>
                      <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                        {String(s["Products Name"] || "")}
                      </p>
                    </div>
                    <span className="shrink-0 rounded border border-slate-200 bg-white px-2 py-0.5 font-mono text-[11px] text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                      {String(s["Entry Date"] || "")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </FadeInSection>
        </div>
      </div>
    </AppShell>
  );
}
