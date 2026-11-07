import { start } from "workflow/api";
import { AppError } from "@/server/lib/errors";
import type { CreatePassageInput, Passage } from "@/shared/passage/schema";
import { createPassageForUser, findPassageForUser } from "./passage-repository";
import { requireTranscript } from "./ingestion/youtube-transcript";
import { passageProcessingWorkflow } from "./workflow/index";

export { deletePassageForUser, listPassagesForUser } from "./passage-repository";

/**
 * Saves the passage as PENDING and hands it to the processing workflow. A
 * YouTube link without a transcript is rejected before anything is saved.
 */
export async function submitPassageForUser(
  userId: string,
  input: CreatePassageInput,
): Promise<Passage> {
  if (input.sourceType === "YOUTUBE") await requireTranscript(input.youtubeUrl);

  const passage = await createPassageForUser({
    userId,
    sourceType: input.sourceType,
    youtubeUrl: input.sourceType === "YOUTUBE" ? input.youtubeUrl : null,
  });

  await start(passageProcessingWorkflow, [{ passageId: passage.id, input, userId }]);

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
