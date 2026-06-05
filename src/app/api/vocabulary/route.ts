import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth/auth-utils";
import { createRequestLogContext, createRequestLogger } from "@/lib/core/logger";
import {
  getOwnedTranslationSource,
  saveVocabularyItem,
} from "@/lib/db/translation-queries";

const vocabularyRequestSchema = z.object({
  sourceId: z.string().uuid(),
  selectedText: z.string().trim().min(1).max(500),
  translation: z.string().trim().min(1).max(500),
  contextSentence: z.string().trim().min(1).max(4000),
  sourceLanguage: z.literal("en"),
  targetLanguage: z.literal("vi"),
  type: z.string().trim().min(1).max(80).optional(),
});

function isAuthenticationError(error: unknown) {
  return error instanceof Error && error.message === "Authentication required";
}

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

    requestLog = requestLog.child({
      sourceId: parsed.data.sourceId,
      targetLanguage: parsed.data.targetLanguage,
    });

    const user = await Sentry.startSpan(
      {
        name: "api:vocabulary-authenticate",
        op: "auth",
        attributes: { "translation.source_id": parsed.data.sourceId },
      },
      () => getAuthenticatedUser(),
    );
    requestLog = requestLog.child({ userId: user.id });

    const source = await Sentry.startSpan(
      {
        name: "db:vocabulary-source-fetch",
        op: "db",
        attributes: {
          "db.operation": "findUnique",
          "db.model": "Passage",
          "translation.source_id": parsed.data.sourceId,
          "user.id": user.id,
        },
      },
      () => getOwnedTranslationSource(user.id, parsed.data.sourceId),
    );

    if (!source) {
      requestLog.warn("Vocabulary source not found");
      return NextResponse.json({ error: "Source not found." }, { status: 404 });
    }

    const item = await Sentry.startSpan(
      {
        name: "db:vocabulary-upsert",
        op: "db",
        attributes: {
          "db.operation": "upsert",
          "db.model": "VocabularyItem",
          "translation.source_id": parsed.data.sourceId,
          "translation.selected_text_length": parsed.data.selectedText.length,
          "translation.context_length": parsed.data.contextSentence.length,
          "user.id": user.id,
        },
      },
      () =>
        saveVocabularyItem({
          userId: user.id,
          ...parsed.data,
        }),
    );

    requestLog.info(
      {
        context: {
          vocabularyItemId: item.id,
          selectedTextLength: parsed.data.selectedText.length,
          contextLength: parsed.data.contextSentence.length,
        },
      },
      "Vocabulary item saved",
    );

    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    if (isAuthenticationError(error)) {
      requestLog.warn("Unauthenticated vocabulary request rejected");
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    requestLog.error({ err: error }, "Vocabulary save failed");
    Sentry.captureException(error, {
      tags: { route: "api:vocabulary", method: "POST" },
    });
    return NextResponse.json({ error: "Unable to save vocabulary." }, { status: 500 });
  }
}
