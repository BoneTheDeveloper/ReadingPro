import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth/auth-utils";
import { createRequestLogContext, createRequestLogger } from "@/lib/core/logger";
import { normalizeDictionaryTerm } from "@/lib/dictionary/normalize-dictionary-term";
import {
  getSourceLabel,
  type DictionarySuggestItemDto,
} from "@/lib/dictionary/dictionary-dtos";
import {
  findEntriesByHeadwordPrefix,
  findEntriesByAliasPrefix,
} from "@/lib/db/dictionary-queries";

const suggestQuerySchema = z.object({
  q: z.string().trim().min(1).max(200),
  sourceLanguage: z.literal("en"),
  targetLanguage: z.literal("vi"),
});

function isAuthenticationError(error: unknown) {
  return error instanceof Error && error.message === "Authentication required";
}

/**
 * Extract the first primary translation text from the top-ranked sense of an entry.
 * Returns null if no translation is available.
 */
function extractPrimaryTranslation(
  entry: { senses?: Array<{ translations?: Array<{ translation: string }> }> },
): string | null {
  const sense = entry.senses?.[0];
  return sense?.translations?.[0]?.translation ?? null;
}

/**
 * Build a suggest item DTO from a headword-matched entry.
 */
function buildHeadwordSuggestItem(
  entry: {
    id: string;
    headword: string;
    normalizedHeadword: string;
    senses?: Array<{ translations?: Array<{ translation: string }> }>;
    aliases?: Array<{ normalizedAlias: string }>;
  },
  normalizedQuery: string,
): DictionarySuggestItemDto {
  const matchType = entry.normalizedHeadword === normalizedQuery ? "exact" : "prefix";
  const primaryTranslation = extractPrimaryTranslation(entry);

  return {
    id: entry.id,
    headword: entry.headword,
    matchType,
    matchedAlias: null,
    primaryTranslation,
    sourceLabel: primaryTranslation ? "Dictionary" : null,
  };
}

/**
 * Build a suggest item DTO from an alias-matched entry.
 */
function buildAliasSuggestItem(
  entry: {
    id: string;
    headword: string;
    normalizedHeadword: string;
    matchedAlias: string;
    aliasType: string;
    senses?: Array<{ translations?: Array<{ translation: string }> }>;
  },
  normalizedQuery: string,
): DictionarySuggestItemDto {
  const matchType = entry.matchedAlias === normalizedQuery ? "exact" : "prefix";
  const primaryTranslation = extractPrimaryTranslation(entry);

  return {
    id: entry.id,
    headword: entry.headword,
    matchType: matchType === "exact" ? "alias" : "prefix",
    matchedAlias: entry.matchedAlias,
    primaryTranslation,
    sourceLabel: primaryTranslation ? getSourceLabel(entry.aliasType, null) : null,
  };
}

/**
 * Rank score for sorting suggest results.
 * Lower is better (sort ascending).
 */
function rankScore(item: DictionarySuggestItemDto): number {
  switch (item.matchType) {
    case "exact":
      return 0;
    case "alias":
      return 1;
    case "prefix":
      return 2;
    case "phrase":
      return 3;
  }
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
      return NextResponse.json({ error: "Invalid query parameters." }, { status: 400 });
    }

    // Short-circuit: too short to produce meaningful prefix results
    const normalizedQuery = normalizeDictionaryTerm(parsed.data.q);
    if (normalizedQuery.length < 2) {
      return NextResponse.json({ success: true, data: [] });
    }

    const user = await Sentry.startSpan(
      { name: "api:dictionary-suggest-auth", op: "auth" },
      () => getAuthenticatedUser(),
    );

    const [headwordResults, aliasResults] = await Sentry.startSpan(
      {
        name: "db:dictionary-suggest",
        op: "db",
        attributes: {
          "dictionary.query_length": normalizedQuery.length,
          "user.id": user.id,
        },
      },
      () =>
        Promise.all([
          findEntriesByHeadwordPrefix(parsed.data.q, parsed.data.sourceLanguage),
          findEntriesByAliasPrefix(parsed.data.q, parsed.data.sourceLanguage),
        ]),
    );

    // Build items from both result sets
    const headwordItems = headwordResults.map((entry) =>
      buildHeadwordSuggestItem(entry, normalizedQuery),
    );

    const aliasItems = aliasResults.map((entry) =>
      buildAliasSuggestItem(entry, normalizedQuery),
    );

    // Merge and deduplicate by entry id (headword items take priority over alias)
    const seen = new Set<string>();
    const merged: DictionarySuggestItemDto[] = [];

    for (const item of [...headwordItems, ...aliasItems]) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      merged.push(item);
    }

    // Sort by match rank (exact > alias > prefix)
    merged.sort((a, b) => rankScore(a) - rankScore(b));

    requestLog.info(
      {
        context: {
          queryLength: normalizedQuery.length,
          headwordCount: headwordResults.length,
          aliasCount: aliasResults.length,
          mergedCount: merged.length,
        },
      },
      "Dictionary suggest completed",
    );

    return NextResponse.json({ success: true, data: merged });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    requestLog.error({ err: error }, "Dictionary suggest failed");
    Sentry.captureException(error, {
      tags: { route: "api:dictionary-suggest", method: "GET" },
    });
    return NextResponse.json({ error: "Suggest failed." }, { status: 500 });
  }
}
