import { z } from "zod";
import { CEFRLevel, ProcessingStatus, SourceType } from "@/shared/enums";
import { DEFAULT_TARGET_WORDS, MIN_TARGET_WORDS, PLAN_PASSAGE_LIMITS } from "@/shared/plan/plans";

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
  cefrLevel: true,
  wordCount: true,
  sourceType: true,
  status: true,
  createdAt: true,
});

export const passageListSchema = z.array(passageListItemSchema);

export type Passage = z.infer<typeof passageSchema>;
export type PassageListItem = z.infer<typeof passageListItemSchema>;

// ── Rewrite options ───────────────────────────────────────────────────────────
// How the AI rewrites the source into a reading passage. The defaults match the
// original fixed prompt (B1–B2, neutral, ~400 words) except fidelity, which
// stays close to the source by default.

export const PassageTargetLevel = { AUTO: "AUTO", A2: "A2", B1: "B1", B2: "B2", C1: "C1" } as const;
export type PassageTargetLevel = (typeof PassageTargetLevel)[keyof typeof PassageTargetLevel];
export const PASSAGE_TARGET_LEVEL_LABEL: Record<PassageTargetLevel, string> = {
  AUTO: "Tự động",
  A2: "A2",
  B1: "B1",
  B2: "B2",
  C1: "C1",
};

export const PassageTone = {
  NEUTRAL: "NEUTRAL",
  CONVERSATIONAL: "CONVERSATIONAL",
  ACADEMIC: "ACADEMIC",
  STORYTELLING: "STORYTELLING",
  JOURNALISTIC: "JOURNALISTIC",
} as const;
export type PassageTone = (typeof PassageTone)[keyof typeof PassageTone];
export const PASSAGE_TONE_LABEL: Record<PassageTone, string> = {
  NEUTRAL: "Trung tính",
  CONVERSATIONAL: "Thân mật",
  ACADEMIC: "Học thuật",
  STORYTELLING: "Kể chuyện",
  JOURNALISTIC: "Báo chí",
};

export const PassageFidelity = { CLOSE: "CLOSE", FREE: "FREE" } as const;
export type PassageFidelity = (typeof PassageFidelity)[keyof typeof PassageFidelity];
export const PASSAGE_FIDELITY_LABEL: Record<PassageFidelity, string> = {
  CLOSE: "Bám sát bản gốc",
  FREE: "Viết lại tự do",
};

export const passageGenerationOptionsSchema = z.object({
  targetLevel: z.enum(PassageTargetLevel).default(PassageTargetLevel.AUTO),
  tone: z.enum(PassageTone).default(PassageTone.NEUTRAL),
  /** Target length of the rewritten passage; the server clamps it to the tier's maximum. */
  targetWords: z
    .number()
    .int()
    .min(MIN_TARGET_WORDS)
    .max(PLAN_PASSAGE_LIMITS.PRO.maxTargetWords)
    .default(DEFAULT_TARGET_WORDS),
  fidelity: z.enum(PassageFidelity).default(PassageFidelity.CLOSE),
});
export type PassageGenerationOptions = z.infer<typeof passageGenerationOptionsSchema>;

const rewriteOptions = { options: passageGenerationOptionsSchema.optional() };

export const CreatePassageInputSchema = z.discriminatedUnion("sourceType", [
  z.object({
    sourceType: z.literal("TEXT"),
    title: z.string().trim(),
    text: z.string().trim(),
    ...rewriteOptions,
  }),
  z.object({
    sourceType: z.literal("PDF"),
    title: z.string().trim(),
    text: z.string().trim(),
    ...rewriteOptions,
  }),
  z.object({
    sourceType: z.literal("YOUTUBE"),
    title: z.string().trim(),
    youtubeUrl: z.string().trim().url(),
    ...rewriteOptions,
  }),
]);

export type CreatePassageInput = z.infer<typeof CreatePassageInputSchema>;

// ── External API Response Schemas ─────────────────────────────────────────────

/**
 * Metadata only. The cleaned passage comes back from a separate plain-text
 * call: wrapping a whole passage in a JSON string field pays escaping and
 * schema-constrained decoding on the largest payload in the app, and ties the
 * cheap title/level result to the slow one.
 */
export const passageMetadataSchema = z.object({
  title: z
    .string()
    .min(1)
    .describe("Concise descriptive title capturing the main topic."),
  cefrLevel: z
    .enum(CEFRLevel)
    .describe("CEFR level of the passage. Exactly one of: A1, A2, B1, B2, C1, C2."),
});

export type PassageMetadata = z.infer<typeof passageMetadataSchema>;
