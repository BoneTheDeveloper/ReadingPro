import "server-only";
import { z } from "zod";
import { prisma } from "@/server/lib/db";
import { withUserProfile } from "@/server/auth/sync-user";

export const SESSION_IDLE_MS = 10 * 60 * 1000;

const userIdSchema = z.string().min(1, "userId is required");

export const createStudySessionSchema = z.object({
  userId: userIdSchema,
});

export async function createStudySession(userId: string) {
  const validated = createStudySessionSchema.parse({ userId });

  const now = new Date();

  return withUserProfile(validated.userId, () =>
    prisma.studySession.create({
      data: {
        userId: validated.userId,
        startedAt: now,
        lastActivityAt: now,
      },
    }),
  );
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

  return withUserProfile(userId, () =>
    prisma.$transaction(async (tx) => {
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
    }),
  );
}
