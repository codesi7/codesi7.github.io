import fs from "node:fs";
import path from "node:path";
import type { DatasetManifest } from "@/lib/types";
import { DatasetPageClient } from "@/components/DatasetPageClient";

export function generateStaticParams() {
  const manifestPath = path.join(process.cwd(), "public", "data", "manifest.json");
  const raw = fs.readFileSync(manifestPath, "utf8");
  const manifest = JSON.parse(raw) as DatasetManifest;
  return manifest.datasets.map((d) => ({ slug: d.slug }));
}

export default async function DatasetPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <DatasetPageClient slug={slug} />;
}
