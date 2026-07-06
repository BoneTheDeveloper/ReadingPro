import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { getUserId } from "@/services/clerk";
import {
  createRequestLogContext,
  createRequestLogger,
} from "@/services/logger";
import { normalizeDictionaryTerm } from "@/features/dictionary/schemas/normalize-dictionary-term";
import { searchDictionary } from "@/features/dictionary/services/search-service";
import type { DictionarySearchResultDto } from "@/contracts/dictionary/dictionary-response-schema";

const dictionarySearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(200),
  sourceLanguage: z.literal("en"),
  targetLanguage: z.literal("vi"),
  limit: z.coerce.number().int().min(1).max(50).default(8),
});

function isAuthenticationError(error: unknown) {
  return error instanceof Error && error.message === "Authentication required";
}

export async function GET(request: NextRequest) {
  const requestLog = createRequestLogger(
    "api:dictionary-search",
    createRequestLogContext(request, "GET", "/api/dictionary/search"),
  );

  try {
    const { searchParams } = new URL(request.url);
    const raw = {
      q: searchParams.get("q") ?? "",
      sourceLanguage: searchParams.get("sourceLanguage") ?? "en",
      targetLanguage: searchParams.get("targetLanguage") ?? "vi",
      limit: searchParams.get("limit") ?? undefined,
    };

    const parsed = dictionarySearchQuerySchema.safeParse(raw);
    if (!parsed.success) {
      requestLog.warn(
        {
          context: { issues: parsed.error.issues.map((i) => i.path.join(".")) },
        },
        "Invalid dictionary search query rejected",
      );
      return NextResponse.json(
        { error: "Invalid query parameters." },
        { status: 400 },
      );
    }

    const normalizedQuery = normalizeDictionaryTerm(parsed.data.q);

    await Sentry.startSpan(
      { name: "api:dictionary-search-authenticate", op: "auth" },
      () => getUserId(),
    );

    const results = (await Sentry.startSpan(
      {
        name: "db:dictionary-search",
        op: "db",
        attributes: {
          "dictionary.query_length": normalizedQuery.length,
        },
      },
      () =>
        searchDictionary(parsed.data.q, {
          sourceLanguage: parsed.data.sourceLanguage,
          targetLanguage: parsed.data.targetLanguage,
          limit: parsed.data.limit,
        }),
    )) as DictionarySearchResultDto[];

    requestLog.info(
      {
        context: {
          queryLength: normalizedQuery.length,
          resultCount: results.length,
        },
      },
      "Dictionary search completed",
    );

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    requestLog.error({ err: error }, "Dictionary search failed");
    Sentry.captureException(error, {
      tags: { route: "api:dictionary-search", method: "GET" },
    });
    return NextResponse.json(
      { error: "Dictionary search failed." },
      { status: 500 },
    );
  }
}
