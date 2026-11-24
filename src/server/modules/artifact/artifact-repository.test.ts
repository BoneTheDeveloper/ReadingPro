import { afterEach, describe, expect, it } from "vitest";
import { pool } from "@/server/lib/db";
import { createTestUser, deleteTestUsers } from "@/server/test/users";
import { createTestPassage } from "@/server/test/passages";
import {
  createArtifact,
  deleteArtifact,
  findArtifactForUser,
  listArtifactsForUser,
  updateArtifactProgress,
  updateArtifactStatus,
} from "./artifact-repository";

const userIds: string[] = [];
afterEach(() => deleteTestUsers(userIds));

async function newUserWithPassage() {
  const userId = await createTestUser();
  userIds.push(userId);
  return { userId, passageId: await createTestPassage(userId) };
}

const CONTENT = { cards: [{ front: "a", back: "b" }] };

describe("artifact repository", () => {
  it("creates a COMPLETED artifact with null content by default", async () => {
    const { userId, passageId } = await newUserWithPassage();

    const artifact = await createArtifact({ userId, passageId, type: "FLASHCARD" });

    expect(artifact).toMatchObject({ status: "COMPLETED", content: null, progress: null, type: "FLASHCARD" });
  });

  it("keeps the content on a status update without content", async () => {
    const { userId, passageId } = await newUserWithPassage();
    const { id } = await createArtifact({ userId, passageId, type: "FLASHCARD", status: "PENDING" });

    const completed = await updateArtifactStatus({ id, userId, status: "COMPLETED", content: CONTENT });
    expect(completed).toMatchObject({ status: "COMPLETED", content: CONTENT });

    const failed = await updateArtifactStatus({ id, userId, status: "FAILED" });
    expect(failed).toMatchObject({ status: "FAILED", content: CONTENT });
  });

  it("round-trips progress objects and arrays as jsonb", async () => {
    const { userId, passageId } = await newUserWithPassage();
    const { id } = await createArtifact({ userId, passageId, type: "QUESTION" });

    const progress = { currentIndex: 1, answers: [0, null, 2], correctCount: 1, isCompleted: false };
    expect(await updateArtifactProgress(id, userId, progress)).toEqual({ id });
    expect((await findArtifactForUser(id, userId))?.progress).toEqual(progress);

    await updateArtifactProgress(id, userId, [3, 1, 4]);
    expect((await findArtifactForUser(id, userId))?.progress).toEqual([3, 1, 4]);
    const { rows } = await pool.query<{ kind: string }>(
      `SELECT jsonb_typeof("progress") AS "kind" FROM "StudioArtifact" WHERE "id" = $1`,
      [id],
    );
    expect(rows[0].kind).toBe("array");
  });

  it("hides another user's artifact and refuses to change it", async () => {
    const { userId, passageId } = await newUserWithPassage();
    const { userId: otherId } = await newUserWithPassage();
    const { id } = await createArtifact({ userId, passageId, type: "QUESTION" });

    expect(await findArtifactForUser(id, otherId)).toBeNull();
    expect(await updateArtifactStatus({ id, userId: otherId, status: "FAILED" })).toBeNull();
    expect(await updateArtifactProgress(id, otherId, {})).toBeNull();
    expect(await deleteArtifact(id, otherId)).toBe(false);
    expect(await deleteArtifact(id, userId)).toBe(true);
    expect(await findArtifactForUser(id, userId)).toBeNull();
  });

  it("lists a passage's artifacts newest first, without content", async () => {
    const { userId, passageId } = await newUserWithPassage();
    const older = await createArtifact({ userId, passageId, type: "QUESTION", content: CONTENT });
    const newer = await createArtifact({ userId, passageId, type: "FLASHCARD" });
    await pool.query(
      `UPDATE "StudioArtifact" SET "createdAt" = now() - interval '1 hour' WHERE "id" = $1`,
      [older.id],
    );

    const list = await listArtifactsForUser(userId, passageId);

    expect(list.map((a) => a.id)).toEqual([newer.id, older.id]);
    expect(list[0]).not.toHaveProperty("content");
    expect(list[0]).toMatchObject({ itemCount: null, difficulty: null });
  });

  it("summarises item count and difficulty from the content for the list", async () => {
    const { userId, passageId } = await newUserWithPassage();
    const deck = await createArtifact({ userId, passageId, type: "FLASHCARD", status: "PENDING" });
    await updateArtifactStatus({
      id: deck.id,
      userId,
      status: "COMPLETED",
      content: { cards: [{ front: "a", back: "b" }, { front: "c", back: "d" }], settings: { difficulty: "HARD" } },
    });
    const quiz = await createArtifact({ userId, passageId, type: "QUESTION", status: "PENDING" });
    await updateArtifactStatus({ id: quiz.id, userId, status: "COMPLETED", content: { questions: [{}, {}, {}] } });

    const list = await listArtifactsForUser(userId, passageId);

    expect(list.find((a) => a.id === deck.id)).toMatchObject({ itemCount: 2, difficulty: "HARD" });
    // Made before settings existed: the count still shows, the difficulty is unknown.
    expect(list.find((a) => a.id === quiz.id)).toMatchObject({ itemCount: 3, difficulty: null });
  });
});
