import "server-only";
import * as Sentry from "@sentry/nextjs";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { RUNTIME_STATUSES } from "@/contracts/dictionary/dictionary-dtos";
import { escapeLikeWildcards } from "@/contracts/dictionary/normalize-dictionary-term";

export interface DictionarySearchCandidateRow {
  id: string;
  headword: string;
  matchType: "exact" | "alias" | "phrase" | "prefix" | "contains";
  matchedText: string | null;
  primaryTranslation: string | null;
  partOfSpeech: string | null;
  sourceType: string | null;
  sourceName: string | null;
}

export interface DictionarySearchCandidateInput {
  normalizedQuery: string;
  sourceLanguage: string;
  targetLanguage: string;
  limit: number;
}

const SEARCH_STATUSES = Prisma.join(RUNTIME_STATUSES);

export async function searchDictionaryCandidates(
  input: DictionarySearchCandidateInput,
): Promise<DictionarySearchCandidateRow[]> {
  return Sentry.startSpan(
    {
      name: "db:dictionary-search-candidates",
      op: "db",
      attributes: {
        "db.operation": "queryRaw",
        "dictionary.query_length": input.normalizedQuery.length,
        "dictionary.limit": input.limit,
      },
    },
    () => searchDictionaryCandidatesSql(input),
  );
}

async function searchDictionaryCandidatesSql({
  normalizedQuery,
  sourceLanguage,
  targetLanguage,
  limit,
}: DictionarySearchCandidateInput): Promise<DictionarySearchCandidateRow[]> {
  const escaped = escapeLikeWildcards(normalizedQuery);
  const prefixQuery = `${escaped}%`;
  const containsQuery = `%${escaped}%`;
  const phraseMiddleQuery = `% ${escaped} %`;
  const phraseStartQuery = `${escaped} %`;
  const phraseEndQuery = `% ${escaped}`;

  const rows = await db.$queryRaw<
    Array<{
      id: string;
      headword: string;
      matchType: string;
      matchedText: string | null;
      primaryTranslation: string | null;
      partOfSpeech: string | null;
      sourceType: string | null;
      sourceName: string | null;
    }>
  >`
    WITH candidates AS (
      SELECT
        e.id,
        e.headword,
        e."normalizedHeadword",
        e."frequencyRank",
        0 AS rank,
        'exact' AS "matchType",
        NULL::text AS "matchedText"
      FROM dictionary_entries e
      WHERE e."sourceLanguage" = ${sourceLanguage}
        AND e."normalizedHeadword" = ${normalizedQuery}

      UNION ALL

      SELECT
        e.id,
        e.headword,
        e."normalizedHeadword",
        e."frequencyRank",
        1 AS rank,
        'alias' AS "matchType",
        a."normalizedAlias" AS "matchedText"
      FROM dictionary_aliases a
      JOIN dictionary_entries e ON e.id = a."entryId"
      WHERE e."sourceLanguage" = ${sourceLanguage}
        AND a."normalizedAlias" = ${normalizedQuery}

      UNION ALL

      SELECT
        e.id,
        e.headword,
        e."normalizedHeadword",
        e."frequencyRank",
        2 AS rank,
        'phrase' AS "matchType",
        NULL::text AS "matchedText"
      FROM dictionary_entries e
      WHERE e."sourceLanguage" = ${sourceLanguage}
        AND e."normalizedHeadword" <> ${normalizedQuery}
        AND (
          e."normalizedHeadword" LIKE ${phraseMiddleQuery}
          OR e."normalizedHeadword" LIKE ${phraseStartQuery}
          OR e."normalizedHeadword" LIKE ${phraseEndQuery}
        )

      UNION ALL

      SELECT
        e.id,
        e.headword,
        e."normalizedHeadword",
        e."frequencyRank",
        2 AS rank,
        'phrase' AS "matchType",
        a."normalizedAlias" AS "matchedText"
      FROM dictionary_aliases a
      JOIN dictionary_entries e ON e.id = a."entryId"
      WHERE e."sourceLanguage" = ${sourceLanguage}
        AND a."normalizedAlias" <> ${normalizedQuery}
        AND (
          a."normalizedAlias" LIKE ${phraseMiddleQuery}
          OR a."normalizedAlias" LIKE ${phraseStartQuery}
          OR a."normalizedAlias" LIKE ${phraseEndQuery}
        )

      UNION ALL

      SELECT
        e.id,
        e.headword,
        e."normalizedHeadword",
        e."frequencyRank",
        3 AS rank,
        'prefix' AS "matchType",
        NULL::text AS "matchedText"
      FROM dictionary_entries e
      WHERE e."sourceLanguage" = ${sourceLanguage}
        AND e."normalizedHeadword" LIKE ${prefixQuery}

      UNION ALL

      SELECT
        e.id,
        e.headword,
        e."normalizedHeadword",
        e."frequencyRank",
        3 AS rank,
        'prefix' AS "matchType",
        a."normalizedAlias" AS "matchedText"
      FROM dictionary_aliases a
      JOIN dictionary_entries e ON e.id = a."entryId"
      WHERE e."sourceLanguage" = ${sourceLanguage}
        AND a."normalizedAlias" LIKE ${prefixQuery}

      UNION ALL

      SELECT
        e.id,
        e.headword,
        e."normalizedHeadword",
        e."frequencyRank",
        4 AS rank,
        'contains' AS "matchType",
        NULL::text AS "matchedText"
      FROM dictionary_entries e
      WHERE e."sourceLanguage" = ${sourceLanguage}
        AND e."normalizedHeadword" LIKE ${containsQuery}

      UNION ALL

      SELECT
        e.id,
        e.headword,
        e."normalizedHeadword",
        e."frequencyRank",
        4 AS rank,
        'contains' AS "matchType",
        a."normalizedAlias" AS "matchedText"
      FROM dictionary_aliases a
      JOIN dictionary_entries e ON e.id = a."entryId"
      WHERE e."sourceLanguage" = ${sourceLanguage}
        AND a."normalizedAlias" LIKE ${containsQuery}
    ),
    ranked AS (
      SELECT DISTINCT ON (c.id)
        c.id,
        c.headword,
        c."normalizedHeadword",
        c."frequencyRank",
        c.rank,
        c."matchType",
        c."matchedText"
      FROM candidates c
      ORDER BY c.id, c.rank ASC, c."frequencyRank" ASC, c."normalizedHeadword" ASC
    )
    SELECT
      r.id,
      r.headword,
      r."matchType",
      r."matchedText",
      tr.translation AS "primaryTranslation",
      s."partOfSpeech",
      tr."sourceType",
      tr."sourceName"
    FROM ranked r
    LEFT JOIN LATERAL (
      SELECT ds.id, ds."partOfSpeech", ds."usageRank"
      FROM dictionary_senses ds
      WHERE ds."entryId" = r.id
      ORDER BY ds."usageRank" ASC
      LIMIT 1
    ) s ON true
    LEFT JOIN LATERAL (
      SELECT
        dt.translation,
        dt."sourceType",
        dt."sourceName",
        dt.rank
      FROM dictionary_translations dt
      WHERE dt."senseId" = s.id
        AND dt."targetLanguage" = ${targetLanguage}
        AND dt.status IN (${SEARCH_STATUSES})
        AND dt."isPrimary" = true
      ORDER BY dt.rank ASC
      LIMIT 1
    ) tr ON true
    ORDER BY r.rank ASC, r."frequencyRank" ASC, r."normalizedHeadword" ASC
    LIMIT ${limit}
  `;

  return rows.map((row) => ({
    id: row.id,
    headword: row.headword,
    matchType: toMatchType(row.matchType),
    matchedText: row.matchedText,
    primaryTranslation: row.primaryTranslation,
    partOfSpeech: row.partOfSpeech,
    sourceType: row.sourceType,
    sourceName: row.sourceName,
  }));
}

function toMatchType(value: string): DictionarySearchCandidateRow["matchType"] {
  if (
    value === "exact" ||
    value === "alias" ||
    value === "phrase" ||
    value === "prefix" ||
    value === "contains"
  ) {
    return value;
  }
  return "contains";
}
