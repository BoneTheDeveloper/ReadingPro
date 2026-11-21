import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { pool } from "@/server/lib/db";
import { createTestUser, deleteTestUsers } from "@/server/test/users";
import { createTestPassage } from "@/server/test/passages";
import { ensureDefaultSetForUser } from "../default-vocabulary-set";
import { storeVocabularyItemForUser } from "../items/vocabulary-item-service";
import { createVocabularySetForUser } from "../sets/vocabulary-set-service";
import {
  endReviewSessionForUser,
  listDueCardsForUser,
  rateCardForUser,
  startReviewSessionForUser,
} from "./review-service";

const userIds: string[] = [];
afterEach(() => deleteTestUsers(userIds));

async function newUser() {
  const id = await createTestUser();
  userIds.push(id);
  return id;
}

/** Saves the words with createdAt one minute apart, in the given order. */
async function saveWords(userId: string, terms: string[], passageId?: string): Promise<string[]> {
  const ids: string[] = [];
  for (const [index, term] of terms.entries()) {
    const item = await storeVocabularyItemForUser(userId, {
      term,
      translation: `${term}-vi`,
      sourceLanguage: "en",
      targetLanguage: "vi",
      partofSpeech: "NOUN",
      passageId,
    });
    await pool.query(
      `UPDATE "VocabularyItem" SET "createdAt" = now() - ($2 || ' minutes')::interval WHERE "id" = $1`,
      [item.id, String(terms.length - index)],
    );
    ids.push(item.id);
  }
  return ids;
}

async function makeDue(itemId: string, daysAgo: number) {
  await pool.query(
    `UPDATE "VocabularyItem"
     SET "status" = 'REVIEW', "dueAt" = now() - ($2 || ' days')::interval,
         "stability" = 5, "difficulty" = 5, "reps" = 3, "scheduledDays" = 4,
         "lastReviewAt" = now() - interval '5 days'
     WHERE "id" = $1`,
    [itemId, String(daysAgo)],
  );
}

async function logsFor(itemId: string) {
  const { rows } = await pool.query<{ rating: string; status: string; sessionId: string }>(
    `SELECT "rating", "status", "sessionId" FROM "ReviewLog" WHERE "vocabularyItemId" = $1`,
    [itemId],
  );
  return rows;
}

async function cardsReviewed(sessionId: string): Promise<number> {
  const { rows } = await pool.query<{ n: number }>(
    `SELECT "cardsReviewed" AS "n" FROM "ReviewSession" WHERE "id" = $1`,
    [sessionId],
  );
  return rows[0].n;
}

describe("review service", () => {
  it("lists due cards oldest due first, then new cards oldest saved first", async () => {
    const userId = await newUser();
    const passageId = await createTestPassage(userId);
    const [n1, d1, n2, d2] = await saveWords(userId, ["n1", "d1", "n2", "d2"], passageId);
    await makeDue(d1, 1);
    await makeDue(d2, 3);

    const result = await listDueCardsForUser(userId);

    expect(result.cards.map((c) => c.id)).toEqual([d2, d1, n1, n2]);
    expect(result).toMatchObject({ dueCount: 2, newCount: 2 });
    expect(result.cards[0].passage).toEqual({ id: passageId, title: "Test passage" });
    expect(result.cards[0].dueAt).toBeInstanceOf(Date);
    expect(result.cards[0].nextDue.GOOD.getTime()).toBeGreaterThan(Date.now());
  });

  it("limits new cards to the set's daily limit minus today's first ratings", async () => {
    const userId = await newUser();
    const [a, b] = await saveWords(userId, ["a", "b", "c", "d"]);
    const defaultSetId = await ensureDefaultSetForUser(userId);
    await pool.query(`UPDATE "VocabularySet" SET "dailyNewLimit" = 2 WHERE "id" = $1`, [defaultSetId]);

    expect((await listDueCardsForUser(userId)).cards.map((x) => x.id)).toEqual([a, b]);

    const session = await startReviewSessionForUser(userId);
    await rateCardForUser(userId, session.id, {
      vocabularyItemId: a,
      rating: "GOOD",
      clientReviewId: randomUUID(),
    });

    const after = await listDueCardsForUser(userId, defaultSetId);
    expect(after.cards.map((x) => x.id)).toEqual([b]);
    expect(after.newCount).toBe(1);
  });

  it("only lists cards of the requested set", async () => {
    const userId = await newUser();
    const [a, b] = await saveWords(userId, ["a", "b"]);
    const set = await createVocabularySetForUser(userId, { name: "S", itemIds: [b] });

    expect((await listDueCardsForUser(userId, set.id)).cards.map((x) => x.id)).toEqual([b]);
    expect((await listDueCardsForUser(userId)).cards.map((x) => x.id)).toEqual([a, b]);
    await expect(listDueCardsForUser(userId, randomUUID())).rejects.toMatchObject({
      reason: "vocabulary_set.not_found",
    });
  });

  it("applies a rating once: one log, a new schedule and one counted card", async () => {
    const userId = await newUser();
    const [due] = await saveWords(userId, ["due"]);
    await makeDue(due, 2);
    const session = await startReviewSessionForUser(userId);
    const rating = { vocabularyItemId: due, rating: "GOOD" as const, clientReviewId: randomUUID() };

    const card = await rateCardForUser(userId, session.id, rating);

    expect(card.id).toBe(due);
    expect(card.dueAt.getTime()).toBeGreaterThan(Date.now());
    expect(await logsFor(due)).toEqual([{ rating: "GOOD", status: "REVIEW", sessionId: session.id }]);
    expect(await cardsReviewed(session.id)).toBe(1);

    const resent = await rateCardForUser(userId, session.id, rating);
    expect(resent.dueAt).toEqual(card.dueAt);
    expect(await logsFor(due)).toHaveLength(1);
    expect(await cardsReviewed(session.id)).toBe(1);
  });

  it("applies one of two racing copies of the same rating", async () => {
    const userId = await newUser();
    const [word] = await saveWords(userId, ["race"]);
    const session = await startReviewSessionForUser(userId);
    const rating = { vocabularyItemId: word, rating: "AGAIN" as const, clientReviewId: randomUUID() };

    const [first, second] = await Promise.all([
      rateCardForUser(userId, session.id, rating),
      rateCardForUser(userId, session.id, rating),
    ]);

    expect(first.id).toBe(word);
    expect(second.id).toBe(word);
    expect(await logsFor(word)).toHaveLength(1);
    expect(await cardsReviewed(session.id)).toBe(1);
  });

  it("treats another user's clientReviewId as an unknown word", async () => {
    const [userId, otherId] = [await newUser(), await newUser()];
    const [mine] = await saveWords(userId, ["mine"]);
    const [theirs] = await saveWords(otherId, ["theirs"]);
    const theirSession = await startReviewSessionForUser(otherId);
    const clientReviewId = randomUUID();
    await rateCardForUser(otherId, theirSession.id, {
      vocabularyItemId: theirs,
      rating: "GOOD",
      clientReviewId,
    });
    const session = await startReviewSessionForUser(userId);

    await expect(
      rateCardForUser(userId, session.id, { vocabularyItemId: mine, rating: "GOOD", clientReviewId }),
    ).rejects.toMatchObject({ reason: "vocabulary.not_found" });
  });

  it("rejects a rating in an ended or unknown session", async () => {
    const userId = await newUser();
    const [word] = await saveWords(userId, ["w"]);
    const session = await startReviewSessionForUser(userId);
    await endReviewSessionForUser(userId, session.id);
    const rating = { vocabularyItemId: word, rating: "GOOD" as const, clientReviewId: randomUUID() };

    await expect(rateCardForUser(userId, session.id, rating)).rejects.toMatchObject({
      reason: "review.session_ended",
    });
    await expect(rateCardForUser(userId, randomUUID(), rating)).rejects.toMatchObject({
      reason: "review.session_not_found",
    });
    expect(await logsFor(word)).toEqual([]);
  });

  it("keeps the first end time when a session is ended twice", async () => {
    const userId = await newUser();
    const otherId = await newUser();
    const session = await startReviewSessionForUser(userId);
    expect(session).toMatchObject({ endedAt: null, cardsReviewed: 0, vocabularySetId: null });

    const first = await endReviewSessionForUser(userId, session.id);
    const second = await endReviewSessionForUser(userId, session.id);

    expect(first.endedAt).toBeInstanceOf(Date);
    expect(second.endedAt).toEqual(first.endedAt);
    await expect(endReviewSessionForUser(otherId, session.id)).rejects.toMatchObject({
      reason: "review.session_not_found",
    });
  });
});
