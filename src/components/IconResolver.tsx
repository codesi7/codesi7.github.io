"use client";

import React from "react";
import {
  Camera,
  CreditCard,
  Droplets,
  KeyRound,
  Laptop,
  LifeBuoy,
  Mail,
  MonitorSmartphone,
  Package,
  Router,
  ShieldCheck,
  Store,
  Table2,
  Ticket,
  Wifi,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Package,
  MonitorSmartphone,
  LifeBuoy,
  Camera,
  Store,
  Laptop,
  CreditCard,
  Mail,
  Ticket,
  Droplets,
  KeyRound,
  ShieldCheck,
  Wifi,
  Router,
  Table: Table2,
};

export function DatasetIcon({
  name,
  className = "w-4 h-4",
}: {
  name: string;
  className?: string;
}) {
  const Comp = ICON_MAP[name] || Table2;
  return <Comp className={className} />;
}
