import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { calculateSM2, getCardStatus, getSuggestedRating, isCardDue } from "./sm2";

describe("SM2 helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-21T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("schedules first and second successful repetitions", () => {
    const first = calculateSM2({ easeFactor: 2.5, intervalDays: 0, repetitions: 0 }, 4);
    const second = calculateSM2(first, 5);

    expect(first).toMatchObject({ easeFactor: 2.5, intervalDays: 1, repetitions: 1 });
    expect(first.nextReviewDate.toISOString()).toBe("2026-05-22T12:00:00.000Z");
    expect(second).toMatchObject({ easeFactor: 2.6, intervalDays: 6, repetitions: 2 });
    expect(second.nextReviewDate.toISOString()).toBe("2026-05-27T12:00:00.000Z");
  });

  it("resets repetitions for low quality and clamps ease factor", () => {
    const reset = calculateSM2({ easeFactor: 1.35, intervalDays: 12, repetitions: 4 }, 2);
    const clamped = calculateSM2({ easeFactor: 1.31, intervalDays: 6, repetitions: 2 }, 3);

    expect(reset).toMatchObject({ easeFactor: 1.35, intervalDays: 1, repetitions: 0 });
    expect(clamped.easeFactor).toBe(1.3);
  });

  it("maps answer categories to suggested quality ratings", () => {
    expect(getSuggestedRating("perfect")).toBe(5);
    expect(getSuggestedRating("correct")).toBe(4);
    expect(getSuggestedRating("difficult")).toBe(3);
    expect(getSuggestedRating("wrong")).toBe(2);
    expect(getSuggestedRating("blackout")).toBe(0);
  });

  it("classifies due and scheduled card statuses", () => {
    expect(isCardDue(new Date("2026-05-21T12:00:00.000Z"))).toBe(true);
    expect(isCardDue(new Date("2026-05-22T12:00:00.000Z"))).toBe(false);
    expect(getCardStatus(new Date("2026-05-22T12:00:00.000Z"), 0)).toMatchObject({ status: "new" });
    expect(getCardStatus(new Date("2026-05-22T12:00:00.000Z"), 6)).toMatchObject({ status: "learning" });
    expect(getCardStatus(new Date("2026-05-20T12:00:00.000Z"), 21)).toMatchObject({ status: "review" });
    expect(getCardStatus(new Date("2026-06-20T12:00:00.000Z"), 21)).toMatchObject({ status: "mature" });
  });
});
