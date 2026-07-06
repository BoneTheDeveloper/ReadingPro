import type {
  VocabularyItemDto,
  VocabularyOccurrenceDto,
  VocabularySetDto,
  VocabularyStatsDto,
} from "@/features/vocabulary/vocabulary.schema";

interface OccurrenceShape {
  id: string;
  vocabularyItemId: string;
  sourceId: string | null;
  selectedText: string;
  contextSentence: string | null;
  createdAt: Date | string;
}

interface VocabularyItemShape {
  id: string;
  normalizedText: string;
  displayText: string;
  type: string | null;
  translation: string;
  sourceLanguage: string;
  targetLanguage: string;
  status: string;
  source: string;
  savedCount: number;
  nextReviewAt: Date | string | null;
  lastReviewedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  occurrences?: OccurrenceShape[];
}

interface VocabularySetShape {
  id: string;
  name: string;
  type: string;
  periodStart: Date | string | null;
  periodEnd: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  _count: { setItems: number };
}

function buildOccurrenceDto(
  occurrence: OccurrenceShape,
): VocabularyOccurrenceDto {
  return {
    id: occurrence.id,
    vocabularyItemId: occurrence.vocabularyItemId,
    sourceId: occurrence.sourceId,
    selectedText: occurrence.selectedText,
    contextSentence: occurrence.contextSentence,
    createdAt: new Date(occurrence.createdAt).toISOString(),
  };
}

export function buildVocabularyItemDto(
  item: VocabularyItemShape,
): VocabularyItemDto {
  return {
    id: item.id,
    normalizedText: item.normalizedText,
    displayText: item.displayText,
    type: item.type,
    translation: item.translation,
    sourceLanguage: item.sourceLanguage,
    targetLanguage: item.targetLanguage,
    status: item.status as VocabularyItemDto["status"],
    source: item.source,
    savedCount: item.savedCount,
    nextReviewAt: item.nextReviewAt
      ? new Date(item.nextReviewAt).toISOString()
      : null,
    lastReviewedAt: item.lastReviewedAt
      ? new Date(item.lastReviewedAt).toISOString()
      : null,
    createdAt: new Date(item.createdAt).toISOString(),
    updatedAt: new Date(item.updatedAt).toISOString(),
    occurrences: (item.occurrences ?? []).map(buildOccurrenceDto),
  } satisfies VocabularyItemDto;
}

export function buildVocabularySetDto(
  set: VocabularySetShape,
): VocabularySetDto {
  return {
    id: set.id,
    name: set.name,
    type: set.type as VocabularySetDto["type"],
    periodStart: set.periodStart
      ? new Date(set.periodStart).toISOString()
      : null,
    periodEnd: set.periodEnd ? new Date(set.periodEnd).toISOString() : null,
    createdAt: new Date(set.createdAt).toISOString(),
    updatedAt: new Date(set.updatedAt).toISOString(),
    _count: { items: set._count.setItems },
  } satisfies VocabularySetDto;
}

export function buildVocabularyStatsDto(stats: {
  total: number;
  new: number;
  learning: number;
  known: number;
}): VocabularyStatsDto {
  return {
    total: stats.total,
    new: stats.new,
    learning: stats.learning,
    known: stats.known,
  } satisfies VocabularyStatsDto;
}
