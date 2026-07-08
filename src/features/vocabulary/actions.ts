"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getUserId } from "@/services/clerk";
import type { VocabularyStatus } from "./schemas/vocabulary.schema";
import {
  saveVocabularyItem,
  deleteVocabularyItemById,
  updateVocabularyItemStatus,
  reviewVocabularyItemById,
} from "./services/vocabulary-items.service";
import {
  createVocabularyManualSet,
  renameVocabularySet,
  deleteVocabularySetById,
  addItemsToVocabularySet,
  removeItemFromVocabularySet,
} from "./services/vocabulary-sets.service";

// ============== Validation Schemas ==============

const saveVocabularySchema = z.object({
  selectedText: z.string().trim().min(1).max(500),
  translation: z.string().trim().min(1).max(500),
  contextSentence: z.string().trim().max(4000).optional(),
  sourceId: z.string().uuid().optional(),
  sourceLanguage: z.literal("en"),
  targetLanguage: z.literal("vi"),
  source: z.enum(["TRANSLATE", "DICTIONARY"]).default("TRANSLATE"),
  dictionaryEntryId: z.string().uuid().optional(),
  dictionarySenseId: z.string().uuid().optional(),
});

const updateStatusSchema = z.object({
  itemId: z.string().uuid(),
  status: z.enum(["NEW", "LEARNING", "MASTERED"]),
});

const reviewSchema = z.object({
  itemId: z.string().uuid(),
  isCorrect: z.boolean(),
});

const createSetSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

const updateSetSchema = z.object({
  setId: z.string().uuid(),
  name: z.string().trim().min(1).max(100),
});

const deleteSetSchema = z.object({
  setId: z.string().uuid(),
});

const addItemsToSetSchema = z.object({
  setId: z.string().uuid(),
  itemIds: z.array(z.string().uuid()).min(1),
});

const removeItemFromSetSchema = z.object({
  setId: z.string().uuid(),
  itemId: z.string().uuid(),
});

// ============== Vocabulary Item Actions ==============

export async function saveVocabularyAction(
  input: z.infer<typeof saveVocabularySchema>
) {
  const parsed = saveVocabularySchema.parse(input);
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
  input: z.infer<typeof updateStatusSchema>
) {
  const parsed = updateStatusSchema.parse(input);
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
  input: z.infer<typeof reviewSchema>
) {
  const parsed = reviewSchema.parse(input);
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
  input: z.infer<typeof createSetSchema>
) {
  const parsed = createSetSchema.parse(input);
  const userId = await getUserId();

  const result = await createVocabularyManualSet({
    userId,
    name: parsed.name,
  });

  revalidatePath("/vocabulary");
  return { success: true, data: result };
}

export async function updateVocabularySetAction(
  input: z.infer<typeof updateSetSchema>
) {
  const parsed = updateSetSchema.parse(input);
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
  input: z.infer<typeof deleteSetSchema>
) {
  const parsed = deleteSetSchema.parse(input);
  const userId = await getUserId();

  await deleteVocabularySetById({ userId, setId: parsed.setId });

  revalidatePath("/vocabulary");
  return { success: true };
}

export async function addItemsToVocabularySetAction(
  input: z.infer<typeof addItemsToSetSchema>
) {
  const parsed = addItemsToSetSchema.parse(input);
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
  input: z.infer<typeof removeItemFromSetSchema>
) {
  const parsed = removeItemFromSetSchema.parse(input);
  const userId = await getUserId();

  await removeItemFromVocabularySet({
    userId,
    setId: parsed.setId,
    itemId: parsed.itemId,
  });

  revalidatePath("/vocabulary");
  return { success: true };
}
