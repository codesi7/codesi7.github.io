"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Database,
  Eye,
  EyeOff,
  Github,
  Layers,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Swal from "sweetalert2";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      await Swal.fire({
        icon: "warning",
        title: "Missing Credentials",
        text: "Please enter both your corporate email and password.",
        confirmButtonColor: "#4f46e5",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { user?: { name: string; role: string }; error?: string };

      if (!res.ok || !data.user) {
        await Swal.fire({
          icon: "error",
          title: "Authentication Failed",
          text: data.error || "Invalid credentials.",
          confirmButtonColor: "#e11d48",
        });
        setLoading(false);
        return;
      }

      await Swal.fire({
        icon: "success",
        title: `Welcome back, ${data.user.name}`,
        text: `Signed in as ${data.user.role.toUpperCase()} • Loading Operations Command Center`,
        timer: 1500,
        showConfirmButton: false,
        timerProgressBar: true,
      });

      router.push("/");
      router.refresh();
    } catch {
      await Swal.fire({
        icon: "error",
        title: "Network Error",
        text: "Unable to reach authentication server.",
        confirmButtonColor: "#e11d48",
      });
      setLoading(false);
    }
  };

  const fillSheetDemo = () => {
    setEmail("khalid@gmail.com");
    setPassword("khalid@gmail.com");
  };

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-slate-950 text-white">
      {/* Animated Ambient Gradient Orbs */}
      <motion.div
        animate={{ scale: [1, 1.12, 1], opacity: [0.35, 0.55, 0.35] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-indigo-600/30 blur-3xl"
      />
      <motion.div
        animate={{ scale: [1, 1.18, 1], opacity: [0.25, 0.45, 0.25] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -bottom-40 -right-32 h-[520px] w-[520px] rounded-full bg-violet-600/25 blur-3xl"
      />

      {/* Left Corporate Showcase Panel */}
      <div className="relative hidden lg:flex lg:w-[54%] flex-col justify-between border-r border-slate-800/80 bg-slate-900/60 p-12 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight">Codei7 Enterprise</p>
            <p className="text-xs font-medium uppercase tracking-widest text-indigo-400">
              Corporate Operations & Asset Hub
            </p>
          </div>
        </div>

        <div className="space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1 text-xs font-semibold text-indigo-300">
              <Sparkles className="h-3.5 w-3.5" />
              Powered by Public GitHub JSON & Next.js
            </span>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white">
              Unified Control Over{" "}
              <span className="bg-gradient-to-r from-indigo-400 via-sky-300 to-violet-400 bg-clip-text text-transparent">
                14 Operational Datasets
              </span>
            </h1>
            <p className="max-w-lg text-sm leading-relaxed text-slate-400">
              Manage store hardware, corporate laptops, AnyDesk remote endpoints, IT tickets, CCTV
              credentials, used oil compliance, and internet links with enterprise DataTables,
              multi-format exports, and SweetAlert2 CRUD workflows.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 gap-4">
            {[
              {
                icon: Layers,
                title: "14 Live JSON Modules",
                desc: "Converted cleanly from Data.xlsx",
              },
              {
                icon: Github,
                title: "GitHub Public Sync",
                desc: "Raw JSON endpoints & instant sync",
              },
              {
                icon: Database,
                title: "Enterprise DataTable",
                desc: "Faceted filters, sort & multi-export",
              },
              {
                icon: Lock,
                title: "Role-Based Access",
                desc: "Authenticated via Login JSON sheet",
              },
            ].map((item, idx) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + idx * 0.08, duration: 0.4 }}
                className="rounded-2xl border border-slate-800/90 bg-slate-900/80 p-4"
              >
                <item.icon className="h-5 w-5 text-indigo-400 mb-2" />
                <p className="text-sm font-semibold text-white">{item.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-500">
          © {new Date().getFullYear()} Codei7 Operations Command • Signed HTTP-Only Session Security
        </p>
      </div>

      {/* Right Login Card */}
      <div className="relative z-10 flex flex-1 items-center justify-center p-6 sm:p-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl"
        >
          <div className="mb-7">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400 lg:hidden">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">Sign In to Admin Panel</h2>
            <p className="mt-1.5 text-sm text-slate-400">
              Authenticate with your authorized <code className="text-indigo-300">Login</code> sheet account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Corporate Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full rounded-xl border border-slate-700/80 bg-slate-950/70 py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-slate-700/80 bg-slate-950/70 py-3 pl-10 pr-11 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:text-white"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-60 transition-all"
            >
              <span>{loading ? "Verifying Session..." : "Access Executive Dashboard"}</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </form>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Sheet Admin Account
                </p>
                <p className="font-mono text-xs text-slate-300 mt-0.5">khalid@gmail.com</p>
              </div>
              <button
                type="button"
                onClick={fillSheetDemo}
                className="rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20 transition"
              >
                Auto-Fill
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
