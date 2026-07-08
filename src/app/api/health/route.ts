import { NextResponse } from "next/server";
import { createRequestLogContext, createRequestLogger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const MODULE = "api:health";

export async function GET() {
  const requestLog = createRequestLogger(
    MODULE,
    createRequestLogContext({}, "GET", "/api/health"),
  );

  const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {};

  // Database check
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
  const httpStatus = allOk ? 200 : 503;

  requestLog.debug({ context: { checks } }, "health check completed");
  return NextResponse.json(
    {
      success: allOk,
      data: {
        status: allOk ? "ok" : "degraded",
        checks,
      },
    },
    { status: httpStatus },
  );
}
