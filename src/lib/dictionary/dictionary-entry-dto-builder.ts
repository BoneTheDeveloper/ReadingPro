import {
  type DictionaryEntryDto,
  type DictionarySenseDto,
  type DictionaryTranslationDto,
  getSourceLabel,
} from "./dictionary-dtos";

type EntryWithSenses = {
  id: string;
  headword: string;
  sourceLanguage: string;
  frequencyRank: number;
  senses?: Array<{
    id: string;
    partOfSpeech: string | null;
    definition: string | null;
    example: string | null;
    tags: string[] | null;
    usageRank: number;
    translations?: Array<{
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
  }>;
};

export function buildEntryDto(
  entry: EntryWithSenses,
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

export function toTranslationDto(t: {
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
}): DictionaryTranslationDto {
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
