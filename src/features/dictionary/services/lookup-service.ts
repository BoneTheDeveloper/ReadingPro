import "server-only";
import { normalizeDictionaryTerm } from "../lib/normalize-dictionary-term";
import {
  type DictionaryEntryDto,
  type DictionaryMissDto,
  type DictionaryTranslationDto,
} from "@/features/dictionary/schemas/dictionary.schema";
import {
  RUNTIME_STATUSES,
  getSourceLabel,
} from "@/features/dictionary/lib/dictionary-helpers";
import { buildEntryDto } from "../schemas/dictionary.schema";
import {
  findDictionaryLookupEntry,
  findQuickLookupTranslation,
  type LookupRawRow,
} from "../db/lookup-repository";

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

  const rows = await findDictionaryLookupEntry(
    normalized,
    options.sourceLanguage,
    options.targetLanguage,
  );

  if (rows.length === 0) {
    return { headword: normalized, found: false };
  }

  const entry = groupLookupRows(rows);
  return buildEntryDto(entry, options.targetLanguage, statuses);
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

export function groupLookupRows(rows: LookupRawRow[]) {
  const first = rows[0];
  const senseMap = new Map<
    string,
    {
      id: string;
      partOfSpeech: string | null;
      definition: string | null;
      example: string | null;
      tags: string[] | null;
      usageRank: number;
      translations: Array<{
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
      }>;
    }
  >();

  for (const row of rows) {
    let sense = senseMap.get(row.senseId);
    if (!sense) {
      sense = {
        id: row.senseId,
        partOfSpeech: row.partOfSpeech,
        definition: row.definition,
        example: row.example,
        tags: row.tags,
        usageRank: row.usageRank,
        translations: [],
      };
      senseMap.set(row.senseId, sense);
    }

    if (row.translationId) {
      sense.translations.push({
        id: row.translationId,
        senseId: row.translationSenseId!,
        targetLanguage: row.targetLanguage!,
        translation: row.translation!,
        isPrimary: row.isPrimary!,
        rank: row.rank!,
        confidence: row.confidence,
        status: row.status!,
        sourceType: row.sourceType!,
        sourceName: row.sourceName,
        reviewedAt: row.reviewedAt,
      });
    }
  }

  return {
    id: first.entryId,
    headword: first.headword,
    sourceLanguage: first.sourceLanguage,
    frequencyRank: first.frequencyRank,
    senses: Array.from(senseMap.values()),
  };
}
