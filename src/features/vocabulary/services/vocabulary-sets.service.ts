import "server-only";
import { toIsoString } from "@/lib/utils";
import type {
  VocabularySetDto,
  VocabularySetType,
} from "@/features/vocabulary/schemas/vocabulary.schema";
import {
  listVocabularySets,
  createManualSet,
  updateVocabularySet,
  deleteVocabularySet,
  verifySetOwnership,
  addItemToSet,
  removeItemFromSet,
  type VocabularySetWithCount,
} from "@/features/vocabulary/db/vocabulary-sets.repository";

function toVocabularySetDto(set: VocabularySetWithCount): VocabularySetDto {
  return {
    id: set.id,
    name: set.name,
    type: set.type as VocabularySetDto["type"],
    periodStart: toIsoString(set.periodStart),
    periodEnd: toIsoString(set.periodEnd),
    createdAt: toIsoString(set.createdAt) ?? "",
    updatedAt: toIsoString(set.updatedAt) ?? "",
    _count: { items: set._count.setItems },
  };
}

export async function getVocabularySetList(params: {
  userId: string;
  type?: VocabularySetType;
}): Promise<VocabularySetDto[]> {
  const sets = await listVocabularySets(params);
  return sets.map(toVocabularySetDto);
}

export async function createVocabularyManualSet(params: {
  userId: string;
  name: string;
}): Promise<VocabularySetDto> {
  const set = await createManualSet(params);
  return toVocabularySetDto(set);
}

export async function renameVocabularySet(params: {
  userId: string;
  setId: string;
  name: string;
}): Promise<VocabularySetDto> {
  const set = await updateVocabularySet(params);
  return toVocabularySetDto(set);
}

export async function deleteVocabularySetById(params: {
  userId: string;
  setId: string;
}): Promise<void> {
  await deleteVocabularySet(params);
}

export async function addItemsToVocabularySet(params: {
  userId: string;
  setId: string;
  itemIds: string[];
}): Promise<void> {
  await verifySetOwnership(params.userId, params.setId);

  await Promise.all(
    params.itemIds.map((itemId) =>
      addItemToSet({ setId: params.setId, itemId }),
    ),
  );
}

export async function removeItemFromVocabularySet(params: {
  userId: string;
  setId: string;
  itemId: string;
}): Promise<void> {
  await removeItemFromSet(params);
}
