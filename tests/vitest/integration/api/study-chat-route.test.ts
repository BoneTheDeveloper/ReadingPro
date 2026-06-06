import { NextRequest } from "next/server";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { GET as getStudyChatHistory, POST as studyChatRoute } from "@/app/api/study-chat/route";
import { studyChatHistoryResponseSchema } from "@/lib/study/shared/study-response-schema";
import { passageFixture, userProfileFixture } from "../../fixtures";
import { createJsonRequest, parseJsonResponse } from "../../helpers/api";
import { expectApiErrorPayload } from "../../helpers/assertions";
import { db } from "../../mocks/db";

const routeMocks = vi.hoisted(() => {
  class AuthenticationRequiredError extends Error {
    constructor() {
      super("Authentication required");
      this.name = "AuthenticationRequiredError";
    }
  }

  return {
    getAuthenticatedUser: vi.fn(),
    getStudyChatModelId: vi.fn(() => "gpt-4o-mini"),
    AuthenticationRequiredError,
  };
});

vi.mock("@/lib/auth/auth-utils", () => ({
  getAuthenticatedUser: routeMocks.getAuthenticatedUser,
  AuthenticationRequiredError: routeMocks.AuthenticationRequiredError,
}));

vi.mock("@/lib/ai/model-config", () => ({
  getStudyChatModelId: routeMocks.getStudyChatModelId,
}));

beforeEach(() => {
  vi.clearAllMocks();
  routeMocks.getAuthenticatedUser.mockResolvedValue(userProfileFixture);
  db.studyChatMessage.findMany.mockResolvedValue([]);
});

describe("study-chat API contracts", () => {
  it("returns a stable 400 history error when passageId is missing", async () => {
    const response = await getStudyChatHistory(new NextRequest("https://english-reading.test/api/study-chat"));

    expect(response.status).toBe(400);
    expectApiErrorPayload(
      await parseJsonResponse(response, studyChatHistoryResponseSchema),
      "A passageId is required.",
    );
  });

  it("returns 401 envelopes for unauthenticated stream and history requests", async () => {
    routeMocks.getAuthenticatedUser.mockRejectedValue(new routeMocks.AuthenticationRequiredError());

    const stream = await studyChatRoute(
      createJsonRequest({
        passageId: passageFixture.id,
        messages: [{ id: "message-1", role: "user", parts: [{ type: "text", text: "Main idea?" }] }],
      }),
    );
    expect(stream.status).toBe(401);
    expectApiErrorPayload(await stream.json(), "Authentication required.");

    const history = await getStudyChatHistory(
      new NextRequest(`https://english-reading.test/api/study-chat?passageId=${passageFixture.id}`),
    );
    expect(history.status).toBe(401);
    expectApiErrorPayload(
      await parseJsonResponse(history, studyChatHistoryResponseSchema),
      "Authentication required.",
    );
  });

  it("returns 404 when the selected passage is missing or belongs to another user", async () => {
    db.passage.findUnique.mockResolvedValue(null);

    const response = await studyChatRoute(
      createJsonRequest({
        passageId: passageFixture.id,
        messages: [{ id: "message-1", role: "user", parts: [{ type: "text", text: "Main idea?" }] }],
      }),
    );

    expect(response.status).toBe(404);
    expectApiErrorPayload(await response.json(), "Passage not found.");
  });
});
