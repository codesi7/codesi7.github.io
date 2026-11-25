import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { readDatasetRecords, readManifest } from "@/lib/data-store";
import { DatasetDataTable } from "@/components/DatasetDataTable";

export const dynamic = "force-dynamic";

export default async function DatasetPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);
  if (!session) {
    redirect("/login");
  }

  const { slug } = await params;
  const manifest = await readManifest("local");
  const exists = manifest.datasets.some((d) => d.slug === slug);
  if (!exists) {
    notFound();
  }

  const { meta, records } = await readDatasetRecords(slug, "local");

  return (
    <DatasetDataTable
      initialManifest={manifest}
      initialMeta={meta}
      initialRecords={records}
      user={session.user}
    />
  );
}
