"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getUserId } from "@/server/auth/auth-utils";
import { deletePassage } from "@/server/db/passage-queries";
import { saveVocabularyItem } from "@/server/modules/vocabulary/vocabulary.service";
import { toVocabularyDTO } from "@/app/api/vocabulary/vocabulary-dto-mapper";

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
  const item = await saveVocabularyItem({
    ...parsed,
    source: "TRANSLATE",
    userId,
  });
  return toVocabularyDTO(item);
}
