import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as createStudySessionRoute } from "@/app/api/study-session/route";
import { studySessionResponseSchema, toStudySessionDto } from "@/shared/study/study-response-schema";
import { studySessionFixture, userProfileFixture } from "../../fixtures";
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
    ensureActiveSession: vi.fn(),
    AuthenticationRequiredError,
  };
});

vi.mock("@/server/auth/auth-utils", () => ({
  getAuthenticatedUser: routeMocks.getAuthenticatedUser,
  AuthenticationRequiredError: routeMocks.AuthenticationRequiredError,
}));

vi.mock("@/server/db/study-session-queries", () => ({
  ensureActiveSession: routeMocks.ensureActiveSession,
}));

beforeEach(() => {
  vi.clearAllMocks();
  routeMocks.getAuthenticatedUser.mockResolvedValue(userProfileFixture);
});

describe("study-session API contracts", () => {
  it("returns 401 for unauthenticated ensure requests", async () => {
    routeMocks.getAuthenticatedUser.mockRejectedValue(new routeMocks.AuthenticationRequiredError());

    const created = await createStudySessionRoute(createJsonRequest({}));
    expect(created.status).toBe(401);
    expectApiErrorPayload(
      await parseJsonResponse(created, studySessionResponseSchema),
      "Authentication required.",
    );

    expect(routeMocks.ensureActiveSession).not.toHaveBeenCalled();
  });

  it("ensures and returns an active study session", async () => {
    routeMocks.ensureActiveSession.mockResolvedValue(studySessionFixture);

    const response = await createStudySessionRoute(createJsonRequest({}));
    const payload = await parseJsonResponse(response, studySessionResponseSchema);

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      success: true,
      data: toStudySessionDto(studySessionFixture),
    });
    expect(routeMocks.ensureActiveSession).toHaveBeenCalledWith(userProfileFixture.id);
  });

  it("returns 400 for unexpected body fields", async () => {
    const response = await createStudySessionRoute(createJsonRequest({ passageId: "123" }));

    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid JSON", async () => {
    const response = await createStudySessionRoute(new NextRequest("https://test/api/study-session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not-json",
    }));

    expect(response.status).toBe(400);
  });
});
