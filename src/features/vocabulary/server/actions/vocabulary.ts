"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getUserId } from "@/lib/auth/auth-server";
import type { VocabularyStatus } from "@/features/vocabulary/schemas/vocabulary";
import {
  saveVocabularyInputSchema,
  updateVocabularyStatusInputSchema,
  reviewVocabularyInputSchema,
  createVocabularySetInputSchema,
  updateVocabularySetInputSchema,
  deleteVocabularySetInputSchema,
  addItemsToVocabularySetInputSchema,
  removeItemFromVocabularySetInputSchema,
} from "@/features/vocabulary/schemas/vocabulary";
import {
  saveVocabularyItem,
  deleteVocabularyItemById,
  updateVocabularyItemStatus,
  reviewVocabularyItemById,
} from "../services/vocabulary-items";
import {
  createVocabularyManualSet,
  renameVocabularySet,
  deleteVocabularySetById,
  addItemsToVocabularySet,
  removeItemFromVocabularySet,
} from "../services/vocabulary-sets";

// ============== Vocabulary Item Actions ==============

export async function saveVocabularyAction(
  input: z.infer<typeof saveVocabularyInputSchema>
) {
  const parsed = saveVocabularyInputSchema.parse(input);
  const userId = await getUserId();

  const result = await saveVocabularyItem({
    ...parsed,
    userId,
  });

  revalidatePath("/vocabulary");
  return { success: true, data: result };
}

export async function deleteVocabularyItemAction(itemId: string) {
  const parsed = z.string().uuid().parse(itemId);
  const userId = await getUserId();

  await deleteVocabularyItemById({ userId, itemId: parsed });

  revalidatePath("/vocabulary");
  return { success: true };
}

export async function updateVocabularyStatusAction(
  input: z.infer<typeof updateVocabularyStatusInputSchema>
) {
  const parsed = updateVocabularyStatusInputSchema.parse(input);
  const userId = await getUserId();

  const result = await updateVocabularyItemStatus({
    userId,
    itemId: parsed.itemId,
    status: parsed.status as VocabularyStatus,
  });

  revalidatePath("/vocabulary");
  return { success: true, data: result };
}

export async function submitVocabularyReviewAction(
  input: z.infer<typeof reviewVocabularyInputSchema>
) {
  const parsed = reviewVocabularyInputSchema.parse(input);
  const userId = await getUserId();

  const result = await reviewVocabularyItemById({
    userId,
    itemId: parsed.itemId,
    isCorrect: parsed.isCorrect,
  });

  revalidatePath("/vocabulary");
  return { success: true, data: result };
}

// ============== Vocabulary Set Actions ==============

export async function createVocabularySetAction(
  input: z.infer<typeof createVocabularySetInputSchema>
) {
  const parsed = createVocabularySetInputSchema.parse(input);
  const userId = await getUserId();

  const result = await createVocabularyManualSet({
    userId,
    name: parsed.name,
  });

  revalidatePath("/vocabulary");
  return { success: true, data: result };
}

export async function updateVocabularySetAction(
  input: z.infer<typeof updateVocabularySetInputSchema>
) {
  const parsed = updateVocabularySetInputSchema.parse(input);
  const userId = await getUserId();

  const result = await renameVocabularySet({
    userId,
    setId: parsed.setId,
    name: parsed.name,
  });

  revalidatePath("/vocabulary");
  return { success: true, data: result };
}

export async function deleteVocabularySetAction(
  input: z.infer<typeof deleteVocabularySetInputSchema>
) {
  const parsed = deleteVocabularySetInputSchema.parse(input);
  const userId = await getUserId();

  await deleteVocabularySetById({ userId, setId: parsed.setId });

  revalidatePath("/vocabulary");
  return { success: true };
}

export async function addItemsToVocabularySetAction(
  input: z.infer<typeof addItemsToVocabularySetInputSchema>
) {
  const parsed = addItemsToVocabularySetInputSchema.parse(input);
  const userId = await getUserId();

  await addItemsToVocabularySet({
    userId,
    setId: parsed.setId,
    itemIds: parsed.itemIds,
  });

  revalidatePath("/vocabulary");
  return { success: true };
}

export async function removeItemFromVocabularySetAction(
  input: z.infer<typeof removeItemFromVocabularySetInputSchema>
) {
  const parsed = removeItemFromVocabularySetInputSchema.parse(input);
  const userId = await getUserId();

  await removeItemFromVocabularySet({
    userId,
    setId: parsed.setId,
    itemId: parsed.itemId,
  });

  revalidatePath("/vocabulary");
  return { success: true };
}
