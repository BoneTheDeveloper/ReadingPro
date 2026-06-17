import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { getAuthenticatedUser } from "@/server/auth/auth-utils";
import {
  createRequestLogContext,
  createRequestLogger,
} from "@/server/observability/logger";
import { isAuthenticationRequiredError } from "@/server/http/route-errors";
import {
  VocabularyServiceError,
  saveVocabularyItem,
} from "@/server/modules/vocabulary/vocabulary.service";

const vocabularyRequestSchema = z.object({
  selectedText: z.string().trim().min(1).max(500),
  translation: z.string().trim().min(1).max(500),
  contextSentence: z.string().trim().max(4000).optional(),
  sourceId: z.string().uuid().optional(),
  sourceLanguage: z.literal("en"),
  targetLanguage: z.literal("vi"),
  source: z.enum(["TRANSLATE", "DICTIONARY"]).default("TRANSLATE"),
  dictionaryEntryId: z.string().uuid().optional(),
  dictionarySenseId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  let requestLog = createRequestLogger(
    "api:vocabulary",
    createRequestLogContext(request, "POST", "/api/vocabulary"),
  );

  try {
    let body: unknown;
    try {
      body = await Sentry.startSpan(
        { name: "api:vocabulary-parse-body", op: "http.server" },
        () => request.json(),
      );
    } catch {
      requestLog.warn("Invalid JSON payload received for vocabulary save");
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const parsed = vocabularyRequestSchema.safeParse(body);
    if (!parsed.success) {
      requestLog.warn(
        { context: { issues: parsed.error.issues.map((issue) => issue.path.join(".")) } },
        "Invalid vocabulary request rejected",
      );
      return NextResponse.json({ error: "Invalid vocabulary request." }, { status: 400 });
    }

    const input = parsed.data;
    requestLog = requestLog.child({
      targetLanguage: input.targetLanguage,
      source: input.source,
    });

    const user = await Sentry.startSpan(
      { name: "api:vocabulary-authenticate", op: "auth" },
      () => getAuthenticatedUser(),
    );
    requestLog = requestLog.child({ userId: user.id });

    const item = await saveVocabularyItem({ ...input, userId: user.id });

    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    if (isAuthenticationRequiredError(error)) {
      requestLog.warn("Unauthenticated vocabulary request rejected");
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    if (error instanceof VocabularyServiceError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    requestLog.error({ err: error }, "Vocabulary save failed");
    Sentry.captureException(error, {
      tags: { route: "api:vocabulary", method: "POST" },
    });
    return NextResponse.json({ error: "Unable to save vocabulary." }, { status: 500 });
  }
}
