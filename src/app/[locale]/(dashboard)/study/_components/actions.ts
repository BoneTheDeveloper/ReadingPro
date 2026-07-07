"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getUserId } from "@/services/clerk";
import { deletePassage } from "@/features/passage/db/passage-queries";
import { saveVocabularyItem } from "@/features/vocabulary/services/vocabulary-items.service";

export async function deletePassageAction(passageId: string) {
  const userId = await getUserId();
  await deletePassage(passageId, userId);
  revalidatePath("/study");
}

const saveVocabularySchema = z.object({
  selectedText: z.string().trim().min(1).max(500),
  translation: z.string().trim().min(1).max(500),
  contextSentence: z.string().trim().max(4000).optional(),
  sourceId: z.string().uuid().optional(),
  sourceLanguage: z.literal("en"),
  targetLanguage: z.literal("vi"),
  type: z.string().optional(),
});

export async function saveVocabularyAction(
  input: z.infer<typeof saveVocabularySchema>,
) {
  const parsed = saveVocabularySchema.parse(input);
  const userId = await getUserId();
  return saveVocabularyItem({
    ...parsed,
    source: "TRANSLATE",
    userId,
  });
}
