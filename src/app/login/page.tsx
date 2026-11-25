"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  Lock,
  Mail,
} from "lucide-react";
import Swal from "sweetalert2";
import { getSessionUser, loginWithSheet } from "@/lib/client-store";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getSessionUser()) {
      router.replace("/");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      await Swal.fire({
        icon: "warning",
        title: "Credentials Required",
        text: "Enter your corporate email and password to continue.",
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    setLoading(true);
    try {
      const user = await loginWithSheet(email, password);
      await Swal.fire({
        icon: "success",
        title: `Welcome, ${user.name}`,
        text: `Signed in (${user.role.toUpperCase()})`,
        timer: 1100,
        showConfirmButton: false,
        timerProgressBar: true,
      });
      router.replace("/");
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: "Sign-In Failed",
        text: err instanceof Error ? err.message : "Invalid email or password.",
        confirmButtonColor: "#dc2626",
      });
      setLoading(false);
    }
  };

  const fillSheetAccount = () => {
    setEmail("khalid@gmail.com");
    setPassword("khalid@gmail.com");
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-slate-50 dark:bg-[#0b1120]">
      <div className="hidden lg:flex lg:w-[46%] flex-col justify-between bg-[#0f172a] p-12 text-slate-100 border-r border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight text-white">Codei7 Operations</p>
            <p className="text-[11px] text-slate-400">Internal Asset &amp; IT Portal</p>
          </div>
        </div>

        <div className="max-w-md space-y-6">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-400">
              Enterprise Operations Console
            </p>
            <h1 className="text-3xl font-bold leading-snug tracking-tight text-white">
              Centralized outlet infrastructure, hardware inventory, and ticket administration.
            </h1>
            <p className="text-sm leading-relaxed text-slate-400">
              Hosted on GitHub Pages with 13 live JSON datasets from the repository, multi-format
              exports, and SweetAlert2 CRUD workflows.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-slate-800 pt-6 text-xs">
            <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3.5">
              <p className="font-semibold text-white">13 Modules</p>
              <p className="mt-0.5 text-slate-400">Inventory, POS, CCTV &amp; ISP</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3.5">
              <p className="font-semibold text-white">GitHub Hosted</p>
              <p className="mt-0.5 text-slate-400">Public JSON &amp; API sync</p>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          © {new Date().getFullYear()} Codei7 Internal Systems • Authorized Personnel Only
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center p-5 sm:p-8 lg:p-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="mb-6 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Building2 className="h-4 w-4" />
            </div>
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              Codei7 Operations
            </span>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
              Sign in to your account
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Use your registered credentials from the organization directory.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Email address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  autoComplete="email"
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label="Toggle password visibility"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              <span>{loading ? "Signing in..." : "Sign in"}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs dark:border-slate-800 dark:bg-slate-950/60">
            <div className="min-w-0">
              <p className="font-medium text-slate-600 dark:text-slate-400">Directory Admin</p>
              <p className="truncate font-mono text-slate-800 dark:text-slate-200">
                khalid@gmail.com
              </p>
            </div>
            <button
              type="button"
              onClick={fillSheetAccount}
              className="shrink-0 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Use Account
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
