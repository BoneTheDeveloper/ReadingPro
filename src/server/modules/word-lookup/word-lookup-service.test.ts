import { afterEach, describe, expect, it } from "vitest";
import { pool } from "@/server/lib/db";
import app from "@/server/app";
import { createTestUser, deleteTestUsers } from "@/server/test/users";
import { createTestPassage } from "@/server/test/passages";
import {
  deleteLookupForUser,
  getLookupForUser,
  listLookupsForUser,
  lookUpWordForUser,
} from "./word-lookup-service";

// Uses the imported dictionary (pnpm db:import-dictionary): "run", "running" and "go" are in it.
const userIds: string[] = [];
afterEach(() => deleteTestUsers(userIds));

async function newUserWithPassage() {
  const userId = await createTestUser();
  userIds.push(userId);
  return { userId, passageId: await createTestPassage(userId) };
}

const rejectionReason = (promise: Promise<unknown>) =>
  promise.then(
    () => null,
    (error: { reason?: string }) => error.reason,
  );

describe("word lookup service", () => {
  it("records a found word with its entries", async () => {
    const { userId, passageId } = await newUserWithPassage();

    const result = await lookUpWordForUser(userId, { passageId, word: "went", context: "She went home." });

    expect(result.entries.map((e) => [e.headword, e.match])).toEqual([["go", "lemma"]]);
    expect(result.lookup).toMatchObject({
      passageId,
      headword: "go",
      selectedText: "went",
      contextSentence: "She went home.",
    });
    expect(result.lookup.summary).toEqual(expect.any(String));
    expect(await listLookupsForUser(userId, passageId)).toHaveLength(1);
  });

  it("keeps one row per headword and moves a repeat lookup to the top", async () => {
    const { userId, passageId } = await newUserWithPassage();
    const first = await lookUpWordForUser(userId, { passageId, word: "go", context: "Let's go." });
    await lookUpWordForUser(userId, { passageId, word: "run" });
    await pool.query(`UPDATE "WordLookup" SET "lookedUpAt" = now() - interval '1 hour' WHERE "passageId" = $1`, [
      passageId,
    ]);

    const again = await lookUpWordForUser(userId, { passageId, word: "Go" });
    const list = await listLookupsForUser(userId, passageId);

    expect(again.lookup.id).toBe(first.lookup.id);
    expect(again.lookup.selectedText).toBe("Go");
    expect(again.lookup.contextSentence).toBe("Let's go.");
    expect(again.lookup.lookedUpAt.getTime()).toBeGreaterThan(first.lookup.lookedUpAt.getTime());
    expect(list.map((row) => row.headword)).toEqual(["go", "run"]);
  });

  it("reports an unknown word and records nothing", async () => {
    const { userId, passageId } = await newUserWithPassage();

    expect(await rejectionReason(lookUpWordForUser(userId, { passageId, word: "qzxv" }))).toBe("dictionary.not_found");
    expect(await listLookupsForUser(userId, passageId)).toEqual([]);
  });

  it("refuses another user's passage and lookup", async () => {
    const mine = await newUserWithPassage();
    const theirs = await newUserWithPassage();
    const { lookup } = await lookUpWordForUser(theirs.userId, { passageId: theirs.passageId, word: "run" });

    expect(await rejectionReason(lookUpWordForUser(mine.userId, { passageId: theirs.passageId, word: "run" }))).toBe(
      "passage.not_found",
    );
    expect(await rejectionReason(getLookupForUser(mine.userId, lookup.id))).toBe("word_lookup.not_found");
    expect(await rejectionReason(deleteLookupForUser(mine.userId, lookup.id))).toBe("word_lookup.not_found");
  });

  it("returns a stored lookup with its entries resolved again, and deletes it", async () => {
    const { userId, passageId } = await newUserWithPassage();
    const { lookup } = await lookUpWordForUser(userId, { passageId, word: "running" });

    const detail = await getLookupForUser(userId, lookup.id);
    await deleteLookupForUser(userId, lookup.id);

    expect(detail.entries.map((e) => [e.headword, e.match])).toEqual([
      ["running", "surface"],
      ["run", "lemma"],
    ]);
    expect(await listLookupsForUser(userId, passageId)).toEqual([]);
    expect(await rejectionReason(deleteLookupForUser(userId, lookup.id))).toBe("word_lookup.not_found");
  });

  it("disappears with its passage", async () => {
    const { userId, passageId } = await newUserWithPassage();
    await lookUpWordForUser(userId, { passageId, word: "run" });

    await pool.query(`DELETE FROM "Passage" WHERE "id" = $1`, [passageId]);

    const { rows } = await pool.query(`SELECT 1 FROM "WordLookup" WHERE "passageId" = $1`, [passageId]);
    expect(rows).toEqual([]);
  });
});

describe("/api/word-lookup", () => {
  it.each([
    ["POST", "/api/word-lookup"],
    ["GET", "/api/word-lookup?passageId=00000000-0000-0000-0000-000000000000"],
    ["GET", "/api/word-lookup/00000000-0000-0000-0000-000000000000"],
    ["DELETE", "/api/word-lookup/00000000-0000-0000-0000-000000000000"],
  ])("%s %s needs a session", async (method, path) => {
    const res = await app.request(path, { method });
    expect(res.status).toBe(401);
  });
});
