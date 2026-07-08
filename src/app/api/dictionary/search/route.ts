import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserId } from "@/services/clerk";
import { createRequestLogContext, createRequestLogger } from "@/lib/logger";
import { toHttp } from "@/lib/http/route-errors";
import { normalizeDictionaryTerm } from "@/features/dictionary/lib/normalize-dictionary-term";
import { searchDictionary } from "@/features/dictionary/services/search-service";
import type { DictionarySearchResultDto } from "@/features/dictionary/schemas/dictionary.schema";

const MODULE = "api:dictionary:search";

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
  const log = createRequestLogger(
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
      log.warn(
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

    await getUserId();

    const results = (await searchDictionary(parsed.data.q, {
      sourceLanguage: parsed.data.sourceLanguage,
      targetLanguage: parsed.data.targetLanguage,
      limit: parsed.data.limit,
    })) as DictionarySearchResultDto[];

    log.info(
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

    return toHttp(error, log, MODULE);
  }
}
