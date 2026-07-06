import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getUserId } from "@/services/clerk";
import {
  getZodErrorMessage,
  isAuthenticationRequiredError,
} from "@/lib/http/route-errors";
import {
  createRequestLogContext,
  createRequestLogger,
} from "@/services/logger";
import { ensureActiveSession } from "@/features/learning-session/db/learning-session-queries";
import { toLearningSessionDto } from "@/features/learning-session/schemas/learning-session-response-schema";

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
    const session = await Sentry.startSpan(
      { name: "db:session-ensure-active", op: "db" },
      async () => {
        return ensureActiveSession(userId);
      },
    );
    return NextResponse.json({
      success: true,
      data: toLearningSessionDto(session),
    });
  } catch (error) {
    if (isAuthenticationRequiredError(error)) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: getZodErrorMessage(error) },
        { status: 400 },
      );
    }
    requestLog.error({ err: error }, "Failed to ensure active session");
    Sentry.captureException(error, {
      tags: { route: "api:learning-session", method: "POST" },
    });
    return NextResponse.json(
      { error: "Failed to ensure active session" },
      { status: 500 },
    );
  }
}
