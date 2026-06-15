import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { questionReviewFixture } from "../../../../tests/vitest/fixtures";
import { db } from "../client";
import {
  calculateSM2Interval,
  createQuestionReview,
  getDueQuestions,
  getUserProgress,
  updateQuestionReview,
} from "./quiz-review";

describe("quiz-review queries", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-10T12:00:00.000Z"));
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

  it("queries due questions for a user in review order", async () => {
    vi.mocked(db.questionReview.findMany).mockResolvedValue([{ ...questionReviewFixture, id: "review-1" }]);

    await expect(getDueQuestions("user-1")).resolves.toEqual([{ ...questionReviewFixture, id: "review-1" }]);

    expect(db.questionReview.findMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        nextReviewDate: { lte: new Date("2026-01-10T12:00:00.000Z") },
      },
      include: {
        question: { include: { passage: true } },
      },
      orderBy: { nextReviewDate: "asc" },
      take: 20,
    });
  });

  it("updates a question review with new SM2 scheduling fields", async () => {
    vi.mocked(db.questionReview.findUniqueOrThrow).mockResolvedValue({
      ...questionReviewFixture,
      id: "review-1",
      easeFactor: 2.5,
      intervalDays: 6,
      repetitions: 2,
    } as any);

    await updateQuestionReview("user-1", "review-1", 5);

    expect(db.questionReview.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: "review-1", userId: "user-1" },
    });
    expect(db.questionReview.update).toHaveBeenCalledWith({
      where: { id: "review-1" },
      data: {
        qualityRating: 5,
        easeFactor: 2.6,
        intervalDays: 16,
        repetitions: 3,
        nextReviewDate: new Date("2026-01-26T12:00:00.000Z"),
        reviewedAt: new Date("2026-01-10T12:00:00.000Z"),
      },
    });
  });

  it("creates a new question review with starter scheduling values", async () => {
    await createQuestionReview("user-1", "question-1");

    expect(db.questionReview.create).toHaveBeenCalledWith({
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

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
        { day: today },
        { day: yesterday },
        { day: twoDaysAgo },
      ])
      .mockResolvedValueOnce([
        {
          totalQuizAttempts: BigInt(5),
          avgQuizAccuracy: 72.5,
          todayQuizAttempts: BigInt(1),
        },
      ]);

    await expect(getUserProgress("user-1")).resolves.toEqual({
      totalCards: 10,
      matureCards: 3,
      dueCards: 2,
      todayReviews: 4,
      streakDays: 3,
      totalQuizAttempts: 5,
      avgQuizAccuracy: 72.5,
      todayQuizAttempts: 1,
    });
  });
});
