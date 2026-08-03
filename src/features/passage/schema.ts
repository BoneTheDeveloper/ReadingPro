import { z } from "zod";
import { CEFRLevel, ProcessingStatus, SourceType } from "@/generated/prisma/enums";

export const passageSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  content: z.string(),
  cefrLevel: z.enum(CEFRLevel).nullable(),
  wordCount: z.number().int(),
  sourceType: z.enum(SourceType),
  filePath: z.string().nullable(),
  createdAt: z.coerce.date(),
  youtubeUrl: z.string().nullable(),
  status: z.enum(ProcessingStatus),
});

const passageListItemSchema = passageSchema.pick({
  id: true,
  title: true,
  sourceType: true,
  status: true,
  createdAt: true,
});

export const passageListSchema = z.array(passageListItemSchema);

export type Passage = z.infer<typeof passageSchema>;
export type PassageListItem = z.infer<typeof passageListItemSchema>;


export const CreatePassageInputSchema = z.discriminatedUnion("sourceType", [
  z.object({
    sourceType: z.literal("TEXT"),
    title: z.string().trim(),
    text: z.string().trim(),
  }),
  z.object({
    sourceType: z.literal("PDF"),
    title: z.string().trim(),
    text: z.string().trim(),
  }),
  z.object({
    sourceType: z.literal("YOUTUBE"),
    title: z.string().trim(),
    youtubeUrl: z.string().trim().url(),
  }),
]);

export type CreatePassageInput = z.infer<typeof CreatePassageInputSchema>;

// ── External API Response Schemas ─────────────────────────────────────────────

export const DeepseekProcessPassageResponseSchema = z.object({
  text: z.string().describe("Cleaned passage text with fixed punctuation, capitalization, and paragraphs."),
  cefrLevel: z.nativeEnum(CEFRLevel).describe(
    "CEFR level of the passage (A1 beginner → C2 proficient).",
  ),
  title: z
    .string()
    .min(1)
    .max(50)
    .describe("Concise descriptive title capturing the main topic."),
});
