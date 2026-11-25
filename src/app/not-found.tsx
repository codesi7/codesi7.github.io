import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f8fafc] p-6 text-center dark:bg-[#0b1120]">
      <p className="font-mono text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">
        404 • Not Found
      </p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
        Page Not Found
      </h1>
      <p className="mt-1.5 max-w-sm text-sm text-slate-500 dark:text-slate-400">
        The requested dataset or route does not exist in this portal.
      </p>
      <Link
        href="/"
        className="mt-5 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
      >
        Back to Overview
      </Link>
    </div>
  );
}
