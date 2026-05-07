import type { PrismaClient } from '@prisma/client';
import type { CEFRLevel } from '../shared/cefr-utils';
import { withUserContext } from './user-scoped-client';

type ScopedClient = ReturnType<typeof withUserContext>;

export async function getUserPassages(client: ScopedClient) {
  return client.passage.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

export async function getPassageWithQuestions(
  client: ScopedClient,
  passageId: string
) {
  return client.passage.findUnique({
    where: { id: passageId },
    include: { questions: true },
  });
}

export async function createPassage(
  client: ScopedClient,
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
  return client.passage.create({ data: { userId, ...data } });
}

export async function createQuestion(
  client: PrismaClient,
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
  return client.question.create({ data });
}

export async function getNewCards(userId: string, passageId: string) {
  return withUserContext(userId).question.findMany({
    where: {
      passageId,
      reviews: {
        none: { userId },
      },
    },
    take: 5,
  });
}
