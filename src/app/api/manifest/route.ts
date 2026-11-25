import { NextResponse, type NextRequest } from "next/server";
import { readManifest } from "@/lib/data-store";

export async function GET(request: NextRequest) {
  try {
    const source = request.nextUrl.searchParams.get("source") === "github" ? "github" : "local";
    const manifest = await readManifest(source);
    return NextResponse.json(manifest);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load manifest." },
      { status: 500 }
    );
  }
}
