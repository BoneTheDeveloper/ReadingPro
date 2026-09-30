import prisma, { isUniqueViolation } from "@/server/lib/prisma";
import { AppError } from "@/server/lib/errors";
import type {
  ReviewCard,
  ReviewDueResponse,
  ReviewRatingInput,
  ReviewSession,
} from "@/shared/vocabulary/review-schema";
import {
  createScheduler,
  previewNextDue,
  schedule,
  startOfDayInTimeZone,
} from "./fsrs-scheduler";

const CARD_INCLUDE = { passage: { select: { id: true, title: true } } } as const;

const SESSION_FIELDS = {
  id: true,
  vocabularySetId: true,
  startedAt: true,
  endedAt: true,
  cardsReviewed: true,
} as const;

type CardRow = NonNullable<Awaited<ReturnType<typeof findCard>>>;

function findCard(userId: string, id: string) {
  return prisma.vocabularyItem.findFirst({ where: { id, userId }, include: CARD_INCLUDE });
}

async function loadSettings(userId: string) {
  const profile = await prisma.userProfile.findUnique({
    where: { id: userId },
    select: { timezone: true, desiredRetention: true, dailyNewLimit: true, fsrsParams: true },
  });
  if (!profile) throw new AppError("auth.required", "User profile not found");
  return { ...profile, scheduler: createScheduler(profile) };
}

type Scheduler = ReturnType<typeof createScheduler>;

function toReviewCard(scheduler: Scheduler, row: CardRow, now: Date): ReviewCard {
  return {
    id: row.id,
    term: row.term,
    translation: row.translation,
    partofSpeech: row.partofSpeech,
    status: row.status,
    dueAt: row.dueAt,
    scheduledDays: row.scheduledDays,
    contextSentence: row.contextSentence,
    passage: row.passage,
    nextDue: previewNextDue(scheduler, row, now),
  };
}

async function requireSetForUser(userId: string, setId: string): Promise<void> {
  const set = await prisma.vocabularySet.findFirst({
    where: { id: setId, userId },
    select: { id: true },
  });
  if (!set) throw new AppError("vocabulary_set.not_found", "VocabularySet not found", { id: setId });
}

/**
 * Due cards first (oldest due date first), then new cards up to what is left of
 * today's new-card limit. "Today" is the user's local day.
 */
export async function listDueCardsForUser(
  userId: string,
  setId?: string,
): Promise<ReviewDueResponse> {
  if (setId) await requireSetForUser(userId, setId);
  const settings = await loadSettings(userId);
  const now = new Date();
  const inSet = setId ? { vocabularySetItems: { some: { vocabularySetId: setId } } } : {};

  const [due, introducedToday] = await Promise.all([
    prisma.vocabularyItem.findMany({
      where: { userId, status: { not: "NEW" }, dueAt: { lte: now }, ...inSet },
      orderBy: { dueAt: "asc" },
      include: CARD_INCLUDE,
    }),
    prisma.reviewLog.count({
      where: {
        userId,
        status: "NEW",
        reviewedAt: { gte: startOfDayInTimeZone(now, settings.timezone) },
      },
    }),
  ]);

  const newAllowance = Math.max(0, settings.dailyNewLimit - introducedToday);
  const fresh =
    newAllowance > 0
      ? await prisma.vocabularyItem.findMany({
          where: { userId, status: "NEW", ...inSet },
          orderBy: { createdAt: "asc" },
          take: newAllowance,
          include: CARD_INCLUDE,
        })
      : [];

  return {
    cards: [...due, ...fresh].map((row) => toReviewCard(settings.scheduler, row, now)),
    dueCount: due.length,
    newCount: fresh.length,
  };
}

export async function startReviewSessionForUser(
  userId: string,
  setId?: string,
): Promise<ReviewSession> {
  if (setId) await requireSetForUser(userId, setId);
  return prisma.reviewSession.create({
    data: { userId, vocabularySetId: setId },
    select: SESSION_FIELDS,
  });
}

async function currentCard(scheduler: Scheduler, userId: string, id: string): Promise<ReviewCard> {
  const row = await findCard(userId, id);
  if (!row) throw new AppError("vocabulary.not_found", "VocabularyItem not found", { id });
  return toReviewCard(scheduler, row, new Date());
}

/**
 * Applies one rating: reschedules the card, logs the state it had before, and
 * counts it on the session, all or nothing. A resent `clientReviewId` changes
 * nothing and returns the card as it is now.
 */
export async function rateCardForUser(
  userId: string,
  sessionId: string,
  input: ReviewRatingInput,
): Promise<ReviewCard> {
  const { scheduler } = await loadSettings(userId);

  const alreadyApplied = await prisma.reviewLog.findUnique({
    where: { clientReviewId: input.clientReviewId },
    select: { userId: true, vocabularyItemId: true },
  });
  if (alreadyApplied) {
    // The id belongs to someone else's rating: answer as if the word did not exist.
    if (alreadyApplied.userId !== userId) {
      throw new AppError("vocabulary.not_found", "VocabularyItem not found", {
        id: input.vocabularyItemId,
      });
    }
    return currentCard(scheduler, userId, alreadyApplied.vocabularyItemId);
  }

  try {
    await prisma.$transaction(async (tx) => {
      const session = await tx.reviewSession.findFirst({
        where: { id: sessionId, userId },
        select: { endedAt: true },
      });
      if (!session) {
        throw new AppError("review.session_not_found", "ReviewSession not found", { id: sessionId });
      }
      if (session.endedAt) {
        throw new AppError("review.session_ended", "ReviewSession already ended", { id: sessionId });
      }

      // Row lock: two ratings for one card must not both read the same state.
      await tx.$queryRaw`
        SELECT "id" FROM "VocabularyItem"
        WHERE "id" = ${input.vocabularyItemId}::uuid AND "userId" = ${userId}
        FOR UPDATE
      `;
      const card = await tx.vocabularyItem.findFirst({
        where: { id: input.vocabularyItemId, userId },
      });
      if (!card) {
        throw new AppError("vocabulary.not_found", "VocabularyItem not found", {
          id: input.vocabularyItemId,
        });
      }

      const now = new Date();
      const { next, elapsedDays } = schedule(scheduler, card, input.rating, now);

      await tx.reviewLog.create({
        data: {
          userId,
          vocabularyItemId: card.id,
          sessionId,
          clientReviewId: input.clientReviewId,
          rating: input.rating,
          status: card.status,
          dueAt: card.dueAt,
          stability: card.stability,
          difficulty: card.difficulty,
          learningSteps: card.learningSteps,
          elapsedDays,
          scheduledDays: next.scheduledDays,
          durationMs: input.durationMs,
          reviewedAt: now,
        },
      });
      await tx.vocabularyItem.update({ where: { id: card.id }, data: next });
      await tx.reviewSession.update({
        where: { id: sessionId },
        data: { cardsReviewed: { increment: 1 } },
      });
    });
  } catch (error) {
    // Two copies of the same request raced; the other one applied the rating.
    if (!isUniqueViolation(error)) throw error;
  }

  return currentCard(scheduler, userId, input.vocabularyItemId);
}

export async function endReviewSessionForUser(
  userId: string,
  sessionId: string,
): Promise<ReviewSession> {
  const session = await prisma.reviewSession.findFirst({
    where: { id: sessionId, userId },
    select: SESSION_FIELDS,
  });
  if (!session) {
    throw new AppError("review.session_not_found", "ReviewSession not found", { id: sessionId });
  }
  if (session.endedAt) return session;
  return prisma.reviewSession.update({
    where: { id: sessionId },
    data: { endedAt: new Date() },
    select: SESSION_FIELDS,
  });
}
