import "server-only";
import { prisma } from "@/lib/prisma";
import { studySessionRequestSchema } from "../schemas/learning-session.schema";

export const SESSION_IDLE_MS = 10 * 60 * 1000;

export async function createStudySession(userId: string) {
  const validated = studySessionRequestSchema.parse({ userId });

  const now = new Date();

  return prisma.studySession.create({
    data: {
      userId: validated.userId,
      startedAt: now,
      lastActivityAt: now,
    },
  });
}

export async function closeStaleStudySessions(
  userId: string,
  now = new Date(),
) {
  const staleBefore = new Date(now.getTime() - SESSION_IDLE_MS);

  return prisma.$executeRaw`
    UPDATE "study_sessions"
    SET "completedAt" = "lastActivityAt"
    WHERE "userId" = ${userId}
      AND "completedAt" IS NULL
      AND "lastActivityAt" < ${staleBefore}
  `;
}

export async function ensureActiveSession(userId: string) {
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`study_session:${userId}`})::bigint)`;

    await tx.$executeRaw`
      UPDATE "study_sessions"
      SET "completedAt" = "lastActivityAt"
      WHERE "userId" = ${userId}
        AND "completedAt" IS NULL
        AND "lastActivityAt" < ${new Date(now.getTime() - SESSION_IDLE_MS)}
    `;

    const openSession = await tx.studySession.findFirst({
      where: { userId, completedAt: null },
      orderBy: [{ lastActivityAt: "desc" }, { startedAt: "desc" }],
    });

    if (openSession) {
      return tx.studySession.update({
        where: { id: openSession.id },
        data: { lastActivityAt: now },
      });
    }

    return tx.studySession.create({
      data: {
        userId,
        startedAt: now,
        lastActivityAt: now,
      },
    });
  });
}
