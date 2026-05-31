import { db } from "@/lib/db/client";
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
}

export async function resolveDictionaryLookup(
  term: string,
  options: LookupOptions,
): Promise<DictionaryEntryDto | DictionaryMissDto> {
  const normalized = normalizeDictionaryTerm(term);
  const statuses = options.includeDraft
    ? [...RUNTIME_STATUSES, "draft"]
    : [...RUNTIME_STATUSES];

  const entry = await findEntryByHeadword(normalized, options.sourceLanguage);
  if (entry) {
    return buildEntryDto(entry, options.targetLanguage, statuses);
  }

  const aliasEntry = await findEntryByAlias(normalized, options.sourceLanguage);
  if (aliasEntry) {
    return buildEntryDto(aliasEntry, options.targetLanguage, statuses);
  }

  return { headword: normalized, found: false };
}

export async function resolveQuickDictionaryLookup(
  term: string,
  options: LookupOptions,
): Promise<DictionaryTranslationDto | null> {
  const normalized = normalizeDictionaryTerm(term);
  const statuses = options.includeDraft
    ? [...RUNTIME_STATUSES, "draft"]
    : [...RUNTIME_STATUSES];

  const entry = await findEntryByHeadword(normalized, options.sourceLanguage)
    ?? await findEntryByAlias(normalized, options.sourceLanguage);

  if (!entry) return null;

  const firstSense = entry.senses
    .slice()
    .sort((a, b) => a.usageRank - b.usageRank)[0];
  if (!firstSense) return null;

  const primary = firstSense.translations
    .filter((t) => statuses.includes(t.status as typeof statuses[number]) && t.isPrimary)
    .sort((a, b) => a.rank - b.rank)[0];

  if (!primary) return null;

  return toTranslationDto(primary);
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
  const alias = await db.dictionaryAlias.findUnique({
    where: { normalizedAlias_entryId: { normalizedAlias, entryId: "" } },
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

  if (!alias) {
    const aliasByTerm = await db.dictionaryAlias.findFirst({
      where: { normalizedAlias },
      include: {
        entry: {
          where: { sourceLanguage },
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
    return aliasByTerm?.entry ?? null;
  }

  return alias.entry;
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
