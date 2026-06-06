import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  PATCH as updateStudySessionRoute,
  POST as createStudySessionRoute,
} from "@/app/api/study-session/route";
import { studySessionResponseSchema } from "@/lib/study/shared/study-response-schema";
import { passageFixture, studySessionFixture, userProfileFixture } from "../../fixtures";
import { createJsonRequest, parseJsonResponse } from "../../helpers/api";
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
    createStudySession: vi.fn(),
    updateStudySession: vi.fn(),
    AuthenticationRequiredError,
  };
});

vi.mock("@/lib/auth/auth-utils", () => ({
  getAuthenticatedUser: routeMocks.getAuthenticatedUser,
  AuthenticationRequiredError: routeMocks.AuthenticationRequiredError,
}));

vi.mock("@/lib/db/study-session-queries", () => ({
  createStudySession: routeMocks.createStudySession,
  updateStudySession: routeMocks.updateStudySession,
}));

beforeEach(() => {
  vi.clearAllMocks();
  routeMocks.getAuthenticatedUser.mockResolvedValue(userProfileFixture);
});

describe("study-session API contracts", () => {
  it("returns 401 envelopes for unauthenticated create and update requests", async () => {
    routeMocks.getAuthenticatedUser.mockRejectedValue(new routeMocks.AuthenticationRequiredError());

    const created = await createStudySessionRoute(createJsonRequest({ passageId: passageFixture.id }));
    expect(created.status).toBe(401);
    expectApiErrorPayload(
      await parseJsonResponse(created, studySessionResponseSchema),
      "Authentication required.",
    );

    const updated = await updateStudySessionRoute(
      createJsonRequest({ sessionId: studySessionFixture.id, cardsReviewed: 1 }),
    );
    expect(updated.status).toBe(401);
    expectApiErrorPayload(
      await parseJsonResponse(updated, studySessionResponseSchema),
      "Authentication required.",
    );

    expect(routeMocks.createStudySession).not.toHaveBeenCalled();
    expect(routeMocks.updateStudySession).not.toHaveBeenCalled();
  });

  it("returns 404 for passage ownership misses when creating a session", async () => {
    routeMocks.createStudySession.mockRejectedValue(new Error("Passage not found or not owned by user"));

    const response = await createStudySessionRoute(createJsonRequest({ passageId: passageFixture.id }));

    expect(response.status).toBe(404);
    expectApiErrorPayload(
      await parseJsonResponse(response, studySessionResponseSchema),
      "Passage not found.",
    );
  });

  it("returns 404 for session ownership misses when updating a session", async () => {
    routeMocks.updateStudySession.mockRejectedValue(new Error("Session not found or not owned by user"));

    const response = await updateStudySessionRoute(
      createJsonRequest({ sessionId: studySessionFixture.id, cardsReviewed: 1 }),
    );

    expect(response.status).toBe(404);
    expectApiErrorPayload(
      await parseJsonResponse(response, studySessionResponseSchema),
      "Session not found.",
    );
  });
});
