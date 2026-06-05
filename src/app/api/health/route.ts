import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    success: true,
    data: {
      status: "ok",
      commitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    },
  });
}
