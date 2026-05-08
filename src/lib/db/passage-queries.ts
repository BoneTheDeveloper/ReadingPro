import type { CEFRLevel } from '../shared/cefr-utils';
import { db } from './client';

export async function getUserPassages(userId: string) {
  return db.passage.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getPassageWithQuestions(passageId: string, userId: string) {
  return db.passage.findUnique({
    where: { id: passageId, userId },
    include: { questions: true },
  });
}

export async function createPassage(
  userId: string,
  data: {
    title: string;
    content: string;
    simplifiedContent?: string;
    originalLevel?: CEFRLevel;
    simplifiedLevel?: CEFRLevel;
    wordCount: number;
    sourceType: 'TEXT' | 'PDF';
    fileUrl?: string;
  }
) {
  return db.passage.create({ data: { userId, ...data } });
}

export async function createQuestion(
  data: {
    passageId: string;
    questionText: string;
    options: { id: string; text: string }[];
    correctOption: string;
    sourceText: string;
    sourceLine: number;
    explanation: string;
  }
) {
  return db.question.create({ data });
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
