import { db } from './client';
import type { CEFRLevel } from '../shared/cefr-utils';
export { getCEFRColor, getCEFRLabel } from '../shared/cefr-utils';

export async function getDueCards(userId: string) {
  return db.cardReview.findMany({
    where: {
      userId,
      nextReviewDate: { lte: new Date() },
    },
    include: {
      question: {
        include: {
          passage: true,
        },
      },
    },
    orderBy: {
      nextReviewDate: 'asc',
    },
    take: 20,
  });
}

export async function getNewCards(userId: string, passageId: string) {
  return db.question.findMany({
    where: {
      passageId,
      reviews: {
        none: { userId },
      },
    },
    take: 5,
  });
}

export function calculateSM2Interval(
  previousEaseFactor: number,
  previousInterval: number,
  repetitions: number,
  qualityRating: number
): {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
} {
  let newEaseFactor = previousEaseFactor;
  let newRepetitions = repetitions;
  let newInterval = previousInterval;

  if (qualityRating < 3) {
    newRepetitions = 0;
    newInterval = 1;
  } else {
    newRepetitions += 1;

    newEaseFactor = Math.max(
      1.3,
      previousEaseFactor + (0.1 - (5 - qualityRating) * (0.08 + (5 - qualityRating) * 0.02))
    );

    if (newRepetitions === 1) {
      newInterval = 1;
    } else if (newRepetitions === 2) {
      newInterval = 6;
    } else {
      newInterval = Math.round(previousInterval * newEaseFactor);
    }
  }

  return {
    easeFactor: Number(newEaseFactor.toFixed(2)),
    intervalDays: newInterval,
    repetitions: newRepetitions,
  };
}

export async function updateCardReview(
  cardReviewId: string,
  qualityRating: number
) {
  const existing = await db.cardReview.findUniqueOrThrow({
    where: { id: cardReviewId },
  });

  const sm2 = calculateSM2Interval(
    existing.easeFactor,
    existing.intervalDays,
    existing.repetitions,
    qualityRating
  );

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + sm2.intervalDays);

  return db.cardReview.update({
    where: { id: cardReviewId },
    data: {
      qualityRating,
      easeFactor: sm2.easeFactor,
      intervalDays: sm2.intervalDays,
      repetitions: sm2.repetitions,
      nextReviewDate,
      reviewedAt: new Date(),
    },
  });
}

export async function getUserProgress(userId: string) {
  const [totalCards, matureCards, dueCards, todayReviews] = await Promise.all([
    db.cardReview.count({ where: { userId } }),
    db.cardReview.count({
      where: { userId, intervalDays: { gte: 21 } },
    }),
    db.cardReview.count({
      where: { userId, nextReviewDate: { lte: new Date() } },
    }),
    db.cardReview.count({
      where: {
        userId,
        reviewedAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
  ]);

  return {
    totalCards,
    matureCards,
    dueCards,
    todayReviews,
  };
}

export async function createUser(email: string, name?: string) {
  return db.user.create({
    data: { email, name },
  });
}

export async function getOrCreateUser(email: string, name?: string) {
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return existing;
  return createUser(email, name);
}

export async function createPassage(data: {
  userId: string;
  title: string;
  content: string;
  simplifiedContent?: string;
  originalLevel?: CEFRLevel;
  simplifiedLevel?: CEFRLevel;
  wordCount: number;
  sourceType: 'TEXT' | 'PDF';
  fileUrl?: string;
}) {
  return db.passage.create({ data });
}

export async function createQuestion(data: {
  passageId: string;
  questionText: string;
  options: { id: string; text: string }[];
  correctOption: string;
  sourceText: string;
  sourceLine: number;
  explanation: string;
}) {
  return db.question.create({ data });
}

export async function createCardReview(questionId: string, userId: string) {
  return db.cardReview.create({
    data: {
      questionId,
      userId,
      qualityRating: 0,
      easeFactor: 2.5,
      intervalDays: 1,
      repetitions: 0,
    },
  });
}

export async function getPassageWithQuestions(passageId: string) {
  return db.passage.findUnique({
    where: { id: passageId },
    include: { questions: true },
  });
}

export async function getUserPassages(userId: string) {
  return db.passage.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createStudySession(userId: string, passageId?: string) {
  return db.studySession.create({
    data: { userId, passageId },
  });
}

export async function updateStudySession(
  sessionId: string,
  data: {
    completedAt?: Date;
    cardsReviewed?: number;
    newCards?: number;
    correctCount?: number;
    incorrectCount?: number;
    accuracyRate?: number;
  }
) {
  return db.studySession.update({
    where: { id: sessionId },
    data,
  });
}
