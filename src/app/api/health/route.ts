import { NextResponse } from "next/server";

export function GET() {
  // APP_COMMIT_SHA is a deploy/CI override for custom hosts. Vercel deploys
  // should normally rely on VERCEL_GIT_COMMIT_SHA, which is platform-provided.
  const commitSha = process.env.APP_COMMIT_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA ?? null;

  return NextResponse.json(
    {
      success: true,
      data: {
        status: "ok",
        commitSha,
      },
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
