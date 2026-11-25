"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Database,
  ExternalLink,
  Github,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Search,
  Sun,
  X,
} from "lucide-react";
import type { AuthUser, DatasetManifest } from "@/lib/types";
import { DatasetIcon } from "./IconResolver";
import { useTheme } from "./ThemeProvider";
import { swalConnectGithubToken, swalLogoutConfirm, swalToast } from "@/lib/swal";
import { getGithubToken, logoutUser, setGithubToken, withBasePath } from "@/lib/client-store";

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
  const [hasGhPat, setHasGhPat] = useState(false);

  useEffect(() => {
    setHasGhPat(Boolean(getGithubToken()));
  }, []);

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
    logoutUser();
    await swalToast("Signed out", "info");
    router.replace("/login");
  };

  const handleConfigurePat = async () => {
    const res = await swalConnectGithubToken(getGithubToken());
    if (res === undefined) return;
    setGithubToken(res || "");
    setHasGhPat(Boolean(res));
    await swalToast(
      res ? "GitHub Commit Token saved for live repo CRUD" : "Disconnected GitHub Token",
      "info"
    );
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center justify-between border-b border-slate-200 px-3.5 dark:border-slate-800">
        <Link href="/" className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Building2 className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                Codei7 Ops
              </p>
              <p className="truncate text-[10px] font-medium text-slate-500 dark:text-slate-400">
                Admin Console
              </p>
            </div>
          )}
        </Link>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="hidden lg:flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
        <div>
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className={`relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-semibold transition-colors ${
              pathname === "/" || pathname === ""
                ? "bg-blue-600 text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white"
            }`}
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="truncate">Overview</span>}
          </Link>
        </div>

        {groupedDatasets.map(([category, items]) => (
          <div key={category} className="space-y-0.5">
            {!collapsed && (
              <p className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {category}
              </p>
            )}
            {items.map((ds) => {
              const href = `/datasets/${ds.slug}`;
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={ds.slug}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  title={collapsed ? `${ds.title} (${ds.recordCount})` : undefined}
                  className={`group flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors ${
                    active
                      ? "bg-blue-600 text-white"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white"
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <DatasetIcon name={ds.icon} className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate">{ds.title}</span>}
                  </span>
                  {!collapsed && (
                    <span
                      className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-medium ${
                        active
                          ? "bg-blue-500/40 text-white"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
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

      <div className="border-t border-slate-200 p-2.5 dark:border-slate-800">
        <button
          type="button"
          onClick={() => {
            setMobileOpen(false);
            setGithubHubOpen(true);
          }}
          className="flex w-full items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-left text-xs transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:bg-slate-800"
        >
          <Github className="h-4 w-4 shrink-0 text-slate-700 dark:text-slate-200" />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-slate-800 dark:text-slate-100">
                GitHub JSON Endpoints
              </p>
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
    <div className="flex min-h-screen w-full overflow-x-hidden bg-[#f8fafc] dark:bg-[#0b1120]">
      <aside
        className={`hidden lg:flex flex-col shrink-0 border-r border-slate-200 bg-white transition-all duration-200 dark:border-slate-800 dark:bg-slate-900 ${
          collapsed ? "w-[64px]" : "w-[256px]"
        }`}
      >
        {sidebarContent}
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
            />
            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed inset-y-0 left-0 z-50 w-[260px] border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-slate-200 bg-white/95 px-3 backdrop-blur-sm sm:px-5 dark:border-slate-800 dark:bg-slate-900/95">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 lg:hidden dark:border-slate-800 dark:text-slate-300"
            >
              <Menu className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setCmdOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-500 hover:border-slate-300 hover:bg-white sm:w-56 md:w-64 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 transition-colors"
            >
              <Search className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate hidden sm:inline">Search datasets...</span>
              <span className="truncate sm:hidden">Search...</span>
              <kbd className="ml-auto hidden sm:inline-block rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-500 dark:border-slate-700 dark:bg-slate-900">
                Ctrl+K
              </kbd>
            </button>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {onChangeDataSource && (
              <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-[11px] dark:border-slate-800 dark:bg-slate-950">
                <button
                  type="button"
                  onClick={() => onChangeDataSource("local")}
                  title="Browser + Static JSON"
                  className={`flex items-center gap-1 rounded-md px-2 py-1 font-medium transition-colors ${
                    dataSource === "local"
                      ? "bg-white text-slate-900 shadow-2xs dark:bg-slate-800 dark:text-white"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                  }`}
                >
                  <Database className="h-3 w-3" />
                  <span className="hidden md:inline">Local</span>
                </button>
                <button
                  type="button"
                  onClick={() => onChangeDataSource("github")}
                  title="GitHub Public Raw JSON"
                  className={`flex items-center gap-1 rounded-md px-2 py-1 font-medium transition-colors ${
                    dataSource === "github"
                      ? "bg-white text-blue-600 shadow-2xs dark:bg-slate-800 dark:text-blue-400"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                  }`}
                >
                  <Cloud className="h-3 w-3" />
                  <span className="hidden md:inline">GitHub</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => void handleConfigurePat()}
              title={hasGhPat ? "GitHub Write Token Connected" : "Connect GitHub Write Token"}
              className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors ${
                hasGhPat
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
              }`}
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span className="hidden xl:inline">{hasGhPat ? "GitHub Write On" : "GitHub Write"}</span>
            </button>

            <button
              type="button"
              onClick={() => setGithubHubOpen(true)}
              title="Public GitHub JSON Registry"
              className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <Github className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">JSON API</span>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle color theme"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            >
              {theme === "dark" ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5" />}
            </button>

            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-900 text-[11px] font-bold text-white dark:bg-blue-600">
                {user.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="hidden md:block leading-none">
                <p className="text-xs font-semibold text-slate-900 dark:text-white">{user.name}</p>
                <p className="text-[10px] uppercase text-slate-500 dark:text-slate-400">
                  {user.role}
                </p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title="Sign Out"
                className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-3 sm:p-5 lg:p-6">{children}</main>
      </div>

      <AnimatePresence>
        {cmdOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/50 p-3 pt-16 sm:p-4 sm:pt-20"
            onClick={() => setCmdOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center gap-2.5 border-b border-slate-200 px-3.5 py-2.5 dark:border-slate-800">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  autoFocus
                  value={cmdQuery}
                  onChange={(e) => setCmdQuery(e.target.value)}
                  placeholder="Jump to sheet or module..."
                  className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setCmdOpen(false)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto p-1.5">
                {filteredQuickJump.map((ds) => (
                  <button
                    key={ds.slug}
                    type="button"
                    onClick={() => {
                      setCmdOpen(false);
                      setCmdQuery("");
                      router.push(`/datasets/${ds.slug}`);
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <DatasetIcon name={ds.icon} className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                          {ds.title}
                        </p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                          {ds.category}
                        </p>
                      </div>
                    </div>
                    <span className="ml-2 shrink-0 rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {ds.recordCount}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {githubHubOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 sm:p-4"
            onClick={() => setGithubHubOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.16 }}
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5 sm:px-5 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <Github className="h-5 w-5 text-slate-800 dark:text-white" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Public JSON Registry
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {manifest.totalDatasets} converted sheets • Static &amp; GitHub Raw URLs
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setGithubHubOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="overflow-y-auto p-4 space-y-2 sm:p-5">
                {manifest.datasets.map((ds) => (
                  <div
                    key={ds.slug}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/50"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-900 dark:text-white">
                          {ds.title}
                        </span>
                        <span className="rounded bg-slate-200/70 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {ds.recordCount} rows
                        </span>
                      </div>
                      <p className="mt-0.5 truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        {ds.githubRawUrl}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={withBasePath(ds.localUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      >
                        Pages JSON <ExternalLink className="h-3 w-3" />
                      </a>
                      <a
                        href={ds.githubRawUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700"
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
