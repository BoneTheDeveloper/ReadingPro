import { isUniqueViolation, withTransaction } from "@/server/lib/db";
import { AppError } from "@/server/lib/errors";
import { findUserSettings } from "@/server/modules/user-settings";
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
} from "../fsrs-scheduler";
import { findSetForUser, listSetsForUser } from "../sets/vocabulary-set-repository";
import {
  countNewCardsIntroducedSince,
  createSession,
  endSession,
  findCardForUser,
  findLogByClientReviewId,
  findSessionForUser,
  incrementCardsReviewed,
  insertReviewLog,
  listDueCards,
  listNewCardsInSet,
  lockCardForUser,
  updateCardSchedule,
  type CardRow,
} from "./review-repository";

async function loadSettings(userId: string) {
  const settings = await findUserSettings(userId);
  if (!settings) throw new AppError("auth.required", "User not found");
  return { ...settings, scheduler: createScheduler(settings) };
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
  const set = await findSetForUser(userId, setId);
  if (!set) throw new AppError("vocabulary_set.not_found", "VocabularySet not found", { id: setId });
}

/**
 * Due cards first (oldest due date first), then new cards. Each set adds new
 * cards up to what is left of its own limit for today, so a review of every set
 * adds up the sets' allowances. "Today" is the user's local day.
 */
export async function listDueCardsForUser(
  userId: string,
  setId?: string,
): Promise<ReviewDueResponse> {
  const set = setId ? await findSetForUser(userId, setId) : null;
  if (setId && !set) {
    throw new AppError("vocabulary_set.not_found", "VocabularySet not found", { id: setId });
  }
  const sets = set ? [set] : await listSetsForUser(userId);
  const settings = await loadSettings(userId);
  const now = new Date();

  const [due, introducedToday] = await Promise.all([
    listDueCards(userId, now, setId ?? null),
    // A first rating counts against the set the word is in now.
    countNewCardsIntroducedSince(userId, startOfDayInTimeZone(now, settings.timezone), setId ?? null),
  ]);

  const introducedBySet = new Map(
    introducedToday.map((row) => [row.vocabularySetId, row.count] as const),
  );

  const freshBySet = await Promise.all(
    sets.map((set) => {
      const allowance = set.dailyNewLimit - (introducedBySet.get(set.id) ?? 0);
      if (allowance <= 0) return [];
      return listNewCardsInSet(userId, set.id, allowance);
    }),
  );
  const fresh = freshBySet.flat().sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

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
  return createSession(userId, setId ?? null);
}

async function currentCard(scheduler: Scheduler, userId: string, id: string): Promise<ReviewCard> {
  const row = await findCardForUser(userId, id);
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

  const alreadyApplied = await findLogByClientReviewId(input.clientReviewId);
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
    await withTransaction(async (tx) => {
      const session = await findSessionForUser(userId, sessionId, tx);
      if (!session) {
        throw new AppError("review.session_not_found", "ReviewSession not found", { id: sessionId });
      }
      if (session.endedAt) {
        throw new AppError("review.session_ended", "ReviewSession already ended", { id: sessionId });
      }

      const card = await lockCardForUser(userId, input.vocabularyItemId, tx);
      if (!card) {
        throw new AppError("vocabulary.not_found", "VocabularyItem not found", {
          id: input.vocabularyItemId,
        });
      }

      const now = new Date();
      const { next, elapsedDays } = schedule(scheduler, card, input.rating, now);

      await insertReviewLog(
        {
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
          durationMs: input.durationMs ?? null,
          reviewedAt: now,
        },
        tx,
      );
      await updateCardSchedule(card.id, next, tx);
      await incrementCardsReviewed(sessionId, tx);
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
  const session = await findSessionForUser(userId, sessionId);
  if (session?.endedAt) return session;
  const ended = session && (await endSession(userId, sessionId, new Date()));
  if (!ended) {
    throw new AppError("review.session_not_found", "ReviewSession not found", { id: sessionId });
  }
  return ended;
}
