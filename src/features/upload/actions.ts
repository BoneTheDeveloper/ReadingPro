"use server";

import { z } from "zod";
import { getUserId } from "@/services/clerk";
import { processFileUpload } from "@/features/upload/db/upload-workflow";
import { analyzeAndPersistContent } from "@/features/upload/services/content-analysis.service";
import { validateTextContent } from "@/features/upload/lib/upload-validation";

export async function uploadFileAction(file: File) {
  const userId = await getUserId();

  const result = await processFileUpload(userId, file);

  return {
    success: true,
    data: {
      passageId: result.passageId,
      cefrLevel: result.cefrLevel,
      questionCount: result.questionCount,
    },
  };
}

const uploadTextSchema = z.object({
  text: z.string().min(1),
  title: z.string().optional(),
});

export async function uploadTextAction(
  input: z.infer<typeof uploadTextSchema>,
) {
  const parsed = uploadTextSchema.parse(input);
  const userId = await getUserId();

  const validation = validateTextContent(parsed.text);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const result = await analyzeAndPersistContent({
    userId,
    text: parsed.text,
    title: parsed.title || "Untitled",
    sourceType: "TEXT",
  });

  return { success: true, data: result };
}
