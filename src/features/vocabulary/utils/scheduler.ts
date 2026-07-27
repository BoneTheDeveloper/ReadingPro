import "server-only";
import { VocabularyStatus } from "@/generated/prisma/enums";

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
    if (currentStatus === VocabularyStatus.NEW) {
      nextStatus = VocabularyStatus.LEARNING;
      intervalDays = 1;
    } else if (currentStatus === VocabularyStatus.LEARNING) {
      nextStatus = VocabularyStatus.MASTERED;
      intervalDays = 0;
    }
  } else {
    nextStatus = VocabularyStatus.LEARNING;
    intervalDays = 1;
  }

  let nextReviewDate: Date | null = null;
  if (nextStatus !== VocabularyStatus.MASTERED) {
    nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + (intervalDays || 1));
  }

  return {
    intervalDays,
    nextReviewDate,
    nextStatus,
  };
}
