import 'server-only';
/**
 * Simple interval schedule for lightweight content (Vocabulary).
 * Per ADR 0005.
 */
export function simpleSchedule(
  currentStatus: string,
  isCorrect: boolean
): { intervalDays: number; nextReviewDate: Date | null; nextStatus: string } {
  let nextStatus = currentStatus;
  let intervalDays = 0;

  if (isCorrect) {
    if (currentStatus === 'NEW') {
      nextStatus = 'LEARNING';
      intervalDays = 1;
    } else if (currentStatus === 'LEARNING') {
      // MVP: 2nd correct review moves to MASTERED
      // For now, without a repetitions count for vocab, we move to MASTERED on the first correct LEARNING review.
      nextStatus = 'MASTERED';
      intervalDays = 0;
    }
  } else {
    nextStatus = 'LEARNING';
    intervalDays = 1;
  }

  let nextReviewDate: Date | null = null;
  if (nextStatus !== 'MASTERED') {
    nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + (intervalDays || 1));
  }

  return {
    intervalDays,
    nextReviewDate,
    nextStatus,
  };
}
