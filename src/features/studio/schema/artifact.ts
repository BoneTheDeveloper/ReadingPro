import { z } from "zod";
import { questionProgressSchema } from "./question";
import { flashcardProgressSchema } from "./flashcard";
import { StudioArtifactType } from "@/generated/prisma/enums";

const artifactCommon = {
  id: z.string(),
  passageId: z.string(),
  createdAt: z.coerce.date(),
} as const;

const questionVariant = z.object({
  type: z.literal(StudioArtifactType.QUESTION),
  progress: questionProgressSchema.nullable(),
});

const flashcardVariant = z.object({
  type: z.literal(StudioArtifactType.FLASHCARD),
  progress: flashcardProgressSchema.nullable(),
});

export const updateArtifactProgressInputSchema = z.object({
  progress: questionProgressSchema,
});

export const studioArtifactListItemSchema = z.discriminatedUnion("type", [
  questionVariant.extend(artifactCommon),
  flashcardVariant.extend(artifactCommon),
]);

export type StudioArtifactListItem = z.infer<typeof studioArtifactListItemSchema>;
