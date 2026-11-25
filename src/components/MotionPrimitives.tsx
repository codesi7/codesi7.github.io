"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

export function AnimatedCounter({
  value,
  decimals = 0,
  suffix = "",
}: {
  value: number;
  decimals?: number;
  suffix?: string;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let frame = 0;
    const durationMs = 650;
    const start = performance.now();
    const from = 0;
    const to = Number(value) || 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (to - from) * eased);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  const formatted =
    decimals > 0
      ? display.toFixed(decimals)
      : Math.round(display).toLocaleString("en-IN");

  return (
    <span>
      {formatted}
      {suffix}
    </span>
  );
}

export function FadeInSection({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function PulseDot({ color = "emerald" }: { color?: "emerald" | "indigo" | "amber" | "rose" }) {
  const colorMap = {
    emerald: "bg-emerald-500",
    indigo: "bg-indigo-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
  };
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span
        className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${colorMap[color]}`}
      />
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${colorMap[color]}`} />
    </span>
  );
}
