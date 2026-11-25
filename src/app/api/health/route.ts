import { NextResponse } from "next/server";
import { isGithubWriteEnabled } from "@/lib/data-store";

export async function GET() {
  return NextResponse.json({
    ok: true,
    runtime: process.env.VERCEL === "1" ? "vercel-serverless" : "node-server",
    githubWriteEnabled: isGithubWriteEnabled(),
    githubRepo: `${process.env.NEXT_PUBLIC_GITHUB_OWNER || "codesi7"}/${
      process.env.NEXT_PUBLIC_GITHUB_REPO || "codei7"
    }`,
  });
}
