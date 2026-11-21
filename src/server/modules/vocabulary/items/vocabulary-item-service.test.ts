import { afterEach, describe, expect, it } from "vitest";
import { pool } from "@/server/lib/db";
import { createTestUser, deleteTestUsers } from "@/server/test/users";
import { createTestPassage } from "@/server/test/passages";
import { createVocabularySetForUser } from "../sets/vocabulary-set-service";
import {
  deleteVocabularyItemForUser,
  listVocabularyItemsForUser,
  listVocabularyStatsForUser,
  storeVocabularyItemForUser,
  updateVocabularyItemForUser,
} from "./vocabulary-item-service";

const userIds: string[] = [];
afterEach(() => deleteTestUsers(userIds));

async function newUser() {
  const id = await createTestUser();
  userIds.push(id);
  return id;
}

function word(term: string, extra: { contextSentence?: string; passageId?: string } = {}) {
  return {
    term,
    translation: `${term}-vi`,
    sourceLanguage: "en" as const,
    targetLanguage: "vi" as const,
    partofSpeech: "NOUN" as const,
    ...extra,
  };
}

describe("vocabulary item service", () => {
  it("counts a repeat save and keeps the first context and the filed set", async () => {
    const userId = await newUser();
    const passageId = await createTestPassage(userId);
    const first = await storeVocabularyItemForUser(
      userId,
      word("apple", { contextSentence: "An apple a day.", passageId }),
    );
    const set = await createVocabularySetForUser(userId, { name: "Fruit", itemIds: [first.id] });

    const again = await storeVocabularyItemForUser(userId, {
      ...word("apple", { contextSentence: "Another sentence." }),
      partofSpeech: "VERB",
    });

    expect(again).toMatchObject({
      id: first.id,
      savedCount: 2,
      partofSpeech: "VERB",
      contextSentence: "An apple a day.",
      passageId,
      vocabularySetId: set.id,
    });
    expect(again.updatedAt.getTime()).toBeGreaterThanOrEqual(first.updatedAt.getTime());
  });

  it("rejects a save that names another user's passage", async () => {
    const [userId, otherId] = [await newUser(), await newUser()];
    const passageId = await createTestPassage(otherId);

    await expect(storeVocabularyItemForUser(userId, word("pear", { passageId }))).rejects.toMatchObject({
      reason: "passage.not_found",
    });
  });

  it("lists the user's words newest first", async () => {
    const userId = await newUser();
    const older = await storeVocabularyItemForUser(userId, word("one"));
    const newer = await storeVocabularyItemForUser(userId, word("two"));
    await pool.query(
      `UPDATE "VocabularyItem" SET "createdAt" = now() - interval '1 hour' WHERE "id" = $1`,
      [older.id],
    );

    const items = await listVocabularyItemsForUser(userId);

    expect(items.map((i) => i.id)).toEqual([newer.id, older.id]);
  });

  it("updates a word, and rejects a duplicate term and translation", async () => {
    const userId = await newUser();
    const cat = await storeVocabularyItemForUser(userId, word("cat"));
    await storeVocabularyItemForUser(userId, word("dog"));

    const updated = await updateVocabularyItemForUser(userId, cat.id, {
      term: "kitten",
      translation: "kitten-vi",
      partofSpeech: "NOUN",
    });
    expect(updated).toMatchObject({ id: cat.id, term: "kitten", translation: "kitten-vi" });

    await expect(
      updateVocabularyItemForUser(userId, cat.id, {
        term: "dog",
        translation: "dog-vi",
        partofSpeech: "NOUN",
      }),
    ).rejects.toMatchObject({ reason: "vocabulary.duplicate" });
  });

  it("does not update or delete another user's word", async () => {
    const [userId, otherId] = [await newUser(), await newUser()];
    const item = await storeVocabularyItemForUser(userId, word("tree"));
    const edit = { term: "x", translation: "y", partofSpeech: "NOUN" as const };

    await expect(updateVocabularyItemForUser(otherId, item.id, edit)).rejects.toMatchObject({
      reason: "vocabulary.not_found",
    });
    await expect(deleteVocabularyItemForUser(otherId, item.id)).rejects.toMatchObject({
      reason: "vocabulary.not_found",
    });

    await deleteVocabularyItemForUser(userId, item.id);
    expect(await listVocabularyItemsForUser(userId)).toEqual([]);
  });

  it("counts words by status", async () => {
    const userId = await newUser();
    const items = await Promise.all(["a", "b", "c", "d"].map((t) => storeVocabularyItemForUser(userId, word(t))));
    await pool.query(`UPDATE "VocabularyItem" SET "status" = 'REVIEW' WHERE "id" = ANY($1::uuid[])`, [
      [items[0].id, items[1].id],
    ]);
    await pool.query(`UPDATE "VocabularyItem" SET "status" = 'LEARNING' WHERE "id" = $1`, [items[2].id]);

    expect(await listVocabularyStatsForUser(userId)).toEqual({
      new: 1,
      learning: 1,
      review: 2,
      relearning: 0,
      total: 4,
    });
  });
});
