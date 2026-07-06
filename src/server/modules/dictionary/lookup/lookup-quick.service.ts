import 'server-only';
import { normalizeDictionaryTerm } from "@/features/dictionary/schemas/normalize-dictionary-term";
import { RUNTIME_STATUSES } from "@/features/dictionary/lib/dictionary-helpers";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";

export interface QuickTranslationInput {
  text: string;
  context: string;
  sourceLanguage: string;
  targetLanguage: string;
}

export interface QuickTranslation {
  translation: string;
  source: string;
  provider: string;
}

export const quickTranslationSchema = z.object({
  translation: z.string(),
  source: z.string(),
  provider: z.string(),
});

const RUNTIME_STATUS_LIST = Prisma.join(RUNTIME_STATUSES);

export async function resolveQuickDictionaryTranslation(
  input: QuickTranslationInput
): Promise<QuickTranslation | null> {
  const normalized = normalizeDictionaryTerm(input.text);

  const rows = await prisma.$queryRaw<Array<{
    translation: string;
    sourceType: string;
  }>>`
    SELECT
      t.translation,
      t."sourceType"
    FROM dictionary_entries e
    LEFT JOIN dictionary_aliases a
      ON a."entryId" = e.id AND a."normalizedAlias" = ${normalized}
    JOIN dictionary_senses s ON s."entryId" = e.id
    JOIN dictionary_translations t
      ON t."senseId" = s.id
      AND t."targetLanguage" = ${input.targetLanguage}
      AND t.status IN (${RUNTIME_STATUS_LIST})
      AND t."isPrimary" = true
    WHERE e."sourceLanguage" = ${input.sourceLanguage}
      AND (e."normalizedHeadword" = ${normalized} OR a.id IS NOT NULL)
    ORDER BY s."usageRank" ASC
    LIMIT 1
  `;

  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    translation: row.translation,
    source: row.sourceType,
    provider: 'dictionary',
  };
}
