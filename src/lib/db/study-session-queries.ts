import { withUserContext } from './user-scoped-client';

type ScopedClient = ReturnType<typeof withUserContext>;

export async function createStudySession(
  client: ScopedClient,
  userId: string,
  passageId?: string
) {
  return client.studySession.create({
    data: { userId, passageId },
  });
}

export async function updateStudySession(
  client: ScopedClient,
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
  return client.studySession.update({
    where: { id: sessionId },
    data,
  });
}
