"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Cloud,
  Command,
  Database,
  ExternalLink,
  Github,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Search,
  Shield,
  Sun,
  X,
} from "lucide-react";
import type { AuthUser, DatasetManifest } from "@/lib/types";
import { DatasetIcon } from "./IconResolver";
import { useTheme } from "./ThemeProvider";
import { PulseDot } from "./MotionPrimitives";
import { swalLogoutConfirm, swalToast } from "@/lib/swal";

const CATEGORY_ORDER = [
  "Operations & Incidents",
  "Hardware & Assets",
  "Connectivity & Remote",
  "Accounts & Access",
];

export function AppShell({
  manifest,
  user,
  dataSource = "local",
  onChangeDataSource,
  children,
}: {
  manifest: DatasetManifest;
  user: AuthUser;
  dataSource?: "local" | "github";
  onChangeDataSource?: (src: "local" | "github") => void;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState("");
  const [githubHubOpen, setGithubHubOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((v) => !v);
      } else if (e.key === "Escape") {
        setCmdOpen(false);
        setGithubHubOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const groupedDatasets = useMemo(() => {
    const map = new Map<string, typeof manifest.datasets>();
    for (const cat of CATEGORY_ORDER) map.set(cat, []);
    for (const ds of manifest.datasets) {
      const arr = map.get(ds.category) || [];
      arr.push(ds);
      map.set(ds.category, arr);
    }
    return Array.from(map.entries()).filter(([, list]) => list.length > 0);
  }, [manifest.datasets]);

  const filteredQuickJump = useMemo(() => {
    const q = cmdQuery.trim().toLowerCase();
    if (!q) return manifest.datasets;
    return manifest.datasets.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.sheetName.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q)
    );
  }, [cmdQuery, manifest.datasets]);

  const handleLogout = async () => {
    const confirmed = await swalLogoutConfirm();
    if (!confirmed) return;
    await fetch("/api/auth/logout", { method: "POST" });
    await swalToast("Signed out securely", "info");
    router.push("/login");
    router.refresh();
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex h-16 items-center justify-between border-b border-slate-200/80 px-4 dark:border-slate-800/80">
        <Link href="/" className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/25">
            <Shield className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                Codei7 Ops
              </p>
              <p className="truncate text-[10px] font-medium uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                Enterprise Suite
              </p>
            </div>
          )}
        </Link>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        <div>
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
              pathname === "/"
                ? "text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-white"
            }`}
          >
            {pathname === "/" && (
              <motion.span
                layoutId="sidebarActivePill"
                transition={{ type: "spring", stiffness: 360, damping: 30 }}
                className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 shadow-md shadow-indigo-500/25"
              />
            )}
            <LayoutDashboard className="relative z-10 h-4 w-4 shrink-0" />
            {!collapsed && <span className="relative z-10 truncate">Executive Overview</span>}
          </Link>
        </div>

        {groupedDatasets.map(([category, items]) => (
          <div key={category} className="space-y-1">
            {!collapsed && (
              <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {category}
              </p>
            )}
            {items.map((ds) => {
              const href = `/datasets/${ds.slug}`;
              const active = pathname === href;
              return (
                <Link
                  key={ds.slug}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  title={collapsed ? `${ds.title} (${ds.recordCount})` : undefined}
                  className={`group relative flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors ${
                    active
                      ? "text-white"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-white"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="sidebarActivePill"
                      transition={{ type: "spring", stiffness: 360, damping: 30 }}
                      className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 shadow-md shadow-indigo-500/25"
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2.5 min-w-0">
                    <DatasetIcon name={ds.icon} className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate">{ds.title}</span>}
                  </span>
                  {!collapsed && (
                    <span
                      className={`relative z-10 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                        active
                          ? "bg-white/20 text-white"
                          : "bg-slate-100 text-slate-500 group-hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      {ds.recordCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer GitHub Status */}
      <div className="border-t border-slate-200/80 p-3 dark:border-slate-800/80">
        <button
          type="button"
          onClick={() => setGithubHubOpen(true)}
          className="flex w-full items-center gap-2.5 rounded-xl border border-slate-200/90 bg-slate-50/80 px-3 py-2 text-left text-xs transition hover:border-indigo-300 hover:bg-indigo-50/60 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-indigo-500/40"
        >
          <Github className="h-4 w-4 shrink-0 text-slate-700 dark:text-slate-200" />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate font-semibold text-slate-800 dark:text-slate-100">
                  Public JSON Hub
                </span>
                <PulseDot color="emerald" />
              </div>
              <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">
                {manifest.github.owner}/{manifest.github.repo}
              </p>
            </div>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 border-r border-slate-200/80 bg-white/90 backdrop-blur-xl transition-all duration-300 dark:border-slate-800/80 dark:bg-slate-900/90 ${
          collapsed ? "w-[74px]" : "w-[272px]"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-xs lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed inset-y-0 left-0 z-50 w-[272px] border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Command Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur-xl sm:px-6 dark:border-slate-800/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 lg:hidden dark:border-slate-800 dark:text-slate-300"
            >
              <Menu className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setCmdOpen(true)}
              className="flex items-center gap-2.5 rounded-xl border border-slate-200/90 bg-slate-100/70 px-3 py-1.5 text-xs text-slate-500 transition hover:border-indigo-300 hover:bg-white sm:w-64 dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-400 dark:hover:border-indigo-500/40 dark:hover:bg-slate-800"
            >
              <Search className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Jump to dataset...</span>
              <kbd className="ml-auto hidden sm:inline-flex items-center gap-0.5 rounded-md border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-500 dark:border-slate-700 dark:bg-slate-900">
                <Command className="h-2.5 w-2.5" />K
              </kbd>
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Data Source Toggle */}
            {onChangeDataSource && (
              <div className="hidden md:flex items-center rounded-xl border border-slate-200 bg-slate-100/80 p-0.5 text-xs dark:border-slate-800 dark:bg-slate-800/70">
                <button
                  type="button"
                  onClick={() => onChangeDataSource("local")}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-medium transition ${
                    dataSource === "local"
                      ? "bg-white text-indigo-600 shadow-xs dark:bg-slate-900 dark:text-indigo-400"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                  }`}
                >
                  <Database className="h-3.5 w-3.5" />
                  Local JSON
                </button>
                <button
                  type="button"
                  onClick={() => onChangeDataSource("github")}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-medium transition ${
                    dataSource === "github"
                      ? "bg-white text-emerald-600 shadow-xs dark:bg-slate-900 dark:text-emerald-400"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                  }`}
                >
                  <Cloud className="h-3.5 w-3.5" />
                  GitHub Raw
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setGithubHubOpen(true)}
              className="hidden sm:flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 transition"
            >
              <Github className="h-3.5 w-3.5" />
              <span>JSON API</span>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle color theme"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition"
            >
              {theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
            </button>

            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">
                {user.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="hidden sm:block leading-tight">
                <p className="text-xs font-semibold text-slate-900 dark:text-white">{user.name}</p>
                <p className="text-[10px] uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  {user.role}
                </p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title="Sign Out"
                className="ml-1 rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400 transition"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 bg-corporate-grid p-4 sm:p-6 lg:p-8">{children}</main>
      </div>

      {/* Command Palette Modal */}
      <AnimatePresence>
        {cmdOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/60 p-4 pt-20 backdrop-blur-xs"
            onClick={() => setCmdOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -12 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  autoFocus
                  value={cmdQuery}
                  onChange={(e) => setCmdQuery(e.target.value)}
                  placeholder="Search datasets, sheets, or categories..."
                  className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setCmdOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="max-h-96 overflow-y-auto p-2">
                {filteredQuickJump.map((ds) => (
                  <button
                    key={ds.slug}
                    type="button"
                    onClick={() => {
                      setCmdOpen(false);
                      setCmdQuery("");
                      router.push(`/datasets/${ds.slug}`);
                    }}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                        <DatasetIcon name={ds.icon} className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {ds.title}
                        </p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                          {ds.category} • Sheet: {ds.sheetName}
                        </p>
                      </div>
                    </div>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {ds.recordCount} rows
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Public GitHub JSON Hub Modal */}
      <AnimatePresence>
        {githubHubOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
            onClick={() => setGithubHubOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-slate-800">
                    <Github className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Public GitHub JSON Registry
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      All {manifest.totalDatasets} converted sheets are served locally & publicly on GitHub.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setGithubHubOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="overflow-y-auto p-6 space-y-2.5">
                {manifest.datasets.map((ds) => (
                  <div
                    key={ds.slug}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/40"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          {ds.title}
                        </span>
                        <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                          {ds.recordCount} rows
                        </span>
                      </div>
                      <p className="mt-0.5 truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        {ds.githubRawUrl}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={ds.localUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      >
                        Local JSON <ExternalLink className="h-3 w-3" />
                      </a>
                      <a
                        href={ds.githubRawUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                      >
                        GitHub Raw <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
