import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { RUNTIME_STATUSES } from "../lib/dictionary-helpers";

export interface LookupRawRow {
  entryId: string;
  headword: string;
  sourceLanguage: string;
  frequencyRank: number;
  senseId: string;
  partOfSpeech: string | null;
  definition: string | null;
  example: string | null;
  tags: string[] | null;
  usageRank: number;
  translationId: string | null;
  translationSenseId: string | null;
  targetLanguage: string | null;
  translation: string | null;
  isPrimary: boolean | null;
  rank: number | null;
  confidence: number | null;
  status: string | null;
  sourceType: string | null;
  sourceName: string | null;
  reviewedAt: Date | null;
}

export async function findDictionaryLookupEntry(
  normalizedTerm: string,
  sourceLanguage: string,
  targetLanguage: string = "vi",
): Promise<LookupRawRow[]> {
  return prisma.$queryRaw<LookupRawRow[]>`
        WITH matching_entry AS (
          SELECT e.id, 0 AS match_priority
          FROM dictionary_entries e
          WHERE e."normalizedHeadword" = ${normalizedTerm}
            AND e."sourceLanguage" = ${sourceLanguage}
          UNION ALL
          SELECT e.id, 1 AS match_priority
          FROM dictionary_aliases a
          JOIN dictionary_entries e ON e.id = a."entryId"
          WHERE a."normalizedAlias" = ${normalizedTerm}
            AND e."sourceLanguage" = ${sourceLanguage}
        ),
        best_entry AS (
          SELECT DISTINCT ON (id) id
          FROM matching_entry
          ORDER BY match_priority, id
          LIMIT 1
        )
        SELECT
          be.id AS "entryId",
          e.headword,
          e."sourceLanguage",
          e."frequencyRank",
          s.id AS "senseId",
          s."partOfSpeech",
          s.definition,
          s.example,
          s.tags,
          s."usageRank",
          t.id AS "translationId",
          t."senseId" AS "translationSenseId",
          t."targetLanguage",
          t.translation,
          t."isPrimary",
          t.rank,
          t.confidence,
          t.status,
          t."sourceType",
          t."sourceName",
          t."reviewedAt"
        FROM best_entry be
        JOIN dictionary_entries e ON e.id = be.id
        JOIN dictionary_senses s ON s."entryId" = be.id
        LEFT JOIN dictionary_translations t ON t."senseId" = s.id
          AND t."targetLanguage" = ${targetLanguage}
        ORDER BY s."usageRank" ASC, t.rank ASC
      `;
}

export interface QuickLookupRow {
  id: string;
  senseId: string;
  targetLanguage: string;
  translation: string;
  isPrimary: boolean;
  rank: number;
  confidence: number | null;
  status: string;
  sourceType: string;
  sourceName: string | null;
  reviewedAt: Date | null;
  matchType: number;
}

export interface QuickLookupOptions {
  sourceLanguage: string;
  targetLanguage: string;
}

const QUICK_LOOKUP_STATUSES = Prisma.join(RUNTIME_STATUSES);

export async function findQuickLookupTranslation(
  normalizedTerm: string,
  options: QuickLookupOptions,
): Promise<QuickLookupRow[]> {
  return prisma.$queryRaw<QuickLookupRow[]>`
        SELECT
          t.id,
          t."senseId",
          t."targetLanguage",
          t.translation,
          t."isPrimary",
          t.rank,
          t.confidence,
          t.status,
          t."sourceType",
          t."sourceName",
          t."reviewedAt",
          CASE WHEN e."normalizedHeadword" = ${normalizedTerm} THEN 0 ELSE 1 END AS "matchType"
        FROM dictionary_entries e
        LEFT JOIN dictionary_aliases a
          ON a."entryId" = e.id AND a."normalizedAlias" = ${normalizedTerm}
        JOIN dictionary_senses s ON s."entryId" = e.id
        JOIN dictionary_translations t
          ON t."senseId" = s.id
          AND t."targetLanguage" = ${options.targetLanguage}
          AND t.status IN (${QUICK_LOOKUP_STATUSES})
          AND t."isPrimary" = true
        WHERE e."sourceLanguage" = ${options.sourceLanguage}
          AND (e."normalizedHeadword" = ${normalizedTerm} OR a.id IS NOT NULL)
        ORDER BY "matchType" ASC, s."usageRank" ASC, t.rank ASC
        LIMIT 1
      `;
}
