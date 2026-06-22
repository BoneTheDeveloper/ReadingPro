import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getProgressStats } from "@/app/api/progress/stats/route";
import {
  progressStatsResponseSchema,
  progressStatsSuccessResponseSchema,
} from "@/contracts/study/study-response-schema";
import { userProfileFixture } from "../../fixtures";
import { createGetRequest, parseJsonResponse } from "../../helpers/api";
import { expectApiErrorPayload, expectApiSuccessPayload } from "../../helpers/assertions";

const routeMocks = vi.hoisted(() => {
  class AuthenticationRequiredError extends Error {
    constructor() {
      super("Authentication required");
      this.name = "AuthenticationRequiredError";
    }
  }

  return {
    getUserId: vi.fn(),
    getUserProgress: vi.fn(),
    AuthenticationRequiredError,
  };
});

vi.mock("@/server/auth/auth-utils", () => ({
  getUserId: routeMocks.getUserId,
  AuthenticationRequiredError: routeMocks.AuthenticationRequiredError,
}));

vi.mock("@/server/db/quiz/quiz-review", () => ({
  getUserProgress: routeMocks.getUserProgress,
}));

beforeEach(() => {
  vi.clearAllMocks();
  routeMocks.getUserId.mockResolvedValue(userProfileFixture.id);
});

describe("GET /api/progress/stats", () => {
  it("returns progress stats for the authenticated user", async () => {
    const stats = {
      streakDays: 2,
      timeStudiedTodaySeconds: 0,
      timeStudiedWeekSeconds: 0,
      activeDaysThisWeek: 0,
    };
    routeMocks.getUserProgress.mockResolvedValue(stats);

    const response = await getProgressStats(createGetRequest());
    const payload = await parseJsonResponse(response, progressStatsSuccessResponseSchema);

    expect(response.status).toBe(200);
    expectApiSuccessPayload(payload);
    expect(payload).toEqual({ success: true, data: stats });
    expect(routeMocks.getUserProgress).toHaveBeenCalledWith(userProfileFixture.id);
  });

  it("rejects unauthenticated requests with 401", async () => {
    routeMocks.getUserId.mockRejectedValue(new routeMocks.AuthenticationRequiredError());

    const response = await getProgressStats(createGetRequest());
    await parseJsonResponse(response, progressStatsResponseSchema);
    expect(response.status).toBe(401);
  });

  it("returns a stable error payload when progress lookup fails", async () => {
    routeMocks.getUserProgress.mockRejectedValue(new Error("db down"));

    const response = await getProgressStats(createGetRequest());
    expect(response.status).toBe(500);
    expectApiErrorPayload(
      await parseJsonResponse(response, progressStatsResponseSchema),
      "Failed to fetch progress",
    );
  });
});
