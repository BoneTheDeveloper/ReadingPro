import "server-only";
import type {
  VocabularySetDto,
  VocabularySetType,
} from "@/features/vocabulary/schemas/vocabulary.schema";
import { buildVocabularySetDto } from "@/features/vocabulary/db/shared/vocabulary-dto-builders";
import {
  listVocabularySets,
  createManualSet,
  updateVocabularySet,
  deleteVocabularySet,
  verifySetOwnership,
  addItemToSet,
  removeItemFromSet,
} from "../db/sets/vocabulary-sets.repository";

export async function getVocabularySetList(params: {
  userId: string;
  type?: VocabularySetType;
}): Promise<VocabularySetDto[]> {
  const sets = await listVocabularySets(params);
  return sets.map(buildVocabularySetDto);
}

export async function createVocabularyManualSet(params: {
  userId: string;
  name: string;
}): Promise<VocabularySetDto> {
  const set = await createManualSet(params);
  return buildVocabularySetDto(set);
}

export async function renameVocabularySet(params: {
  userId: string;
  setId: string;
  name: string;
}): Promise<VocabularySetDto> {
  const set = await updateVocabularySet(params);
  return buildVocabularySetDto(set);
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
