import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { simpleSchedule } from "./scheduler";

describe("SRS Scheduler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-21T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("simpleSchedule()", () => {
    it("schedules NEW to LEARNING on correct", () => {
      const result = simpleSchedule("NEW", true);
      expect(result).toMatchObject({
        nextStatus: "LEARNING",
        intervalDays: 1
      });
      expect(result.nextReviewDate?.toISOString()).toBe("2026-05-22T12:00:00.000Z");
    });

    it("schedules LEARNING to MASTERED on correct", () => {
      const result = simpleSchedule("LEARNING", true);
      expect(result).toMatchObject({
        nextStatus: "MASTERED",
        intervalDays: 0,
        nextReviewDate: null
      });
    });

    it("schedules to LEARNING on incorrect", () => {
      const result = simpleSchedule("MASTERED", false);
      expect(result).toMatchObject({
        nextStatus: "LEARNING",
        intervalDays: 1
      });
      expect(result.nextReviewDate?.toISOString()).toBe("2026-05-22T12:00:00.000Z");
    });
  });
});
