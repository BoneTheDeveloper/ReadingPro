import { z } from "zod";
import { PartOfSpeech, VocabularyStatus } from "@/generated/prisma/enums";

export const VocabularyInputSchema = z.object({
  term: z.string().trim().min(1).max(80),
  translation: z.string().trim().min(1).max(200),
  sourceLanguage: z.literal("en").default("en"),
  targetLanguage: z.literal("vi").default("vi"),
  partofSpeech: z.nativeEnum(PartOfSpeech),
});

export type VocabularyInput = z.input<typeof VocabularyInputSchema>;
export type VocabularyInputParsed = z.output<typeof VocabularyInputSchema>;

export const VocabularyItemSchema = z.object({
  id: z.string().uuid(),
  term: z.string(),
  translation: z.string(),
  sourceLanguage: z.string(),
  targetLanguage: z.string(),
  partofSpeech: z.nativeEnum(PartOfSpeech),
  learningstatus: z.nativeEnum(VocabularyStatus).default("NEW"),
  createdAt: z.coerce.date(),
});

export type VocabularyItem = z.infer<typeof VocabularyItemSchema>;

export const vocabularyListSchema = z.array(VocabularyItemSchema);
