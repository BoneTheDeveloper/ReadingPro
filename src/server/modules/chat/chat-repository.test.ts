import { afterEach, describe, expect, it } from "vitest";
import { pool } from "@/server/lib/db";
import { createTestUser, deleteTestUsers } from "@/server/test/users";
import { createTestPassage } from "@/server/test/passages";
import { createChatMessage, deleteChatHistory, listChatHistory } from "./chat-repository";

const userIds: string[] = [];
afterEach(() => deleteTestUsers(userIds));

async function newUserWithPassage() {
  const userId = await createTestUser();
  userIds.push(userId);
  return { userId, passageId: await createTestPassage(userId) };
}

describe("chat repository", () => {
  it("orders history by time, breaking ties by id", async () => {
    const { userId, passageId } = await newUserWithPassage();
    for (const text of ["a", "b", "c"]) await createChatMessage(userId, passageId, "user", text);
    await pool.query(
      `UPDATE "ChatMessage" SET "createdAt" = '2026-01-01T00:00:00Z' WHERE "passageId" = $1`,
      [passageId],
    );

    const history = await listChatHistory(userId, passageId);

    const ids = history.map((m) => m.id);
    expect(ids).toEqual([...ids].sort());
    expect(Object.keys(history[0]).sort()).toEqual(["content", "id", "role"]);
  });

  it("returns the first 40 messages", async () => {
    const { userId, passageId } = await newUserWithPassage();
    await pool.query(
      `INSERT INTO "ChatMessage" ("userId", "passageId", "role", "content", "createdAt")
       SELECT $1, $2, 'user', 'm' || n, now() - (50 - n) * interval '1 minute'
       FROM generate_series(1, 45) AS n`,
      [userId, passageId],
    );

    const history = await listChatHistory(userId, passageId);

    expect(history).toHaveLength(40);
    expect(history[0].content).toBe("m1");
    expect(history[39].content).toBe("m40");
  });

  it("deletes only that user's messages for that passage", async () => {
    const mine = await newUserWithPassage();
    const otherPassageId = await createTestPassage(mine.userId);
    const theirs = await newUserWithPassage();
    await createChatMessage(mine.userId, mine.passageId, "user", "clear me");
    await createChatMessage(mine.userId, otherPassageId, "assistant", "keep");
    await createChatMessage(theirs.userId, theirs.passageId, "user", "keep");

    await deleteChatHistory(mine.userId, mine.passageId);

    expect(await listChatHistory(mine.userId, mine.passageId)).toEqual([]);
    expect(await listChatHistory(mine.userId, otherPassageId)).toHaveLength(1);
    expect(await listChatHistory(theirs.userId, theirs.passageId)).toHaveLength(1);
  });
});
