import { NextResponse } from "next/server";
import { syncDatasetFromGithub } from "@/lib/data-store";

export async function POST(
  _request: Request,
  context: { params: Promise<{ sheet: string }> }
) {
  try {
    const { sheet } = await context.params;
    const result = await syncDatasetFromGithub(sheet);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "GitHub sync failed." },
      { status: 502 }
    );
  }
}
