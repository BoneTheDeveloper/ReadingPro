import { runWithPrismaQueryStep } from "@/lib/observability/prisma-query-metrics";
import { normalizeDictionaryTerm } from "./normalize-dictionary-term";
import {
  type DictionaryEntryDto,
  type DictionaryMissDto,
  type DictionaryTranslationDto,
  RUNTIME_STATUSES,
  getSourceLabel,
} from "./dictionary-dtos";
import { buildEntryDto } from "./dictionary-entry-dto-builder";
import {
  findEntryByHeadword,
  findEntryByAlias,
  findQuickLookupTranslation,
} from "./dictionary-lookup-repository";

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

export async function resolveQuickDictionaryLookupSql(
  term: string,
  options: LookupOptions,
): Promise<DictionaryTranslationDto | null> {
  const normalized = normalizeDictionaryTerm(term);

  const rows = await findQuickLookupTranslation(normalized, {
    sourceLanguage: options.sourceLanguage,
    targetLanguage: options.targetLanguage,
  });

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

function runLookupQueryStep<T>(
  prefix: string | undefined,
  step: string,
  callback: () => Promise<T>,
) {
  if (!prefix) return callback();
  return runWithPrismaQueryStep(`${prefix}.${step}`, callback);
}
