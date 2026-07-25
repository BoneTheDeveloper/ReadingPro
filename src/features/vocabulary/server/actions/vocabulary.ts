"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import type { VocabularyStatus } from "@/features/vocabulary/schemas/vocabulary";
import {
  saveVocabularyInputSchema,
  updateVocabularyStatusInputSchema,
  createVocabularySetInputSchema,
  deleteVocabularySetInputSchema,
} from "@/features/vocabulary/schemas/vocabulary";
import {
  saveVocabularyItem,
  deleteVocabularyItemById,
  updateVocabularyItemStatus,
} from "../services/vocabulary-items";
import {
  createVocabularyManualSet,
  deleteVocabularySetById,
} from "../services/vocabulary-sets";

// ============== Vocabulary Item Actions ==============

export async function saveVocabularyAction(
  input: z.infer<typeof saveVocabularyInputSchema>
) {
  const parsed = saveVocabularyInputSchema.parse(input);
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Authentication required");

  const result = await saveVocabularyItem({
    ...parsed,
    userId: session.user.id,
  });

  revalidatePath("/vocabulary");
  return { success: true, data: result };
}

export async function deleteVocabularyItemAction(itemId: string) {
  const parsed = z.string().uuid().parse(itemId);
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Authentication required");

  await deleteVocabularyItemById({ userId: session.user.id, itemId: parsed });

  revalidatePath("/vocabulary");
  return { success: true };
}

export async function updateVocabularyStatusAction(
  input: z.infer<typeof updateVocabularyStatusInputSchema>
) {
  const parsed = updateVocabularyStatusInputSchema.parse(input);
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Authentication required");

  const result = await updateVocabularyItemStatus({
    userId: session.user.id,
    itemId: parsed.itemId,
    status: parsed.status as VocabularyStatus,
  });

  revalidatePath("/vocabulary");
  return { success: true, data: result };
}

// ============== Vocabulary Set Actions ==============

export async function createVocabularySetAction(
  input: z.infer<typeof createVocabularySetInputSchema>
) {
  const parsed = createVocabularySetInputSchema.parse(input);
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Authentication required");

  const result = await createVocabularyManualSet({
    userId: session.user.id,
    name: parsed.name,
  });

  revalidatePath("/vocabulary");
  return { success: true, data: result };
}

export async function deleteVocabularySetAction(
  input: z.infer<typeof deleteVocabularySetInputSchema>
) {
  const parsed = deleteVocabularySetInputSchema.parse(input);
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Authentication required");

  await deleteVocabularySetById({ userId: session.user.id, setId: parsed.setId });

  revalidatePath("/vocabulary");
  return { success: true };
}
