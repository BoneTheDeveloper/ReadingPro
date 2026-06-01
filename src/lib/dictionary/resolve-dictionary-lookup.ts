import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db/client";
import { runWithPrismaQueryStep } from "@/lib/observability/prisma-query-metrics";
import { normalizeDictionaryTerm } from "./normalize-dictionary-term";
import {
  type DictionaryEntryDto,
  type DictionaryMissDto,
  type DictionaryTranslationDto,
  type DictionarySenseDto,
  RUNTIME_STATUSES,
  getSourceLabel,
} from "./dictionary-dtos";

export interface LookupOptions {
  sourceLanguage: string;
  targetLanguage: string;
  includeDraft?: boolean;
  performanceStepPrefix?: string;
}

export async function resolveDictionaryLookup(
  term: string,
  options: LookupOptions,
): Promise<DictionaryEntryDto | DictionaryMissDto> {
  const normalized = normalizeDictionaryTerm(term);
  const statuses = options.includeDraft
    ? [...RUNTIME_STATUSES, "draft"]
    : [...RUNTIME_STATUSES];

  const entry = await runLookupQueryStep(
    options.performanceStepPrefix,
    "headword",
    () => findEntryByHeadword(normalized, options.sourceLanguage),
  );
  if (entry) {
    return buildEntryDto(entry, options.targetLanguage, statuses);
  }

  const aliasEntry = await runLookupQueryStep(
    options.performanceStepPrefix,
    "alias",
    () => findEntryByAlias(normalized, options.sourceLanguage),
  );
  if (aliasEntry) {
    return buildEntryDto(aliasEntry, options.targetLanguage, statuses);
  }

  return { headword: normalized, found: false };
}

function runLookupQueryStep<T>(
  prefix: string | undefined,
  step: string,
  callback: () => Promise<T>,
) {
  if (!prefix) return callback();
  return runWithPrismaQueryStep(`${prefix}.${step}`, callback);
}

const QUICK_LOOKUP_STATUSES = Prisma.join(RUNTIME_STATUSES);

export async function resolveQuickDictionaryLookupSql(
  term: string,
  options: LookupOptions,
): Promise<DictionaryTranslationDto | null> {
  const normalized = normalizeDictionaryTerm(term);

  const rows: Array<{
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
  }> = await db.$queryRaw`
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
      CASE WHEN e."normalizedHeadword" = ${normalized} THEN 0 ELSE 1 END AS "matchType"
    FROM dictionary_entries e
    LEFT JOIN dictionary_aliases a
      ON a."entryId" = e.id AND a."normalizedAlias" = ${normalized}
    JOIN dictionary_senses s ON s."entryId" = e.id
    JOIN dictionary_translations t
      ON t."senseId" = s.id
      AND t."targetLanguage" = ${options.targetLanguage}
      AND t.status IN (${QUICK_LOOKUP_STATUSES})
      AND t."isPrimary" = true
    WHERE e."sourceLanguage" = ${options.sourceLanguage}
      AND (e."normalizedHeadword" = ${normalized} OR a.id IS NOT NULL)
    ORDER BY "matchType" ASC, s."usageRank" ASC, t.rank ASC
    LIMIT 1
  `;

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    senseId: row.senseId,
    targetLanguage: row.targetLanguage as "vi",
    translation: row.translation,
    isPrimary: row.isPrimary,
    rank: row.rank,
    confidence: row.confidence,
    status: row.status as DictionaryTranslationDto["status"],
    sourceType: row.sourceType as DictionaryTranslationDto["sourceType"],
    sourceName: row.sourceName,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    sourceLabel: getSourceLabel(row.sourceType, row.sourceName),
  };
}

async function findEntryByHeadword(normalizedHeadword: string, sourceLanguage: string) {
  return db.dictionaryEntry.findUnique({
    where: { normalizedHeadword_sourceLanguage: { normalizedHeadword, sourceLanguage } },
    include: {
      senses: {
        orderBy: { usageRank: "asc" },
        include: {
          translations: {
            where: { targetLanguage: "vi" },
            orderBy: [{ rank: "asc" }],
          },
        },
      },
    },
  });
}

async function findEntryByAlias(normalizedAlias: string, sourceLanguage: string) {
  const alias = await db.dictionaryAlias.findFirst({
    where: {
      normalizedAlias,
      entry: { sourceLanguage },
    },
    include: {
      entry: {
        include: {
          senses: {
            orderBy: { usageRank: "asc" },
            include: {
              translations: {
                where: { targetLanguage: "vi" },
                orderBy: [{ rank: "asc" }],
              },
            },
          },
        },
      },
    },
  });

  return alias?.entry ?? null;
}

function buildEntryDto(
  entry: Awaited<ReturnType<typeof findEntryByHeadword>> & {},
  targetLanguage: string,
  statuses: readonly string[],
): DictionaryEntryDto {
  const senses: DictionarySenseDto[] = (entry.senses ?? [])
    .map((sense) => {
      const translations = (sense.translations ?? [])
        .filter((t) => statuses.includes(t.status))
        .map(toTranslationDto);

      return {
        id: sense.id,
        partOfSpeech: sense.partOfSpeech,
        definition: sense.definition,
        example: sense.example,
        tags: sense.tags ?? [],
        usageRank: sense.usageRank,
        translations,
      };
    })
    .filter((s) => s.translations.length > 0);

  return {
    id: entry.id,
    headword: entry.headword,
    sourceLanguage: entry.sourceLanguage,
    frequencyRank: entry.frequencyRank,
    senses,
  };
}

function toTranslationDto(t: { id: string; senseId: string; targetLanguage: string; translation: string; isPrimary: boolean; rank: number; confidence: number | null; status: string; sourceType: string; sourceName: string | null; reviewedAt: Date | null }): DictionaryTranslationDto {
  return {
    id: t.id,
    senseId: t.senseId,
    targetLanguage: t.targetLanguage as "vi",
    translation: t.translation,
    isPrimary: t.isPrimary,
    rank: t.rank,
    confidence: t.confidence,
    status: t.status as DictionaryTranslationDto["status"],
    sourceType: t.sourceType as DictionaryTranslationDto["sourceType"],
    sourceName: t.sourceName,
    reviewedAt: t.reviewedAt?.toISOString() ?? null,
    sourceLabel: getSourceLabel(t.sourceType, t.sourceName),
  };
}
