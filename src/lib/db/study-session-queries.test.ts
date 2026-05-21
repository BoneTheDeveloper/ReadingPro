import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";
import { db } from "./client";
import {
  computeSessionAccuracy,
  createStudySession,
  createStudySessionSchema,
  updateStudySession,
  updateStudySessionSchema,
} from "./study-session-queries";

describe("study-session queries", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-21T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("validates create and update payload boundaries", () => {
    expect(() => createStudySessionSchema.parse({ userId: "" })).toThrow(ZodError);
    expect(() =>
      updateStudySessionSchema.parse({
        correctCount: 1,
        incorrectCount: 1,
        accuracyRate: 50,
      })
    ).toThrow(ZodError);
    expect(updateStudySessionSchema.parse({ cardsReviewed: 0 })).toEqual({ cardsReviewed: 0 });
  });

  it("returns null accuracy for missing sessions or no reviews", async () => {
    vi.mocked(db.studySession.findUnique).mockResolvedValueOnce(null);
    await expect(computeSessionAccuracy("session-1", "user-1")).resolves.toBeNull();

    vi.mocked(db.studySession.findUnique).mockResolvedValueOnce({
      id: "session-1",
      startedAt: new Date("2026-05-21T10:00:00.000Z"),
    });
    vi.mocked(db.cardReview.count).mockResolvedValueOnce(0);

    await expect(computeSessionAccuracy("session-1", "user-1")).resolves.toBeNull();
  });

  it("computes rounded accuracy from completed reviews", async () => {
    vi.mocked(db.studySession.findUnique).mockResolvedValue({
      id: "session-1",
      startedAt: new Date("2026-05-21T10:00:00.000Z"),
    });
    vi.mocked(db.cardReview.count).mockResolvedValueOnce(3).mockResolvedValueOnce(2);

    await expect(computeSessionAccuracy("session-1", "user-1")).resolves.toBe(66.67);

    expect(db.cardReview.count).toHaveBeenNthCalledWith(1, {
      where: {
        userId: "user-1",
        reviewedAt: { gte: new Date("2026-05-21T10:00:00.000Z") },
      },
    });
    expect(db.cardReview.count).toHaveBeenNthCalledWith(2, {
      where: {
        userId: "user-1",
        reviewedAt: { gte: new Date("2026-05-21T10:00:00.000Z") },
        qualityRating: { gte: 3 },
      },
    });
  });

  it("creates sessions and verifies passage ownership when passageId is present", async () => {
    const passageId = "11111111-1111-4111-8111-111111111111";
    vi.mocked(db.passage.findUnique).mockResolvedValue({ id: passageId });

    await createStudySession("user-1", passageId);

    expect(db.passage.findUnique).toHaveBeenCalledWith({
      where: { id: passageId, userId: "user-1", deletedAt: null },
    });
    expect(db.studySession.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        passageId,
        startedAt: new Date("2026-05-21T12:00:00.000Z"),
      },
    });
  });

  it("rejects session creation for an unowned passage", async () => {
    vi.mocked(db.passage.findUnique).mockResolvedValue(null);

    await expect(
      createStudySession("user-1", "11111111-1111-4111-8111-111111111111")
    ).rejects.toThrow("Passage not found or not owned by user");
  });

  it("updates sessions and computes accuracy when completing", async () => {
    vi.mocked(db.studySession.findUnique).mockResolvedValue({
      id: "session-1",
      startedAt: new Date("2026-05-21T10:00:00.000Z"),
    });
    vi.mocked(db.cardReview.count).mockResolvedValueOnce(4).mockResolvedValueOnce(3);

    await updateStudySession("user-1", "session-1", {
      completedAt: new Date("2026-05-21T12:00:00.000Z"),
      cardsReviewed: 4,
      newCards: 1,
    });

    expect(db.studySession.update).toHaveBeenCalledWith({
      where: { id: "session-1" },
      data: {
        completedAt: new Date("2026-05-21T12:00:00.000Z"),
        cardsReviewed: 4,
        newCards: 1,
        correctCount: undefined,
        incorrectCount: undefined,
        accuracyRate: 75,
      },
    });
  });

  it("rejects missing or unstarted sessions before update", async () => {
    vi.mocked(db.studySession.findUnique).mockResolvedValueOnce(null);
    await expect(updateStudySession("user-1", "missing", {})).rejects.toThrow(
      "Session not found or not owned by user"
    );

    vi.mocked(db.studySession.findUnique).mockResolvedValueOnce({ id: "session-1", startedAt: null });
    await expect(updateStudySession("user-1", "session-1", {})).rejects.toThrow(
      "Session has not started"
    );
  });
});
