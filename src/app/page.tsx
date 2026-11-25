import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { readDatasetRecords, readManifest } from "@/lib/data-store";
import { OverviewDashboard } from "@/components/OverviewDashboard";
import type { DashboardOverviewStats } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);
  if (!session) {
    redirect("/login");
  }

  const manifest = await readManifest("local");
  const [
    ticketsRes,
    camerasRes,
    outletRes,
    corpRes,
    oilRes,
    internetRes,
    edcRes,
    stockRes,
  ] = await Promise.all([
    readDatasetRecords("know-ticket", "local"),
    readDatasetRecords("camera", "local"),
    readDatasetRecords("outlet-laptop", "local"),
    readDatasetRecords("corporate-laptop", "local"),
    readDatasetRecords("used-oil-collection", "local"),
    readDatasetRecords("internet", "local"),
    readDatasetRecords("edc", "local"),
    readDatasetRecords("stock", "local"),
  ]);

  const tickets = ticketsRes.records;
  const cameras = camerasRes.records;
  const outlets = outletRes.records;
  const corpLaptops = corpRes.records;
  const oilRows = oilRes.records;

  const categoryMap = new Map<string, number>();
  const severityMap = new Map<string, number>();
  const statusMap = new Map<string, number>();
  let openTickets = 0;
  let criticalHighTickets = 0;

  for (const t of tickets) {
    const cat = String(t["Category"] || "Uncategorized").trim() || "Uncategorized";
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);

    const sevRaw = String(t["Severity"] || "-").trim();
    const sev = sevRaw === "-" || !sevRaw ? "Unspecified" : sevRaw;
    severityMap.set(sev, (severityMap.get(sev) || 0) + 1);
    if (["critical", "high"].includes(sev.toLowerCase())) {
      criticalHighTickets++;
    }

    const st = String(t["Status"] || "Unknown").trim() || "Unknown";
    statusMap.set(st, (statusMap.get(st) || 0) + 1);
    if (st.toLowerCase() === "open") {
      openTickets++;
    }
  }

  const activeCameras = cameras.filter(
    (c) => String(c["Status"] || "").trim().toLowerCase() === "active"
  ).length;

  const zoneMap = new Map<
    string,
    { zone: string; laptops: number; pos: number; printers: number; cameras: number }
  >();
  for (const o of outlets) {
    const zone = String(o["Zone"] || "Other").trim() || "Other";
    const cur = zoneMap.get(zone) || { zone, laptops: 0, pos: 0, printers: 0, cameras: 0 };
    cur.laptops += Number(o["Laptop Quantity"]) || 0;
    cur.pos += Number(o["POS Quantity"]) || 0;
    cur.printers += Number(o["Printer Quantity"]) || 0;
    cur.cameras += Number(o["Camera"]) || 0;
    zoneMap.set(zone, cur);
  }

  let totalUsedOilKg = 0;
  let totalUsedOilTins = 0;
  const oilDivMap = new Map<string, { division: string; kg: number; tins: number }>();

  for (const row of oilRows) {
    const kg = Number(row["How many kgs of used oil sent"]) || 0;
    const tins = Number(row["Number of Tins"]) || 0;
    totalUsedOilKg += kg;
    totalUsedOilTins += tins;
    const div = String(row["Sender Division"] || "Other").trim() || "Other";
    const cur = oilDivMap.get(div) || { division: div, kg: 0, tins: 0 };
    cur.kg += kg;
    cur.tins += tins;
    oilDivMap.set(div, cur);
  }

  const initialStats: DashboardOverviewStats = {
    totalDatasets: manifest.totalDatasets,
    totalRecords: manifest.totalRecords,
    totalTickets: tickets.length,
    openTickets,
    criticalHighTickets,
    totalCameras: cameras.length,
    activeCameras,
    totalOutlets: outlets.length,
    totalCorporateLaptops: corpLaptops.length,
    totalUsedOilKg: Number(totalUsedOilKg.toFixed(1)),
    totalUsedOilTins,
    totalInternetLinks: internetRes.records.length,
    totalEdcTerminals: edcRes.records.length,
    ticketByCategory: Array.from(categoryMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 7),
    ticketBySeverity: Array.from(severityMap.entries()).map(([name, value]) => ({
      name,
      value,
    })),
    ticketByStatus: Array.from(statusMap.entries()).map(([name, value]) => ({
      name,
      value,
    })),
    hardwareByZone: Array.from(zoneMap.values())
      .sort((a, b) => b.laptops + b.pos - (a.laptops + a.pos))
      .slice(0, 8),
    oilByDivision: Array.from(oilDivMap.values()).sort((a, b) => b.kg - a.kg),
    recentTickets: tickets.slice(0, 6),
    recentStock: stockRes.records.slice(0, 6),
  };

  return (
    <OverviewDashboard
      initialManifest={manifest}
      initialStats={initialStats}
      user={session.user}
    />
  );
}
