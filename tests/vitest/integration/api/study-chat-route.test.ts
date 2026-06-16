import { NextRequest } from "next/server";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { GET as getStudyChatHistory, POST as studyChatRoute } from "@/app/api/study-chat/route";
import { streamText } from "ai";
import { studyChatHistoryResponseSchema } from "@/shared/study/study-response-schema";
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

vi.mock("@/server/auth/auth-utils", () => ({
  getAuthenticatedUser: routeMocks.getAuthenticatedUser,
  AuthenticationRequiredError: routeMocks.AuthenticationRequiredError,
}));

vi.mock("@/server/ai/model-config", () => ({
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

  it("returns 400 for malformed JSON body", async () => {
    const request = new NextRequest("https://english-reading.test/api/study-chat", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "this is not json {{{",
    });

    const response = await studyChatRoute(request);

    expect(response.status).toBe(400);
    expectApiErrorPayload(await response.json(), "Invalid JSON payload.");
  });

  it("returns 400 when message history exceeds the 24-message limit", async () => {
    const messages = Array.from({ length: 25 }, (_, i) => ({
      id: `msg-${i}`,
      role: i % 2 === 0 ? "user" : ("assistant" as const),
      parts: [{ type: "text" as const, text: `Message ${i}` }],
    }));

    const response = await studyChatRoute(
      createJsonRequest({ passageId: passageFixture.id, messages }),
    );

    expect(response.status).toBe(400);
    expectApiErrorPayload(
      await response.json(),
      "Your chat history is too long for one request. Keep the most recent 24 messages and try again.",
    );
  });

  it("returns 400 when a user text part exceeds 2000 characters", async () => {
    const longText = "x".repeat(2001);

    const response = await studyChatRoute(
      createJsonRequest({
        passageId: passageFixture.id,
        messages: [
          {
            id: "msg-long",
            role: "user",
            parts: [{ type: "text", text: longText }],
          },
        ],
      }),
    );

    expect(response.status).toBe(400);
    expectApiErrorPayload(
      await response.json(),
      "One of your messages is too long. Please shorten each message to 2000 characters or less and resend.",
    );
  });

  it("returns 500 when assistant message persistence fails during streaming", async () => {
    db.passage.findUnique.mockResolvedValue({
      id: passageFixture.id,
      title: passageFixture.title,
      content: passageFixture.content,
    });

    vi.mocked(streamText).mockImplementationOnce((options: unknown) => {
      const opts = options as { onFinish?: (params: { response: { messages: Array<{ role: string; content: unknown }> } }) => Promise<void> };
      if (opts.onFinish) {
        void opts.onFinish({
          response: {
            messages: [{ role: "assistant", content: [{ type: "text", text: "Answer" }] }],
          },
        }).catch(() => {
          // onFinish throws because DB create fails — the outer catch handles it
        });
      }
      throw new Error("DB write failed: unable to persist assistant message");
    });

    const response = await studyChatRoute(
      createJsonRequest({
        passageId: passageFixture.id,
        messages: [
          {
            id: "msg-1",
            role: "user",
            parts: [{ type: "text", text: "What is the main idea?" }],
          },
        ],
      }),
    );

    expect(response.status).toBe(500);
    expectApiErrorPayload(await response.json(), "Unable to start the study chat stream.");
  });
});
