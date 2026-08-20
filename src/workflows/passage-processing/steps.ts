/**
 * Step functions for passage processing.
 * Steps can use Node.js modules (prisma, path, etc.)
 */
import "server-only";
import { preprocessPassage } from "@/features/passage/server/service/passage-preprocessing";
import { runPassageProcessing } from "@/features/passage/server/service/passage-processing";
import { failPassageProcessing } from "@/features/passage/server/service/passage-crud";
import type { CreatePassageInput } from "@/features/passage/schema";
import { log } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";

export interface PassageProcessingInput {
  passageId: string;
  input: CreatePassageInput;
  userId: string;
}

/**
 * Preprocess passage: extract text and normalize
 */
export async function preprocessStep(args: PassageProcessingInput) {
  "use step";

  const { normalized } = await preprocessPassage(args.input);

  return { normalized };
}

/**
 * Run AI processing: generate metadata and clean content
 */
export async function aiProcessStep(args: PassageProcessingInput & { normalized: string }) {
  "use step";

  const { metadataError, contentError } = await runPassageProcessing({
    passageId: args.passageId,
    userId: args.userId,
    normalizedText: args.normalized,
    userTitle: args.input.title,
  });

  if (metadataError || contentError) {
    log.warn(
      { metadataError, contentError, passageId: args.passageId, userId: args.userId },
      "passage-processing degraded",
    );
    Sentry.captureException(contentError ?? metadataError, {
      tags: { passageId: args.passageId },
    });
  }

  return { metadataError, contentError };
}

/**
 * Mark passage as failed
 */
export async function failStep(args: PassageProcessingInput) {
  "use step";

  await failPassageProcessing({
    passageId: args.passageId,
    userId: args.userId,
  });
}
