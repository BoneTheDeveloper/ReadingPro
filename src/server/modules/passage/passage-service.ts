import { consumeQuota, getUserTier } from "@/server/modules/subscription";
import { MIN_SOURCE_WORDS, PLAN_PASSAGE_LIMITS, countWords } from "@/shared/plan/plans";
import { passageGenerationOptionsSchema } from "@/shared/passage/schema";
import { start } from "workflow/api";
import { AppError } from "@/server/lib/errors";
import type { CreatePassageInput, Passage } from "@/shared/passage/schema";
import {
  createPassageForUser,
  deletePassageForUser as deletePassageRow,
  findPassageForUser,
} from "./passage-repository";
import { requireTranscript } from "./ingestion/youtube-transcript";
import { passageProcessingWorkflow } from "./workflow/index";

export { listPassagesForUser } from "./passage-repository";

/**
 * Saves the passage as PENDING and hands it to the processing workflow. A
 * YouTube link without a transcript, or a source outside the tier's size
 * limits, is rejected before anything is saved or any quota is spent.
 */
export async function submitPassageForUser(
  userId: string,
  input: CreatePassageInput,
): Promise<Passage> {
  const source = input.sourceType === "YOUTUBE" ? await requireTranscript(input.youtubeUrl) : input.text;
  const tier = await getUserTier(userId);
  const limits = PLAN_PASSAGE_LIMITS[tier];

  const words = countWords(source);
  if (words < MIN_SOURCE_WORDS) {
    throw new AppError("passage.too_short", "Source is too short", { words, min: MIN_SOURCE_WORDS });
  }
  if (words > limits.maxSourceWords) {
    throw new AppError("passage.too_long", "Source is too long for the plan", { words, max: limits.maxSourceWords, tier });
  }

  // A longer target than the tier allows is lowered, not refused.
  const options = passageGenerationOptionsSchema.parse(input.options ?? {});
  const clamped = { ...options, targetWords: Math.min(options.targetWords, limits.maxTargetWords) };

  await consumeQuota(userId, "passage_import");

  const passage = await createPassageForUser({
    userId,
    sourceType: input.sourceType,
    youtubeUrl: input.sourceType === "YOUTUBE" ? input.youtubeUrl : null,
  });

  await start(passageProcessingWorkflow, [{ passageId: passage.id, input: { ...input, options: clamped }, userId }]);

  return passage;
}

export async function requireOwnedPassage(userId: string, id: string): Promise<Passage> {
  const passage = await findPassageForUser(userId, id);
  if (!passage) throw new AppError("passage.not_found", "Passage not found", { id });
  return passage;
}

/** Content is empty until processing completes, so only a COMPLETED passage can be read or studied. */
export async function requireReadyPassage(userId: string, id: string): Promise<Passage> {
  const passage = await findPassageForUser(userId, id);
  if (!passage || passage.status !== "COMPLETED") {
    throw new AppError("passage.not_ready", "Passage is not ready");
  }
  return passage;
}

export async function deletePassageForUser(userId: string, id: string): Promise<void> {
  const deleted = await deletePassageRow(userId, id);
  if (!deleted) throw new AppError("passage.not_found", "Passage not found", { id });
}
