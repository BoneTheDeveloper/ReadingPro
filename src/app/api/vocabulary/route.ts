import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth/auth-utils";
import {
  createRequestLogContext,
  createRequestLogger,
} from "@/lib/core/logger";
import { upsertVocabularyItem } from "@/lib/db/vocabulary-queries";
import { getOwnedTranslationSource } from "@/lib/db/translation-queries";
import { isAuthenticationRequiredError } from "@/lib/api/route-errors";

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

    // For TRANSLATE source, verify passage ownership
    if (input.source === "TRANSLATE" && input.sourceId) {
      const passage = await Sentry.startSpan(
        {
          name: "db:vocabulary-source-fetch",
          op: "db",
          attributes: {
            "db.operation": "findUnique",
            "db.model": "Passage",
            "translation.source_id": input.sourceId,
            "user.id": user.id,
          },
        },
        () => getOwnedTranslationSource(user.id, input.sourceId!),
      );

      if (!passage) {
        requestLog.warn("Vocabulary source not found");
        return NextResponse.json({ error: "Source not found." }, { status: 404 });
      }
    }

    const item = await Sentry.startSpan(
      {
        name: "db:vocabulary-upsert",
        op: "db",
        attributes: {
          "db.operation": "upsert",
          "db.model": "VocabularyItem",
          "translation.selected_text_length": input.selectedText.length,
          "user.id": user.id,
        },
      },
      () =>
        upsertVocabularyItem({
          userId: user.id,
          selectedText: input.selectedText,
          translation: input.translation,
          sourceLanguage: input.sourceLanguage,
          targetLanguage: input.targetLanguage,
          sourceId: input.sourceId,
          contextSentence: input.contextSentence,
          source: input.source,
          dictionaryEntryId: input.dictionaryEntryId,
          dictionarySenseId: input.dictionarySenseId,
        }),
    );

    requestLog.info(
      {
        context: {
          vocabularyItemId: item.id,
          selectedTextLength: input.selectedText.length,
        },
      },
      "Vocabulary item saved",
    );

    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    if (isAuthenticationRequiredError(error)) {
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
