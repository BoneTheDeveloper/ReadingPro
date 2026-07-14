import "server-only";
import type { VocabularyStatus } from "../schemas/vocabulary.schema";

/**
 * Simple interval schedule for lightweight content (Vocabulary).
 * Per ADR 0005.
 */
export function simpleSchedule(
  currentStatus: VocabularyStatus,
  isCorrect: boolean,
): { intervalDays: number; nextReviewDate: Date | null; nextStatus: VocabularyStatus } {
  let nextStatus: VocabularyStatus = currentStatus;
  let intervalDays = 0;

  if (isCorrect) {
    if (currentStatus === "NEW") {
      nextStatus = "LEARNING";
      intervalDays = 1;
    } else if (currentStatus === "LEARNING") {
      nextStatus = "MASTERED";
      intervalDays = 0;
    }
  } else {
    nextStatus = "LEARNING";
    intervalDays = 1;
  }

  let nextReviewDate: Date | null = null;
  if (nextStatus !== "MASTERED") {
    nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + (intervalDays || 1));
  }

  return {
    intervalDays,
    nextReviewDate,
    nextStatus,
  };
}
