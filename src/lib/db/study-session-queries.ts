import { db } from './client';

export async function createStudySession(userId: string, passageId?: string) {
  return db.studySession.create({
    data: { userId, passageId },
  });
}

export async function updateStudySession(
  userId: string,
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
  await db.studySession.findUniqueOrThrow({
    where: { id: sessionId, userId },
  });

  return db.studySession.update({
    where: { id: sessionId },
    data,
  });
}
