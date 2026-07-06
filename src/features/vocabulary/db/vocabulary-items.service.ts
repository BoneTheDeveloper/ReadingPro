import "server-only";
import { createModuleLogger } from "@/services/observability/logger";
import type { VocabularyItemDto, VocabularyStatsDto, VocabularyStatus } from "@/contracts/vocabulary/vocabulary-dtos";
import { buildVocabularyItemDto, buildVocabularyStatsDto } from "@/features/vocabulary/db/shared/vocabulary-dto-builders";
import {
  findOwnedSource,
  upsertVocabularyItem,
  listVocabularyItems,
  deleteVocabularyItem,
} from "./vocabulary-items.repository";
import {
  updateVocabularyStatus,
  reviewVocabularyItem,
  getVocabularyStats,
} from "./vocabulary-item-progress.repository";

const log = createModuleLogger("lib:vocabulary-service");

export class VocabularyServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VocabularyServiceError";
  }
}

export interface SaveVocabularyItemInput {
  userId: string;
  selectedText: string;
  translation: string;
  sourceLanguage: string;
  targetLanguage: string;
  sourceId?: string;
  contextSentence?: string;
  source?: "TRANSLATE" | "DICTIONARY";
  dictionaryEntryId?: string;
  dictionarySenseId?: string;
}

export async function saveVocabularyItem(
  input: SaveVocabularyItemInput,
): Promise<VocabularyItemDto> {
  if (input.source === "TRANSLATE" && input.sourceId) {
    const passage = await findOwnedSource(input.userId, input.sourceId);

    if (!passage) {
      throw new VocabularyServiceError("Source not found.");
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

  return buildVocabularyItemDto({ ...item, occurrences: [] });
}

export async function getVocabularyItemList(params: {
  userId: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ items: VocabularyItemDto[]; total: number }> {
  const { items, total } = await listVocabularyItems(params);
  return { items: items.map(buildVocabularyItemDto), total };
}

export async function getVocabularyItemStats(userId: string): Promise<VocabularyStatsDto> {
  const stats = await getVocabularyStats(userId);
  return buildVocabularyStatsDto(stats);
}

export async function updateVocabularyItemStatus(params: {
  userId: string;
  itemId: string;
  status: VocabularyStatus;
}): Promise<VocabularyItemDto> {
  const item = await updateVocabularyStatus(params);
  return buildVocabularyItemDto({ ...item, occurrences: [] });
}

export async function reviewVocabularyItemById(params: {
  userId: string;
  itemId: string;
  isCorrect: boolean;
}): Promise<VocabularyItemDto> {
  const item = await reviewVocabularyItem(params);
  return buildVocabularyItemDto({ ...item, occurrences: [] });
}

export async function deleteVocabularyItemById(params: {
  userId: string;
  itemId: string;
}): Promise<void> {
  await deleteVocabularyItem(params);
}
