import { z } from "zod";
import { CEFRLevel, SourceType } from "@/generated/prisma/enums";

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
});

const passageListItemSchema = passageSchema.pick({
  id: true,
  title: true,
  sourceType: true,
  createdAt: true,
});

export const passageListSchema = z.array(passageListItemSchema);

export type Passage = z.infer<typeof passageSchema>;
export type PassageListItem = z.infer<typeof passageListItemSchema>;


export const CreatePassageInputSchema = z.discriminatedUnion("sourceType", [
  z.object({
    sourceType: z.literal("TEXT"),
    title: z.string().trim().min(1).max(200),
    text: z.string().trim().min(50, "Nội dung quá ngắn").max(100_000, "Nội dung quá dài"),
  }),
  z.object({
    sourceType: z.literal("PDF"),
    title: z.string().trim().min(1).max(200),
    text: z.string().trim().min(50, "Nội dung quá ngắn").max(100_000, "Nội dung quá dài"),
  }),
  z.object({
    sourceType: z.literal("YOUTUBE"),
    title: z.string().trim().min(1).max(200),
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
    .describe("Concise descriptive title (≤ 80 chars) capturing the main topic."),
});
