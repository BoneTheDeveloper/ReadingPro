import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {};

  const dbStart = performance.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = {
      status: "ok",
      latencyMs: Math.round(performance.now() - dbStart),
    };
  } catch (error) {
    checks.database = {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }

  const allOk = Object.values(checks).every((c) => c.status === "ok");
  return NextResponse.json(
    { success: allOk, data: { status: allOk ? "ok" : "degraded", checks } },
    { status: allOk ? 200 : 503 },
  );
}
