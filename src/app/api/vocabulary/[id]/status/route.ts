import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { updateVocabularyStatus } from "@/server/db/vocabulary-queries";
import { getAuthenticatedUser } from "@/server/auth/auth-utils";
import { isAuthenticationRequiredError, isOwnershipMissError } from "@/server/http/route-errors";
import { createRequestLogContext, createRequestLogger } from "@/server/observability/logger";

const statusUpdateSchema = z.object({
  status: z.enum(["NEW", "LEARNING", "MASTERED"]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestLog = createRequestLogger(
    "api:vocabulary:status",
    createRequestLogContext(request, "PATCH", "/api/vocabulary/[id]/status"),
  );

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const parsed = statusUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const user = await getAuthenticatedUser();
    const { id } = await params;

    const item = await Sentry.startSpan(
      { name: "db:vocabulary-status-update", op: "db" },
      async () =>
        updateVocabularyStatus({
          userId: user.id,
          itemId: id,
          status: parsed.data.status,
        }),
    );

    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    if (isAuthenticationRequiredError(error)) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    if (isOwnershipMissError(error, ["vocabulary item", "vocabulary"])) {
      return NextResponse.json({ error: "Vocabulary item not found." }, { status: 404 });
    }

    requestLog.error({ err: error }, "Failed to update vocabulary status");
    Sentry.captureException(error, {
      tags: { route: "api:vocabulary:status", method: "PATCH" },
    });
    return NextResponse.json({ error: "Failed to update vocabulary status." }, { status: 500 });
  }
}
