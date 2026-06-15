import { z } from 'zod';
import { db } from './client';

export const SESSION_IDLE_MS = 5 * 60 * 1000;

const userIdSchema = z.string().min(1, 'userId is required');

export const createStudySessionSchema = z.object({
  userId: userIdSchema,
});

export async function createStudySession(userId: string) {
  const validated = createStudySessionSchema.parse({ userId });
  const now = new Date();

  return db.studySession.create({
    data: {
      userId: validated.userId,
      startedAt: now,
      lastSeenAt: now,
    },
  });
}

export async function closeStaleStudySessions(userId: string, now = new Date()) {
  const staleBefore = new Date(now.getTime() - SESSION_IDLE_MS);

  return db.$executeRaw`
    UPDATE "study_sessions"
    SET "completedAt" = "lastSeenAt"
    WHERE "userId" = ${userId}
      AND "completedAt" IS NULL
      AND "lastSeenAt" < ${staleBefore}
  `;
}

export async function ensureActiveSession(userId: string) {
  const now = new Date();

  return db.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE "study_sessions"
      SET "completedAt" = "lastSeenAt"
      WHERE "userId" = ${userId}
        AND "completedAt" IS NULL
        AND "lastSeenAt" < ${new Date(now.getTime() - SESSION_IDLE_MS)}
    `;

    const openSession = await tx.studySession.findFirst({
      where: { userId, completedAt: null },
      orderBy: [
        { lastSeenAt: 'desc' },
        { startedAt: 'desc' },
      ],
    });

    if (openSession) {
      return tx.studySession.update({
        where: { id: openSession.id },
        data: { lastSeenAt: now },
      });
    }

    return tx.studySession.create({
      data: {
        userId,
        startedAt: now,
        lastSeenAt: now,
      },
    });
  });
}
