"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
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
  AlertTriangle,
  ArrowUpRight,
  Camera,
  Check,
  Copy,
  Database,
  Droplets,
  ExternalLink,
  Github,
  Laptop,
  RefreshCw,
  Ticket,
} from "lucide-react";
import type { AuthUser, DashboardOverviewStats, DatasetManifest } from "@/lib/types";
import { AppShell } from "./AppShell";
import { AnimatedCounter, FadeInSection, PulseDot } from "./MotionPrimitives";
import { DatasetIcon } from "./IconResolver";
import { swalToast } from "@/lib/swal";

const PIE_COLORS = ["#ef4444", "#f97316", "#eab308", "#3b82f6", "#64748b"];

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
      const res = await fetch(`/api/overview?source=${src}`, { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as {
          manifest: DatasetManifest;
          stats: DashboardOverviewStats;
        };
        setManifest(data.manifest);
        setStats(data.stats);
      }
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
      src === "github" ? "Switched to GitHub Raw Public JSON" : "Switched to Local JSON Store",
      "info"
    );
  };

  const handleCopy = async (text: string, slug: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedSlug(slug);
    void swalToast("GitHub Raw JSON URL copied", "success");
    setTimeout(() => setCopiedSlug(null), 1800);
  };

  const kpis = [
    {
      label: "Total Master Records",
      value: stats.totalRecords,
      sub: `${stats.totalDatasets} Public JSON Modules`,
      icon: Database,
      href: "/datasets/stock",
      accent: "from-indigo-500 to-violet-600",
    },
    {
      label: "IT & Ops Tickets",
      value: stats.totalTickets,
      sub: `${stats.openTickets} Open • ${stats.criticalHighTickets} High/Critical`,
      icon: Ticket,
      href: "/datasets/know-ticket",
      accent: "from-sky-500 to-indigo-600",
    },
    {
      label: "Active CCTV Cameras",
      value: stats.activeCameras,
      sub: `of ${stats.totalCameras} store cameras monitored`,
      icon: Camera,
      href: "/datasets/camera",
      accent: "from-emerald-500 to-teal-600",
    },
    {
      label: "Outlet & Corp Fleet",
      value: stats.totalOutlets + stats.totalCorporateLaptops,
      sub: `${stats.totalOutlets} Outlets • ${stats.totalCorporateLaptops} Corp Laptops`,
      icon: Laptop,
      href: "/datasets/corporate-laptop",
      accent: "from-amber-500 to-orange-600",
    },
    {
      label: "Used Oil Collected",
      value: stats.totalUsedOilKg,
      decimals: 1,
      suffix: " kg",
      sub: `${stats.totalUsedOilTins} Tins across divisions`,
      icon: Droplets,
      href: "/datasets/used-oil-collection",
      accent: "from-rose-500 to-pink-600",
    },
    {
      label: "Priority Escalations",
      value: stats.criticalHighTickets,
      sub: `${stats.totalEdcTerminals} EDC • ${stats.totalInternetLinks} ISP Links`,
      icon: AlertTriangle,
      href: "/datasets/know-ticket",
      accent: "from-fuchsia-500 to-purple-600",
    },
  ];

  return (
    <AppShell
      manifest={manifest}
      user={user}
      dataSource={dataSource}
      onChangeDataSource={handleSourceChange}
    >
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Executive Hero Header */}
        <FadeInSection>
          <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur-xl sm:p-8 dark:border-slate-800 dark:bg-slate-900/90">
            <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  <PulseDot color="emerald" />
                  <span>
                    Source: {dataSource === "github" ? "GitHub Public Raw JSON" : "Local JSON API"} •{" "}
                    {manifest.totalDatasets} Sheets Synced
                  </span>
                </div>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                  Corporate Operations Command Center
                </h1>
                <p className="max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                  Welcome back, <strong className="text-slate-800 dark:text-slate-200">{user.name}</strong>.
                  Real-time telemetry, asset inventory, ticket analytics, and SweetAlert2 CRUD powered by{" "}
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-indigo-600 dark:bg-slate-800 dark:text-indigo-400">
                    Data.xlsx → public/data/*.json
                  </code>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => void loadOverview(dataSource)}
                  disabled={refreshing}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                  Refresh Metrics
                </button>
                <a
                  href={manifest.github.repoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 transition"
                >
                  <Github className="h-3.5 w-3.5" />
                  Public GitHub Repo
                  <ExternalLink className="h-3 w-3 opacity-75" />
                </a>
              </div>
            </div>
          </div>
        </FadeInSection>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {kpis.map((kpi, idx) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.35 }}
              whileHover={{ y: -3 }}
            >
              <Link
                href={kpi.href}
                className="group flex items-start justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/40"
              >
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {kpi.label}
                  </p>
                  <p className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                    <AnimatedCounter
                      value={kpi.value}
                      decimals={kpi.decimals || 0}
                      suffix={kpi.suffix || ""}
                    />
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{kpi.sub}</p>
                </div>
                <div className="flex flex-col items-end justify-between gap-4">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${kpi.accent} text-white shadow-md`}
                  >
                    <kpi.icon className="h-5 w-5" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-indigo-500" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Analytics Charts Row */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <FadeInSection delay={0.1} className="lg:col-span-7">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    IT & Operations Tickets by Category
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Live distribution from Know-Ticket JSON ({stats.totalTickets} records)
                  </p>
                </div>
                <Link
                  href="/datasets/know-ticket"
                  className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  Open Table →
                </Link>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.ticketByCategory} margin={{ top: 8, right: 12, left: -12, bottom: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      interval={0}
                      angle={-18}
                      textAnchor="end"
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid rgba(148,163,184,0.2)",
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="count" name="Tickets" fill="#6366f1" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </FadeInSection>

          <FadeInSection delay={0.16} className="lg:col-span-5">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Ticket Severity Mix
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Critical, high, medium, and unspecified triage breakdown
                </p>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.ticketBySeverity}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="45%"
                      innerRadius={56}
                      outerRadius={88}
                      paddingAngle={4}
                    >
                      {stats.ticketBySeverity.map((entry, index) => (
                        <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid rgba(148,163,184,0.2)",
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </FadeInSection>

          <FadeInSection delay={0.2} className="lg:col-span-7">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Outlet Hardware Footprint by Zone
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Laptops, POS, Printers, and Cameras across operational zones
                  </p>
                </div>
                <Link
                  href="/datasets/outlet-laptop"
                  className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  Open Table →
                </Link>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.hardwareByZone} margin={{ top: 8, right: 12, left: -12, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                    <XAxis dataKey="zone" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid rgba(148,163,184,0.2)",
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="laptops" name="Laptops" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="pos" name="POS" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="printers" name="Printers" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </FadeInSection>

          <FadeInSection delay={0.24} className="lg:col-span-5">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Used Oil Collection by Division
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Total Kgs & Tins dispatched for recycling
                  </p>
                </div>
                <Link
                  href="/datasets/used-oil-collection"
                  className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  Open Table →
                </Link>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.oilByDivision} layout="vertical" margin={{ top: 8, right: 20, left: 20, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="division" type="category" tick={{ fontSize: 11 }} width={85} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid rgba(148,163,184,0.2)",
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="kg" name="Oil (kg)" fill="#f43f5e" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </FadeInSection>
        </div>

        {/* All 14 Public JSON Modules Directory */}
        <FadeInSection delay={0.28}>
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  All 14 Excel Sheets → Public GitHub JSON Modules
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Click any module to launch the full Enterprise DataTable with filtering, multi-export, and SweetAlert2 CRUD.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-1.5 font-mono text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                {manifest.totalRecords} Total Records
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {manifest.datasets.map((ds, idx) => (
                <motion.div
                  key={ds.slug}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.03 * idx, duration: 0.3 }}
                  whileHover={{ y: -2 }}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4 transition hover:border-indigo-300 hover:bg-white hover:shadow-md dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-indigo-500/40 dark:hover:bg-slate-900"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
                          <DatasetIcon name={ds.icon} className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            {ds.title}
                          </h3>
                          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            {ds.category}
                          </p>
                        </div>
                      </div>
                      <span className="rounded-lg bg-white px-2 py-0.5 font-mono text-xs font-bold text-slate-700 shadow-2xs dark:bg-slate-800 dark:text-slate-200">
                        {ds.recordCount}
                      </span>
                    </div>
                    <p className="mt-2.5 line-clamp-2 text-xs text-slate-600 dark:text-slate-400">
                      {ds.description}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-200/80 pt-3 dark:border-slate-800">
                    <Link
                      href={`/datasets/${ds.slug}`}
                      className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition"
                    >
                      Manage Table <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => void handleCopy(ds.githubRawUrl, ds.slug)}
                        title="Copy GitHub Raw JSON URL"
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      >
                        {copiedSlug === ds.slug ? (
                          <Check className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        Raw URL
                      </button>
                      <a
                        href={ds.localUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="Open Local Public JSON"
                        className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </FadeInSection>

        {/* Recent Tickets & Stock Activity */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <FadeInSection delay={0.32}>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Latest Incident Tickets
                </h3>
                <Link
                  href="/datasets/know-ticket"
                  className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  View all →
                </Link>
              </div>
              <div className="space-y-2.5">
                {stats.recentTickets.map((t) => (
                  <div
                    key={t._id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">
                        #{String(t["ID"] || "")} — {String(t["Title"] || "")}
                      </p>
                      <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                        {String(t["Issue Location"] || "")} • {String(t["Reported by"] || "")}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-md bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                      {String(t["Status"] || "Open")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </FadeInSection>

          <FadeInSection delay={0.36}>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Recent Stock Dispatches
                </h3>
                <Link
                  href="/datasets/stock"
                  className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  View all →
                </Link>
              </div>
              <div className="space-y-2.5">
                {stats.recentStock.map((s) => (
                  <div
                    key={s._id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">
                        {String(s["Store Name"] || "Unknown Store")}
                      </p>
                      <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                        {String(s["Products Name"] || "")}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-md bg-indigo-500/10 px-2 py-0.5 font-mono text-[11px] font-medium text-indigo-700 dark:text-indigo-300">
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
