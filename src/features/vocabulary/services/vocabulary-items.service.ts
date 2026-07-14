import "server-only";
import { NotFoundError } from "@/lib/errors";
import { createModuleLogger } from "@/lib/logger";
import { toIsoString } from "@/lib/utils";
import type { VocabularyStatus, VocabularySourceType } from "../schemas/vocabulary.schema";
import type {
  VocabularyItemDto,
  VocabularyStatsDto,
} from "@/features/vocabulary/schemas/vocabulary.schema";
import {
  findOwnedSource,
  upsertVocabularyItem,
  listVocabularyItems,
  deleteVocabularyItem,
} from "../db/vocabulary-items.repository";
import {
  updateVocabularyStatus,
  reviewVocabularyItem,
  getVocabularyStats,
} from "../db/vocabulary-item-progress.repository";

const log = createModuleLogger("lib:vocabulary-service");

export interface SaveVocabularyItemInput {
  userId: string;
  selectedText: string;
  translation: string;
  sourceLanguage: string;
  targetLanguage: string;
  sourceId?: string;
  contextSentence?: string;
  source?: VocabularySourceType;
  dictionaryEntryId?: string;
  dictionarySenseId?: string;
}

function toVocabularyItemDto(item: {
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
  nextReviewAt: Date | null;
  lastReviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  occurrences?: {
    id: string;
    vocabularyItemId: string;
    sourceId: string | null;
    selectedText: string;
    contextSentence: string | null;
    createdAt: Date;
  }[];
}): VocabularyItemDto {
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
    nextReviewAt: toIsoString(item.nextReviewAt),
    lastReviewedAt: toIsoString(item.lastReviewedAt),
    createdAt: toIsoString(item.createdAt) ?? "",
    updatedAt: toIsoString(item.updatedAt) ?? "",
    occurrences: (item.occurrences ?? []).map((o) => ({
      id: o.id,
      vocabularyItemId: o.vocabularyItemId,
      sourceId: o.sourceId,
      selectedText: o.selectedText,
      contextSentence: o.contextSentence,
      createdAt: toIsoString(o.createdAt) ?? "",
    })),
  };
}

export async function saveVocabularyItem(
  input: SaveVocabularyItemInput,
): Promise<VocabularyItemDto> {
  if (input.source === "TRANSLATE" && input.sourceId) {
    const passage = await findOwnedSource(input.userId, input.sourceId);

    if (!passage) {
      throw new NotFoundError("Source");
    }
  }

  const item = await upsertVocabularyItem(input);

  log.info(
    {
      context: {
        vocabularyItemId: item.id,
        selectedTextLength: input.selectedText.length,
      },
    },
    "Vocabulary item saved",
  );

  return toVocabularyItemDto({ ...item, occurrences: [] });
}

export async function getVocabularyItemList(params: {
  userId: string;
  status?: VocabularyStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ items: VocabularyItemDto[]; total: number }> {
  const { items, total } = await listVocabularyItems(params);
  return { items: items.map(toVocabularyItemDto), total };
}

export async function getVocabularyItemStats(
  userId: string,
): Promise<VocabularyStatsDto> {
  const stats = await getVocabularyStats(userId);
  return {
    total: stats.total,
    new: stats.new,
    learning: stats.learning,
    known: stats.known,
  };
}

export async function updateVocabularyItemStatus(params: {
  userId: string;
  itemId: string;
  status: VocabularyStatus;
}): Promise<VocabularyItemDto> {
  const item = await updateVocabularyStatus(params);
  return toVocabularyItemDto({ ...item, occurrences: [] });
}

export async function reviewVocabularyItemById(params: {
  userId: string;
  itemId: string;
  isCorrect: boolean;
}): Promise<VocabularyItemDto> {
  const item = await reviewVocabularyItem(params);
  return toVocabularyItemDto({ ...item, occurrences: [] });
}

export async function deleteVocabularyItemById(params: {
  userId: string;
  itemId: string;
}): Promise<void> {
  await deleteVocabularyItem(params);
}
