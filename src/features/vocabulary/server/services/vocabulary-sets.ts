import "server-only";
import type {
  VocabularySetDto,
  VocabularySetType,
} from "@/features/vocabulary/schemas/vocabulary";
import {
  listVocabularySets,
  createManualSet,
  updateVocabularySet,
  deleteVocabularySet,
  verifySetOwnership,
  addItemToSet,
  removeItemFromSet,
  type VocabularySetWithCount,
} from "@/features/vocabulary/server/db/vocabulary-sets";

function toVocabularySetDto(set: VocabularySetWithCount): VocabularySetDto {
  return {
    id: set.id,
    name: set.name,
    type: set.type as VocabularySetDto["type"],
    periodStart: set.periodStart?.toISOString() ?? null,
    periodEnd: set.periodEnd?.toISOString() ?? null,
    createdAt: set.createdAt.toISOString(),
    updatedAt: set.updatedAt.toISOString(),
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
