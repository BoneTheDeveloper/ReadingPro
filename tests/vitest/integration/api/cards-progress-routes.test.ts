import { NextRequest } from "next/server";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { GET as getDueCardsRoute } from "@/app/api/cards/due/route";
import { POST as reviewCardRoute } from "@/app/api/cards/review/route";
import { GET as getProgressStatsRoute } from "@/app/api/progress/stats/route";
import {
  cardReviewResponseSchema,
  dueCardsResponseSchema,
  progressStatsResponseSchema,
} from "@/lib/study/shared/study-response-schema";
import { dueCardFixture, userProfileFixture } from "../../fixtures";
import { createGetRequest, createJsonRequest, parseJsonResponse } from "../../helpers/api";
import { expectApiErrorPayload } from "../../helpers/assertions";

const routeMocks = vi.hoisted(() => {
  class AuthenticationRequiredError extends Error {
    constructor() {
      super("Authentication required");
      this.name = "AuthenticationRequiredError";
    }
  }

  return {
    getAuthenticatedUser: vi.fn(),
    getDueCards: vi.fn(),
    updateCardReview: vi.fn(),
    getUserProgress: vi.fn(),
    AuthenticationRequiredError,
  };
});

vi.mock("@/lib/auth/auth-utils", () => ({
  getAuthenticatedUser: routeMocks.getAuthenticatedUser,
  AuthenticationRequiredError: routeMocks.AuthenticationRequiredError,
}));

vi.mock("@/lib/db/card-review-queries", () => ({
  getDueCards: routeMocks.getDueCards,
  updateCardReview: routeMocks.updateCardReview,
  getUserProgress: routeMocks.getUserProgress,
}));

beforeEach(() => {
  vi.clearAllMocks();
  routeMocks.getAuthenticatedUser.mockResolvedValue(userProfileFixture);
});

describe("cards and progress API contracts", () => {
  it("returns 401 envelopes for unauthenticated card/progress requests", async () => {
    routeMocks.getAuthenticatedUser.mockRejectedValue(new routeMocks.AuthenticationRequiredError());

    const dueCards = await getDueCardsRoute(createGetRequest());
    expect(dueCards.status).toBe(401);
    expectApiErrorPayload(
      await parseJsonResponse(dueCards, dueCardsResponseSchema),
      "Authentication required.",
    );

    const review = await reviewCardRoute(
      createJsonRequest({ cardReviewId: dueCardFixture.id, qualityRating: 4 }),
    );
    expect(review.status).toBe(401);
    expectApiErrorPayload(
      await parseJsonResponse(review, cardReviewResponseSchema),
      "Authentication required.",
    );

    const progress = await getProgressStatsRoute(createGetRequest());
    expect(progress.status).toBe(401);
    expectApiErrorPayload(
      await parseJsonResponse(progress, progressStatsResponseSchema),
      "Authentication required.",
    );

    expect(routeMocks.getDueCards).not.toHaveBeenCalled();
    expect(routeMocks.updateCardReview).not.toHaveBeenCalled();
    expect(routeMocks.getUserProgress).not.toHaveBeenCalled();
  });

  it("returns 404 when reviewing a card that is not owned by the user", async () => {
    routeMocks.updateCardReview.mockRejectedValue(new Error("No CardReview found"));

    const response = await reviewCardRoute(
      createJsonRequest({ cardReviewId: dueCardFixture.id, qualityRating: 4 }),
    );

    expect(response.status).toBe(404);
    expectApiErrorPayload(
      await parseJsonResponse(response, cardReviewResponseSchema),
      "Card review not found.",
    );
  });

  it("keeps malformed review JSON and schema failures on 400", async () => {
    const malformedJson = await reviewCardRoute(
      new NextRequest("https://english-reading.test/api/cards/review", { method: "POST", body: "{" }),
    );
    expect(malformedJson.status).toBe(400);
    expectApiErrorPayload(
      await parseJsonResponse(malformedJson, cardReviewResponseSchema),
      "Invalid JSON payload.",
    );

    const invalidSchema = await reviewCardRoute(createJsonRequest({ cardReviewId: "bad", qualityRating: 4 }));
    expect(invalidSchema.status).toBe(400);
    expectApiErrorPayload(
      await parseJsonResponse(invalidSchema, cardReviewResponseSchema),
      "Invalid request",
    );
    expect(routeMocks.updateCardReview).not.toHaveBeenCalled();
  });
});
