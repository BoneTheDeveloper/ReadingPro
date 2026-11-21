import { afterEach, describe, expect, it } from "vitest";
import { pool } from "@/server/lib/db";
import { createTestUser, deleteTestUsers } from "@/server/test/users";
import { ensureDefaultSetForUser } from "../default-vocabulary-set";
import { storeVocabularyItemForUser } from "../items/vocabulary-item-service";
import {
  addVocabularySetItemsForUser,
  createVocabularySetForUser,
  deleteVocabularySetForUser,
  generateVocabularySetForUser,
  getVocabularySetForUser,
  listVocabularySetsForUser,
  removeVocabularySetItemForUser,
  updateVocabularySetForUser,
} from "./vocabulary-set-service";

const userIds: string[] = [];
afterEach(() => deleteTestUsers(userIds));

async function newUser(tier: "FREE" | "PRO" = "FREE") {
  const id = await createTestUser({ tier });
  userIds.push(id);
  return id;
}

async function saveWords(userId: string, terms: string[]): Promise<string[]> {
  const ids: string[] = [];
  for (const term of terms) {
    const item = await storeVocabularyItemForUser(userId, {
      term,
      translation: `${term}-vi`,
      sourceLanguage: "en",
      targetLanguage: "vi",
      partofSpeech: "NOUN",
    });
    ids.push(item.id);
  }
  return ids;
}

async function setIdOf(itemId: string): Promise<string> {
  const { rows } = await pool.query<{ setId: string }>(
    `SELECT "vocabularySetId" AS "setId" FROM "VocabularyItem" WHERE "id" = $1`,
    [itemId],
  );
  return rows[0].setId;
}

describe("vocabulary set service", () => {
  it("creates one default set under concurrent first requests", async () => {
    const userId = await newUser();

    const ids = await Promise.all(Array.from({ length: 5 }, () => ensureDefaultSetForUser(userId)));

    expect(new Set(ids).size).toBe(1);
    const { rows } = await pool.query<{ count: number }>(
      `SELECT COUNT(*)::int AS "count" FROM "VocabularySet" WHERE "userId" = $1 AND "isDefault"`,
      [userId],
    );
    expect(rows[0].count).toBe(1);
  });

  it("makes an existing set with the default name the default set", async () => {
    const userId = await newUser();
    const named = await createVocabularySetForUser(userId, { name: "Mặc định", itemIds: [] });

    expect(await ensureDefaultSetForUser(userId)).toBe(named.id);
  });

  it("creates a set and moves the given words into it", async () => {
    const userId = await newUser();
    const [a, b, c] = await saveWords(userId, ["a", "b", "c"]);

    const set = await createVocabularySetForUser(userId, { name: "Mine", itemIds: [a, b, a] });

    expect(set).toMatchObject({ name: "Mine", isDefault: false, dailyNewLimit: 10, itemCount: 2 });
    expect(set.progress).toEqual({ new: 2, learning: 0, review: 0, relearning: 0 });
    expect(await setIdOf(a)).toBe(set.id);
    expect(await setIdOf(c)).toBe(await ensureDefaultSetForUser(userId));
  });

  it("rejects another user's words when creating a set", async () => {
    const [userId, otherId] = [await newUser(), await newUser()];
    const [theirs] = await saveWords(otherId, ["z"]);

    await expect(
      createVocabularySetForUser(userId, { name: "Stolen", itemIds: [theirs] }),
    ).rejects.toMatchObject({ reason: "vocabulary.not_found" });
  });

  it("rejects a duplicate set name on create and rename", async () => {
    const userId = await newUser();
    await createVocabularySetForUser(userId, { name: "Taken", itemIds: [] });
    const other = await createVocabularySetForUser(userId, { name: "Other", itemIds: [] });

    await expect(createVocabularySetForUser(userId, { name: "Taken", itemIds: [] })).rejects.toMatchObject({
      reason: "vocabulary_set.name_taken",
    });
    await expect(updateVocabularySetForUser(userId, other.id, { name: "Taken" })).rejects.toMatchObject({
      reason: "vocabulary_set.name_taken",
    });
  });

  it("updates only the given fields", async () => {
    const userId = await newUser();
    const set = await createVocabularySetForUser(userId, { name: "Before", itemIds: [] });

    const limited = await updateVocabularySetForUser(userId, set.id, { dailyNewLimit: 3 });
    expect(limited).toMatchObject({ name: "Before", dailyNewLimit: 3 });

    const renamed = await updateVocabularySetForUser(userId, set.id, { name: "After" });
    expect(renamed).toMatchObject({ name: "After", dailyNewLimit: 3 });
  });

  it("protects the default set and returns a deleted set's words to it", async () => {
    const userId = await newUser();
    const [a, b] = await saveWords(userId, ["a", "b"]);
    const defaultSetId = await ensureDefaultSetForUser(userId);
    const set = await createVocabularySetForUser(userId, { name: "Temp", itemIds: [a, b] });

    await expect(deleteVocabularySetForUser(userId, defaultSetId)).rejects.toMatchObject({
      reason: "vocabulary_set.default_protected",
    });

    await deleteVocabularySetForUser(userId, set.id);

    expect(await setIdOf(a)).toBe(defaultSetId);
    expect(await setIdOf(b)).toBe(defaultSetId);
    await expect(getVocabularySetForUser(userId, set.id)).rejects.toMatchObject({
      reason: "vocabulary_set.not_found",
    });
  });

  it("adds words to a set and removes one back to the default set", async () => {
    const userId = await newUser();
    const [a, b] = await saveWords(userId, ["a", "b"]);
    const set = await createVocabularySetForUser(userId, { name: "S", itemIds: [] });

    await addVocabularySetItemsForUser(userId, set.id, [a, b]);
    expect((await getVocabularySetForUser(userId, set.id)).itemCount).toBe(2);

    await removeVocabularySetItemForUser(userId, set.id, a);
    expect(await setIdOf(a)).toBe(await ensureDefaultSetForUser(userId));
    expect(await setIdOf(b)).toBe(set.id);
  });

  it("lists the default set first with its words and today's study state", async () => {
    const userId = await newUser();
    const [a] = await saveWords(userId, ["a"]);
    await createVocabularySetForUser(userId, { name: "Empty", itemIds: [] });
    await pool.query(`UPDATE "VocabularyItem" SET "lastReviewAt" = now() WHERE "id" = $1`, [a]);

    const sets = await listVocabularySetsForUser(userId);

    expect(sets.map((s) => s.name)).toEqual(["Mặc định", "Empty"]);
    expect(sets[0]).toMatchObject({ isDefault: true, itemCount: 1, studiedToday: true });
    expect(sets[0].items[0].id).toBe(a);
    expect(sets[1]).toMatchObject({ itemCount: 0, lastStudiedAt: null, studiedToday: false });
  });

  it("generates a set for Pro users: due words first, then new words", async () => {
    const free = await newUser("FREE");
    await expect(
      generateVocabularySetForUser({ id: free, tier: "FREE" }, { name: "G", size: 2 }),
    ).rejects.toMatchObject({ reason: "plan.pro_required" });

    const userId = await newUser("PRO");
    const [new1, new2, dueLate, dueEarly, notDue] = await saveWords(userId, ["n1", "n2", "d1", "d2", "x"]);
    await pool.query(
      `UPDATE "VocabularyItem" SET "createdAt" = now() - interval '2 hours' WHERE "id" = $1`,
      [new1],
    );
    await pool.query(
      `UPDATE "VocabularyItem" SET "status" = 'REVIEW', "dueAt" = now() - interval '1 day' WHERE "id" = $1`,
      [dueLate],
    );
    await pool.query(
      `UPDATE "VocabularyItem" SET "status" = 'REVIEW', "dueAt" = now() - interval '2 days' WHERE "id" = $1`,
      [dueEarly],
    );
    await pool.query(
      `UPDATE "VocabularyItem" SET "status" = 'REVIEW', "dueAt" = now() + interval '1 day' WHERE "id" = $1`,
      [notDue],
    );

    const set = await generateVocabularySetForUser({ id: userId, tier: "PRO" }, { name: "G", size: 3 });

    expect(set.items.map((i) => i.id).sort()).toEqual([dueEarly, dueLate, new1].sort());
    expect(await setIdOf(new2)).toBe(await ensureDefaultSetForUser(userId));
  });
});
