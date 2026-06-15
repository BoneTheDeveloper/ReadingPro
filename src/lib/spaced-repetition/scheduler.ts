export interface SRSState {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
}

export interface SRSResult extends SRSState {
  nextReviewDate: Date;
}

/**
 * SM-2 algorithm for high-stakes content (Questions/Flashcards).
 * Promoted from src/lib/algorithms/sm2.ts.
 */
export function sm2(
  state: SRSState,
  qualityRating: number
): SRSResult {
  let { easeFactor, intervalDays, repetitions } = state;

  if (qualityRating < 3) {
    repetitions = 0;
    intervalDays = 1;
  } else {
    repetitions += 1;

    easeFactor =
      easeFactor +
      (0.1 - (5 - qualityRating) * (0.08 + (5 - qualityRating) * 0.02));
    easeFactor = Math.max(1.3, easeFactor);

    if (repetitions === 1) {
      intervalDays = 1;
    } else if (repetitions === 2) {
      intervalDays = 6;
    } else {
      intervalDays = Math.round(intervalDays * easeFactor);
    }
  }

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + intervalDays);

  return {
    easeFactor: Number(easeFactor.toFixed(2)),
    intervalDays,
    repetitions,
    nextReviewDate,
  };
}

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

export function isDue(nextReviewAt: Date | null): boolean {
  if (!nextReviewAt) return false;
  return nextReviewAt <= new Date();
}

export function statusFor(
  nextReviewAt: Date | null,
  intervalDays: number
): { status: string; label: string; color: string } {
  if (intervalDays === 0) {
    return { status: 'new', label: 'New', color: 'bg-blue-100 text-blue-700' };
  }

  if (intervalDays < 21) {
    return {
      status: 'learning',
      label: 'Learning',
      color: 'bg-yellow-100 text-yellow-700',
    };
  }

  if (isDue(nextReviewAt)) {
    return { status: 'review', label: 'Due', color: 'bg-orange-100 text-orange-700' };
  }

  return {
    status: 'mature',
    label: 'Scheduled',
    color: 'bg-green-100 text-green-700',
  };
}

export function getSuggestedRating(
  responseType: 'perfect' | 'correct' | 'difficult' | 'wrong' | 'blackout'
): number {
  const ratings: Record<string, number> = {
    perfect: 5,
    correct: 4,
    difficult: 3,
    wrong: 2,
    blackout: 0,
  };
  return ratings[responseType];
}
