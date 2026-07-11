import "server-only";
import { prisma } from "@/lib/prisma";
import type { LookupRawRow } from "./lookup.repository";

export async function findEntryByIdRaw(
  entryId: string,
  sourceLanguage: string,
  targetLanguage: string = "vi",
): Promise<LookupRawRow[]> {
  return prisma.$queryRaw<LookupRawRow[]>`
        SELECT
          e.id AS "entryId",
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
        FROM dictionary_entries e
        JOIN dictionary_senses s ON s."entryId" = e.id
        LEFT JOIN dictionary_translations t ON t."senseId" = s.id
          AND t."targetLanguage" = ${targetLanguage}
          AND t.status IN ('reviewed', 'approved')
        WHERE e.id = ${entryId}
          AND e."sourceLanguage" = ${sourceLanguage}
        ORDER BY s."usageRank" ASC, t.rank ASC
      `;
}
