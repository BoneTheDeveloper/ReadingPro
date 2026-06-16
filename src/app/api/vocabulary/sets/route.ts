import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { getAuthenticatedUser } from "@/server/auth/auth-utils";
import { isAuthenticationRequiredError } from "@/server/http/route-errors";
import { createRequestLogContext, createRequestLogger } from "@/server/core/logger";
import { listVocabularySets, createManualSet } from "@/server/db/vocabulary-set-queries";

const createSetSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export async function GET(request: NextRequest) {
  const requestLog = createRequestLogger(
    "api:vocabulary:sets",
    createRequestLogContext(request, "GET", "/api/vocabulary/sets"),
  );

  try {
    const user = await getAuthenticatedUser();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") ?? undefined;

    const sets = await listVocabularySets({
      userId: user.id,
      type: type as "MANUAL" | "DAILY" | "WEEKLY" | undefined,
    });

    return NextResponse.json({ success: true, data: sets });
  } catch (error) {
    if (isAuthenticationRequiredError(error)) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    requestLog.error({ err: error }, "Failed to list vocabulary sets");
    return NextResponse.json({ error: "Failed to list vocabulary sets." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const requestLog = createRequestLogger(
    "api:vocabulary:sets",
    createRequestLogContext(request, "POST", "/api/vocabulary/sets"),
  );

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const parsed = createSetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const user = await getAuthenticatedUser();

    const set = await Sentry.startSpan(
      { name: "db:vocabulary-set-create", op: "db" },
      async () =>
        createManualSet({
          userId: user.id,
          name: parsed.data.name,
        }),
    );

    return NextResponse.json({ success: true, data: set });
  } catch (error) {
    if (isAuthenticationRequiredError(error)) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    requestLog.error({ err: error }, "Failed to create vocabulary set");
    Sentry.captureException(error, {
      tags: { route: "api:vocabulary:sets", method: "POST" },
    });
    return NextResponse.json({ error: "Failed to create vocabulary set." }, { status: 500 });
  }
}
