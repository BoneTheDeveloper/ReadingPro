import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { getUserId } from "@/types/services/clerk";
import {
  createRequestLogContext,
  createRequestLogger,
} from "@/types/services/logger";
import { normalizeDictionaryTerm } from "@/features/dictionary/schemas/normalize-dictionary-term";
import { suggestDictionaryTerms } from "@/features/dictionary/services/suggest-service";

const suggestQuerySchema = z.object({
  q: z.string().trim().min(1).max(200),
  sourceLanguage: z.literal("en"),
  targetLanguage: z.literal("vi"),
});

function isAuthenticationError(error: unknown) {
  return error instanceof Error && error.message === "Authentication required";
}

export async function GET(request: NextRequest) {
  const requestLog = createRequestLogger(
    "api:dictionary-suggest",
    createRequestLogContext(request, "GET", "/api/dictionary/suggest"),
  );

  try {
    const { searchParams } = new URL(request.url);
    const raw = {
      q: searchParams.get("q") ?? "",
      sourceLanguage: searchParams.get("sourceLanguage") ?? "en",
      targetLanguage: searchParams.get("targetLanguage") ?? "vi",
    };

    const parsed = suggestQuerySchema.safeParse(raw);
    if (!parsed.success) {
      requestLog.warn("Invalid suggest query rejected");
      return NextResponse.json(
        { error: "Invalid query parameters." },
        { status: 400 },
      );
    }

    const normalizedQuery = normalizeDictionaryTerm(parsed.data.q);

    if (normalizedQuery.length < 2) {
      return NextResponse.json({ success: true, data: [] });
    }

    await Sentry.startSpan(
      { name: "api:dictionary-suggest-auth", op: "auth" },
      () => getUserId(),
    );

    const merged = await Sentry.startSpan(
      {
        name: "db:dictionary-suggest",
        op: "db",
        attributes: {
          "dictionary.query_length": normalizedQuery.length,
        },
      },
      () =>
        suggestDictionaryTerms(parsed.data.q, {
          sourceLanguage: parsed.data.sourceLanguage,
          targetLanguage: parsed.data.targetLanguage,
        }),
    );

    requestLog.info(
      {
        context: {
          queryLength: normalizedQuery.length,
          mergedCount: merged.length,
        },
      },
      "Dictionary suggest completed",
    );

    return NextResponse.json({ success: true, data: merged });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    requestLog.error({ err: error }, "Dictionary suggest failed");
    Sentry.captureException(error, {
      tags: { route: "api:dictionary-suggest", method: "GET" },
    });
    return NextResponse.json({ error: "Suggest failed." }, { status: 500 });
  }
}
