export interface SM2State {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
}

export interface SM2Result extends SM2State {
  nextReviewDate: Date;
}

export function calculateSM2(
  previousState: SM2State,
  qualityRating: number
): SM2Result {
  let { easeFactor, intervalDays, repetitions } = previousState;

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

export function isCardDue(nextReviewDate: Date): boolean {
  return nextReviewDate <= new Date();
}

export function getCardStatus(
  nextReviewDate: Date,
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

  if (isCardDue(nextReviewDate)) {
    return { status: 'review', label: 'Due', color: 'bg-orange-100 text-orange-700' };
  }

  return {
    status: 'mature',
    label: 'Scheduled',
    color: 'bg-green-100 text-green-700',
  };
}
