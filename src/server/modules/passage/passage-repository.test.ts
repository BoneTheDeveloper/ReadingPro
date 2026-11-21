import { afterEach, describe, expect, it } from "vitest";
import { pool } from "@/server/lib/db";
import { createTestUser, deleteTestUsers } from "@/server/test/users";
import {
  completePassageProcessing,
  createPassageForUser,
  deletePassageForUser,
  failPassageProcessing,
  findPassageForUser,
  listPassagesForUser,
} from "./passage-repository";

const userIds: string[] = [];
afterEach(() => deleteTestUsers(userIds));

async function newUser() {
  const id = await createTestUser();
  userIds.push(id);
  return id;
}

describe("passage repository", () => {
  it("creates a PENDING passage with no file path", async () => {
    const userId = await newUser();

    const passage = await createPassageForUser({ userId, sourceType: "TEXT", youtubeUrl: "ignored" });

    expect(passage).toMatchObject({
      userId,
      sourceType: "TEXT",
      status: "PENDING",
      filePath: null,
      youtubeUrl: null,
      title: "",
      wordCount: 0,
      cefrLevel: null,
    });
    expect(passage.createdAt).toBeInstanceOf(Date);
  });

  it("keeps the YouTube URL only for YouTube passages", async () => {
    const userId = await newUser();
    const url = "https://www.youtube.com/watch?v=abc";

    const passage = await createPassageForUser({ userId, sourceType: "YOUTUBE", youtubeUrl: url });

    expect(passage.youtubeUrl).toBe(url);
  });

  it("completes processing with content, word count and CEFR level", async () => {
    const userId = await newUser();
    const { id } = await createPassageForUser({ userId, sourceType: "TEXT" });

    const done = await completePassageProcessing({
      userId,
      passageId: id,
      content: "One two  three\nfour",
      title: "Title",
      cefrLevel: "B1",
    });

    expect(done).toMatchObject({ status: "COMPLETED", wordCount: 4, cefrLevel: "B1", title: "Title" });
    expect(await findPassageForUser(userId, id)).toMatchObject({ content: "One two  three\nfour" });
  });

  it("marks a passage FAILED, and returns null for a missing one", async () => {
    const userId = await newUser();
    const { id } = await createPassageForUser({ userId, sourceType: "PDF" });

    expect(await failPassageProcessing({ userId, passageId: id })).toMatchObject({ status: "FAILED" });
    await deletePassageForUser(userId, id);
    expect(await failPassageProcessing({ userId, passageId: id })).toBeNull();
    expect(
      await completePassageProcessing({ userId, passageId: id, content: "x", title: "x", cefrLevel: null }),
    ).toBeNull();
  });

  it("lists only the owner's passages, newest first", async () => {
    const [owner, other] = [await newUser(), await newUser()];
    const first = await createPassageForUser({ userId: owner, sourceType: "TEXT" });
    const second = await createPassageForUser({ userId: owner, sourceType: "PDF" });
    await createPassageForUser({ userId: other, sourceType: "TEXT" });
    await pool.query(`UPDATE "Passage" SET "createdAt" = now() - interval '1 hour' WHERE "id" = $1`, [
      first.id,
    ]);

    const list = await listPassagesForUser(owner);

    expect(list.map((p) => p.id)).toEqual([second.id, first.id]);
    expect(Object.keys(list[0]).sort()).toEqual(["createdAt", "id", "sourceType", "status", "title"]);
  });

  it("does not find or delete another user's passage", async () => {
    const [owner, other] = [await newUser(), await newUser()];
    const { id } = await createPassageForUser({ userId: owner, sourceType: "TEXT" });

    expect(await findPassageForUser(other, id)).toBeNull();
    expect(await deletePassageForUser(other, id)).toBe(false);
    expect(await findPassageForUser(owner, id)).not.toBeNull();
    expect(await deletePassageForUser(owner, id)).toBe(true);
    expect(await findPassageForUser(owner, id)).toBeNull();
  });
});
