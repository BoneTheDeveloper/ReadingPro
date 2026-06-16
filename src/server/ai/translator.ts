import 'server-only';
import { z } from "zod";

const quickTranslationDataSchema = z.object({
  translation: z.string().min(1).max(500),
  type: z.string().max(80).nullable().default(null),
});

export const quickTranslationSchema = quickTranslationDataSchema.extend({
  provider: z.enum(["cache", "dictionary", "fallback", "google_translate"]),
});

export type QuickTranslation = z.infer<typeof quickTranslationSchema>;
