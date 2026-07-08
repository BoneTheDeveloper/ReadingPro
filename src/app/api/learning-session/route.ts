import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/services/clerk";
import { toHttp } from "@/lib/http/route-errors";
import { createRequestLogContext, createRequestLogger } from "@/lib/logger";
import { ensureActiveSession } from "@/features/learning-session/db/learning-session-queries";
import { toLearningSessionDto } from "@/features/learning-session/schemas/learning-session.schema";

const learningSessionPostSchema = z.object({}).strict();

export async function POST(request: NextRequest) {
  const requestLog = createRequestLogger(
    "api:learning-session",
    createRequestLogContext(request, "POST", "/api/learning-session"),
  );
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload." },
        { status: 400 },
      );
    }
    const parsed = learningSessionPostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }
    const userId = await getUserId();
    const session = await ensureActiveSession(userId);
    return NextResponse.json({
      success: true,
      data: toLearningSessionDto(session),
    });
  } catch (error) {
    return toHttp(error, requestLog, "api:learning-session");
  }
}
