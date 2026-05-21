import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cardReviewFixture } from "../../../__tests__/fixtures";
import { db } from "./client";
import {
  calculateSM2Interval,
  createCardReview,
  getDueCards,
  getUserProgress,
  updateCardReview,
} from "./card-review-queries";

describe("card-review queries", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-21T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calculates SM2 interval data without returning date fields", () => {
    expect(calculateSM2Interval(2.5, 6, 2, 5)).toEqual({
      easeFactor: 2.6,
      intervalDays: 16,
      repetitions: 3,
    });
  });

  it("queries due cards for a user in review order", async () => {
    vi.mocked(db.cardReview.findMany).mockResolvedValue([{ ...cardReviewFixture, id: "review-1" }]);

    await expect(getDueCards("user-1")).resolves.toEqual([{ ...cardReviewFixture, id: "review-1" }]);

    expect(db.cardReview.findMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        nextReviewDate: { lte: new Date("2026-05-21T12:00:00.000Z") },
      },
      include: {
        question: { include: { passage: true } },
      },
      orderBy: { nextReviewDate: "asc" },
      take: 20,
    });
  });

  it("updates a card review with new SM2 scheduling fields", async () => {
    vi.mocked(db.cardReview.findUniqueOrThrow).mockResolvedValue({
      ...cardReviewFixture,
      id: "review-1",
      easeFactor: 2.5,
      intervalDays: 6,
      repetitions: 2,
    });

    await updateCardReview("user-1", "review-1", 5);

    expect(db.cardReview.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: "review-1", userId: "user-1" },
    });
    expect(db.cardReview.update).toHaveBeenCalledWith({
      where: { id: "review-1" },
      data: {
        qualityRating: 5,
        easeFactor: 2.6,
        intervalDays: 16,
        repetitions: 3,
        nextReviewDate: new Date("2026-06-06T12:00:00.000Z"),
        reviewedAt: new Date("2026-05-21T12:00:00.000Z"),
      },
    });
  });

  it("creates a new card review with starter scheduling values", async () => {
    await createCardReview("user-1", "question-1");

    expect(db.cardReview.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        questionId: "question-1",
        qualityRating: 0,
        easeFactor: 2.5,
        intervalDays: 1,
        repetitions: 0,
      },
    });
  });

  it("normalizes progress aggregate rows and calculates current streak", async () => {
    vi.mocked(db.$queryRaw)
      .mockResolvedValueOnce([
        {
          totalCards: BigInt(10),
          matureCards: BigInt(3),
          dueCards: BigInt(2),
          todayReviews: BigInt(4),
        },
      ])
      .mockResolvedValueOnce([
        { day: new Date("2026-05-20T12:00:00.000Z") },
        { day: new Date("2026-05-19T12:00:00.000Z") },
        { day: new Date("2026-05-18T12:00:00.000Z") },
      ]);

    await expect(getUserProgress("user-1")).resolves.toEqual({
      totalCards: 10,
      matureCards: 3,
      dueCards: 2,
      todayReviews: 4,
      streakDays: 3,
    });
  });
});
