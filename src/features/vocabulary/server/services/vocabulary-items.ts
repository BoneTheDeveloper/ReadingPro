import "server-only";
import { moduleLog } from "@/lib/logger";
import { getOwnedPassage } from "@/features/passage";
import type { VocabularyStatus } from "@/generated/prisma/enums";
import { VocabularySourceType } from "@/generated/prisma/enums";
import {
  type VocabularyItemDto,
  type VocabularyStatsDto,
  toVocabularyItemDto,
} from "@/features/vocabulary/schemas/vocabulary";
import {
  upsertVocabularyItem,
  listVocabularyItems,
  deleteVocabularyItem,
} from "../db/vocabulary-items";
import {
  updateVocabularyStatus,
  reviewVocabularyItem,
  getVocabularyStats,
} from "../db/vocabulary-item-progress";

const log = moduleLog("vocabulary:items");

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

export async function saveVocabularyItem(
  input: SaveVocabularyItemInput,
): Promise<VocabularyItemDto> {
  if (input.source === VocabularySourceType.TRANSLATE && input.sourceId) {
    const passage = await getOwnedPassage(input.userId, input.sourceId);

    if (!passage) {
      throw new Error("Source passage not found");
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
