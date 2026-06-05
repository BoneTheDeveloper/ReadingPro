import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openai } from "@ai-sdk/openai";
import { POST as reviewCard } from "@/app/api/cards/review/route";
import { GET as getDueCardsRoute } from "@/app/api/cards/due/route";
import { GET as getHealth } from "@/app/api/health/route";
import { GET as getProgressStats } from "@/app/api/progress/stats/route";
import { GET as getStudyChatHistory, POST as studyChat } from "@/app/api/study-chat/route";
import {
  PATCH as updateStudySessionRoute,
  POST as createStudySessionRoute,
} from "@/app/api/study-session/route";
import { POST as uploadFileRoute } from "@/app/api/upload/route";
import { POST as uploadTextRoute } from "@/app/api/upload/text/route";
import {
  cardReviewSuccessResponseSchema,
  dueCardsResponseSchema,
  dueCardsSuccessResponseSchema,
  progressStatsResponseSchema,
  progressStatsSuccessResponseSchema,
  studyChatHistoryResponseSchema,
  studyChatHistorySuccessResponseSchema,
  studySessionResponseSchema,
  studySessionSuccessResponseSchema,
  toCardReviewDto,
  toStudySessionDto,
} from "@/lib/study/shared/study-response-schema";
import { uploadSuccessResponseSchema } from "@/lib/upload/shared/upload-response-schema";
import { apiErrorResponseSchema } from "@/lib/api/shared/api-response-schema";
import { dueCardFixture, passageFixture, studySessionFixture, userProfileFixture } from "../../fixtures";
import { createFile, createJsonRequest, parseJsonResponse, readJsonResponse } from "../../helpers/api";
import { expectApiErrorPayload, expectApiSuccessPayload } from "../../helpers/assertions";
import { db } from "../../mocks/db";
import { convertToModelMessages, streamText } from "../../mocks/ai";

const routeMocks = vi.hoisted(() => {
  class UploadWorkflowError extends Error {
    constructor(message: string, readonly status = 400) {
      super(message);
      this.name = "UploadWorkflowError";
    }
  }

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
    createStudySession: vi.fn(),
    updateStudySession: vi.fn(),
    processFileUpload: vi.fn(),
    analyzeAndPersistContent: vi.fn(),
    getStudyChatModelId: vi.fn(() => "gpt-4o-mini"),
    UploadWorkflowError,
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

vi.mock("@/lib/db/study-session-queries", () => ({
  createStudySession: routeMocks.createStudySession,
  updateStudySession: routeMocks.updateStudySession,
}));

vi.mock("@/features/upload/upload-workflow", () => ({
  processFileUpload: routeMocks.processFileUpload,
  UploadWorkflowError: routeMocks.UploadWorkflowError,
}));

vi.mock("@/features/upload/content-analysis-service", () => ({
  analyzeAndPersistContent: routeMocks.analyzeAndPersistContent,
}));

vi.mock("@/lib/ai/model-config", () => ({
  getStudyChatModelId: routeMocks.getStudyChatModelId,
}));

const apiError = (message = "boom") => new Error(message);

async function expectJsonError(response: Response, status: number, message: string) {
  expect(response.status).toBe(status);
  expectApiErrorPayload(await parseJsonResponse(response, apiErrorResponseSchema), message);
}

function createUploadRequest(file: File | null) {
  return {
    formData: vi.fn(async () => ({
      get: vi.fn(() => file),
    })),
  } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  routeMocks.getAuthenticatedUser.mockResolvedValue(userProfileFixture);
  db.studyChatMessage.findMany.mockResolvedValue([]);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/cards/due", () => {
  it("returns due cards for the authenticated user", async () => {
    const dueCardWithPersistedOptions = {
      ...dueCardFixture,
      question: {
        ...dueCardFixture.question,
        options: JSON.stringify(dueCardFixture.question.options),
      },
    };
    routeMocks.getDueCards.mockResolvedValue([dueCardWithPersistedOptions]);

    const response = await getDueCardsRoute();
    const payload = await parseJsonResponse(response, dueCardsSuccessResponseSchema);

    expect(response.status).toBe(200);
    expectApiSuccessPayload(payload);
    expect(payload).toEqual({ success: true, data: [toCardReviewDto(dueCardWithPersistedOptions)] });
    expect(payload.data[0].question?.options).toEqual(dueCardFixture.question.options);
    expect(routeMocks.getDueCards).toHaveBeenCalledWith(userProfileFixture.id);
  });

  it("returns a stable error payload when auth fails", async () => {
    routeMocks.getAuthenticatedUser.mockRejectedValue(apiError("Authentication required"));

    const response = await getDueCardsRoute();
    expect(response.status).toBe(500);
    expectApiErrorPayload(await parseJsonResponse(response, dueCardsResponseSchema), "Failed to fetch due cards");
  });

  it("returns a stable error payload when the card query fails", async () => {
    routeMocks.getDueCards.mockRejectedValue(apiError("db down"));

    const response = await getDueCardsRoute();
    expect(response.status).toBe(500);
    expectApiErrorPayload(await parseJsonResponse(response, dueCardsResponseSchema), "Failed to fetch due cards");
  });
});

describe("GET /api/health", () => {
  it("returns the current deployment commit SHA for deployment verification", async () => {
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "commit_123");

    const response = getHealth();
    const payload = await readJsonResponse(response);

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      success: true,
      data: {
        status: "ok",
        commitSha: "commit_123",
      },
    });
  });
});

describe("POST /api/cards/review", () => {
  it("updates a review for the authenticated user", async () => {
    const updatedReview = { ...dueCardFixture, qualityRating: 5 };
    routeMocks.updateCardReview.mockResolvedValue(updatedReview);

    const response = await reviewCard(createJsonRequest({ cardReviewId: dueCardFixture.id, qualityRating: 5 }));
    const payload = await parseJsonResponse(response, cardReviewSuccessResponseSchema);

    expect(response.status).toBe(200);
    expectApiSuccessPayload(payload);
    expect(payload).toEqual({ success: true, data: toCardReviewDto(updatedReview) });
    expect(routeMocks.updateCardReview).toHaveBeenCalledWith(userProfileFixture.id, dueCardFixture.id, 5);
  });

  it("rejects missing IDs and invalid ratings before updating", async () => {
    await expectJsonError(
      await reviewCard(createJsonRequest({ qualityRating: 3 })),
      400,
      "Invalid request",
    );

    await expectJsonError(
      await reviewCard(createJsonRequest({ cardReviewId: dueCardFixture.id, qualityRating: 6 })),
      400,
      "Invalid request",
    );
    expect(routeMocks.updateCardReview).not.toHaveBeenCalled();
  });

  it("captures unexpected failures", async () => {
    const error = apiError("db down");
    routeMocks.updateCardReview.mockRejectedValue(error);

    await expectJsonError(
      await reviewCard(createJsonRequest({ cardReviewId: dueCardFixture.id, qualityRating: 4 })),
      500,
      "Failed to submit review",
    );
    expect(Sentry.captureException).toHaveBeenCalledWith(error, {
      tags: { route: "api:cards:review", method: "POST" },
    });
  });

  it("rejects malformed JSON with 400", async () => {
    await expectJsonError(
      await reviewCard(new NextRequest("https://english-reading.test/api/cards/review", { method: "POST", body: "{" })),
      400,
      "Invalid JSON payload.",
    );
  });

  it("rejects non-UUID card review IDs", async () => {
    await expectJsonError(
      await reviewCard(createJsonRequest({ cardReviewId: "not-a-uuid", qualityRating: 3 })),
      400,
      "Invalid request",
    );
    expect(routeMocks.updateCardReview).not.toHaveBeenCalled();
  });
});

describe("GET /api/progress/stats", () => {
  it("returns progress stats for the authenticated user", async () => {
    const stats = { totalCards: 12, dueCards: 3, matureCards: 6, todayReviews: 4, streakDays: 2 };
    routeMocks.getUserProgress.mockResolvedValue(stats);

    const response = await getProgressStats();
    const payload = await parseJsonResponse(response, progressStatsSuccessResponseSchema);

    expect(response.status).toBe(200);
    expectApiSuccessPayload(payload);
    expect(payload).toEqual({ success: true, data: stats });
    expect(routeMocks.getUserProgress).toHaveBeenCalledWith(userProfileFixture.id);
  });

  it("returns a stable error payload when progress lookup fails", async () => {
    routeMocks.getUserProgress.mockRejectedValue(apiError("db down"));

    const response = await getProgressStats();
    expect(response.status).toBe(500);
    expectApiErrorPayload(await parseJsonResponse(response, progressStatsResponseSchema), "Failed to fetch progress");
  });
});

describe("POST/PATCH /api/study-session", () => {
  it("creates and updates study sessions", async () => {
    routeMocks.createStudySession.mockResolvedValue(studySessionFixture);
    routeMocks.updateStudySession.mockResolvedValue({ ...studySessionFixture, cardsReviewed: 2 });

    const createResponse = await createStudySessionRoute(createJsonRequest({ passageId: passageFixture.id }));
    expect(await parseJsonResponse(createResponse, studySessionSuccessResponseSchema)).toEqual({
      success: true,
      data: toStudySessionDto(studySessionFixture),
    });
    expect(routeMocks.createStudySession).toHaveBeenCalledWith(userProfileFixture.id, passageFixture.id);

    const updateResponse = await updateStudySessionRoute(
      createJsonRequest({ sessionId: studySessionFixture.id, cardsReviewed: 2, correctCount: 1, incorrectCount: 1 }),
    );
    expect(await parseJsonResponse(updateResponse, studySessionSuccessResponseSchema)).toEqual({
      success: true,
      data: toStudySessionDto({ ...studySessionFixture, cardsReviewed: 2 }),
    });
    expect(routeMocks.updateStudySession).toHaveBeenCalledWith(userProfileFixture.id, studySessionFixture.id, {
      completedAt: expect.any(Date),
      cardsReviewed: 2,
      correctCount: 1,
      incorrectCount: 1,
    });
  });

  it("rejects invalid update bodies", async () => {
    const response = await updateStudySessionRoute(createJsonRequest({ cardsReviewed: -1 }));

    expect(response.status).toBe(400);
    expectApiErrorPayload(await parseJsonResponse(response, studySessionResponseSchema));
    expect(routeMocks.updateStudySession).not.toHaveBeenCalled();
  });

  it("captures create and update dependency failures", async () => {
    const createError = apiError("create failed");
    const updateError = apiError("update failed");
    routeMocks.createStudySession.mockRejectedValue(createError);
    routeMocks.updateStudySession.mockRejectedValue(updateError);

    await expectJsonError(
      await createStudySessionRoute(createJsonRequest({ passageId: passageFixture.id })),
      500,
      "Failed to create session",
    );
    await expectJsonError(
      await updateStudySessionRoute(createJsonRequest({ sessionId: studySessionFixture.id })),
      500,
      "Failed to update session",
    );
    expect(Sentry.captureException).toHaveBeenCalledWith(createError, {
      tags: { route: "api:study-session", method: "POST" },
    });
    expect(Sentry.captureException).toHaveBeenCalledWith(updateError, {
      tags: { route: "api:study-session", method: "PATCH" },
    });
  });

  it("rejects malformed JSON with 400", async () => {
    await expectJsonError(
      await createStudySessionRoute(new NextRequest("https://english-reading.test/api/study-session", { method: "POST", body: "{" })),
      400,
      "Invalid JSON payload.",
    );
  });

  it("rejects non-UUID session IDs", async () => {
    await expectJsonError(
      await updateStudySessionRoute(createJsonRequest({ sessionId: "not-a-uuid", cardsReviewed: 1 })),
      400,
      "Invalid UUID",
    );
    expect(routeMocks.updateStudySession).not.toHaveBeenCalled();
  });
});

describe("POST /api/study-chat", () => {
  it("streams a passage-grounded chat response", async () => {
    db.passage.findUnique.mockResolvedValue(passageFixture);
    db.studyChatMessage.findMany.mockResolvedValue([]);

    const response = await studyChat(
      createJsonRequest({
        passageId: passageFixture.id,
        messages: [{ id: "message-1", role: "user", parts: [{ type: "text", text: "What is the main idea?" }] }],
      }),
    );

    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(200);
    expect(db.passage.findUnique).toHaveBeenCalledWith({
      where: { id: passageFixture.id, userId: userProfileFixture.id, deletedAt: null },
      select: { id: true, content: true, title: true },
    });
    expect(convertToModelMessages).toHaveBeenCalledWith([
      { id: "message-1", role: "user", parts: [{ type: "text", text: "What is the main idea?" }] },
    ]);
    expect(db.studyChatMessage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ role: "user", content: "What is the main idea?" }),
    });
    expect(routeMocks.getStudyChatModelId).toHaveBeenCalledTimes(1);
    expect(openai).toHaveBeenCalledWith("gpt-4o-mini");
    expect(Sentry.startSpan).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "db:study-chat-passage-fetch",
        op: "db",
        attributes: expect.objectContaining({
          "db.model": "Passage",
          "study.passage_id": passageFixture.id,
        }),
      }),
      expect.any(Function),
    );
    expect(Sentry.startSpan).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "db:study-chat-user-message-create",
        op: "db",
        attributes: expect.objectContaining({
          "db.model": "StudyChatMessage",
          "study.message_length": 22,
        }),
      }),
      expect.any(Function),
    );
    expect(Sentry.startSpan).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "ai:study-chat-stream",
        op: "ai",
        attributes: expect.objectContaining({
          "ai.model_id": "gpt-4o-mini",
          "study.passage_id": passageFixture.id,
          "study.message_count": 1,
        }),
      }),
      expect.any(Function),
    );
    expect(streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: "user",
            content: expect.stringContaining(passageFixture.content),
          }),
        ]),
      }),
    );
  });

  it("persists continuity and fetches history by passage", async () => {
    db.passage.findUnique.mockResolvedValue(passageFixture);
    db.studyChatMessage.findMany.mockResolvedValueOnce([
      { role: "user", content: "First question?" },
      { role: "assistant", content: "First answer." },
    ]);
    streamText.mockImplementationOnce((input: unknown) => {
      const streamInput = input as {
        onFinish?: (event: {
          response: {
            messages: Array<{
              role: "assistant";
              content: Array<{ type: "text"; text: string }>;
            }>;
          };
        }) => void | Promise<void>;
      };

      void streamInput.onFinish?.({
        response: {
          messages: [{ role: "assistant", content: [{ type: "text", text: "Follow-up answer." }] }],
        },
      });
      return { toUIMessageStreamResponse: () => new Response("stream") };
    });

    await studyChat(
      createJsonRequest({
        passageId: passageFixture.id,
        messages: [{ id: "message-2", role: "user", parts: [{ type: "text", text: "Second question?" }] }],
      }),
    );

    expect(convertToModelMessages).toHaveBeenCalledWith([
      { id: "persisted-0", role: "user", parts: [{ type: "text", text: "First question?" }] },
      { id: "persisted-1", role: "assistant", parts: [{ type: "text", text: "First answer." }] },
      { id: "message-2", role: "user", parts: [{ type: "text", text: "Second question?" }] },
    ]);
    expect(db.studyChatMessage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ role: "assistant", content: "Follow-up answer." }),
    });
    expect(Sentry.startSpan).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "db:study-chat-assistant-message-create",
        op: "db",
        attributes: expect.objectContaining({
          "db.model": "StudyChatMessage",
          "study.message_length": 17,
        }),
      }),
      expect.any(Function),
    );

    db.studyChatMessage.findMany.mockResolvedValueOnce([
      { id: "chat-1", role: "user", content: "History A" },
    ]);
    const history = await getStudyChatHistory(
      new NextRequest(`https://english-reading.test/api/study-chat?passageId=${passageFixture.id}`),
    );
    expect(await parseJsonResponse(history, studyChatHistorySuccessResponseSchema)).toEqual({
      messages: [{ id: "chat-1", role: "user", parts: [{ type: "text", text: "History A" }] }],
    });
    expect(Sentry.startSpan).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "db:study-chat-history-list",
        op: "db",
        attributes: expect.objectContaining({
          "db.model": "StudyChatMessage",
          "study.passage_id": passageFixture.id,
        }),
      }),
      expect.any(Function),
    );

    await getStudyChatHistory(
      new NextRequest("https://english-reading.test/api/study-chat?passageId=another-passage"),
    );
    expect(db.studyChatMessage.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: { userId: userProfileFixture.id, passageId: "another-passage" } }),
    );
  });

  it("returns stable history error payloads", async () => {
    const missingPassage = await getStudyChatHistory(
      new NextRequest("https://english-reading.test/api/study-chat"),
    );
    expect(missingPassage.status).toBe(400);
    expectApiErrorPayload(
      await parseJsonResponse(missingPassage, studyChatHistoryResponseSchema),
      "A passageId is required.",
    );

    routeMocks.getAuthenticatedUser.mockRejectedValueOnce(new routeMocks.AuthenticationRequiredError());
    const unauthenticated = await getStudyChatHistory(
      new NextRequest(`https://english-reading.test/api/study-chat?passageId=${passageFixture.id}`),
    );
    expect(unauthenticated.status).toBe(401);
    expectApiErrorPayload(
      await parseJsonResponse(unauthenticated, studyChatHistoryResponseSchema),
      "Authentication required.",
    );

    const error = apiError("history db down");
    db.studyChatMessage.findMany.mockRejectedValueOnce(error);
    const failed = await getStudyChatHistory(
      new NextRequest(`https://english-reading.test/api/study-chat?passageId=${passageFixture.id}`),
    );
    expect(failed.status).toBe(500);
    expectApiErrorPayload(
      await parseJsonResponse(failed, studyChatHistoryResponseSchema),
      "Unable to load study chat history.",
    );
    expect(Sentry.captureException).toHaveBeenCalledWith(error, {
      tags: { route: "api:study-chat", method: "GET" },
    });
  });

  it("handles malformed chat bodies, unauthenticated users, missing passages, and stream failures", async () => {
    await expectJsonError(
      await studyChat(new NextRequest("https://english-reading.test/api/study-chat", { method: "POST", body: "{" })),
      400,
      "Invalid JSON payload.",
    );
    await expectJsonError(
      await studyChat(createJsonRequest({ passageId: "", messages: [] })),
      400,
      "Invalid chat request. Select a passage and enter a message.",
    );

    routeMocks.getAuthenticatedUser.mockRejectedValueOnce(new routeMocks.AuthenticationRequiredError());
    await expectJsonError(
      await studyChat(createJsonRequest({ passageId: passageFixture.id, messages: [] })),
      401,
      "Authentication required.",
    );

    db.passage.findUnique.mockResolvedValueOnce(null);
    await expectJsonError(
      await studyChat(createJsonRequest({ passageId: passageFixture.id, messages: [] })),
      404,
      "Passage not found.",
    );

    const streamError = apiError("ai down");
    db.passage.findUnique.mockResolvedValueOnce(passageFixture);
    streamText.mockImplementationOnce(() => {
      throw streamError;
    });
    await expectJsonError(
      await studyChat(createJsonRequest({ passageId: passageFixture.id, messages: [] })),
      500,
      "Unable to start the study chat stream.",
    );
    expect(Sentry.captureException).toHaveBeenCalledWith(streamError, {
      tags: { route: "api:study-chat", method: "POST" },
    });
  });

  it("rejects oversized chat history with learner-friendly guidance", async () => {
    const oversizedMessages = Array.from({ length: 25 }, (_, index) => ({
      id: `message-${index + 1}`,
      role: index % 2 === 0 ? "user" : "assistant",
      parts: [{ type: "text", text: `Message ${index + 1}` }],
    }));

    await expectJsonError(
      await studyChat(createJsonRequest({ passageId: passageFixture.id, messages: oversizedMessages })),
      400,
      "Your chat history is too long for one request. Keep the most recent 24 messages and try again.",
    );
    expect(convertToModelMessages).not.toHaveBeenCalled();
  });

  it("rejects overlong user message content with learner-friendly guidance", async () => {
    const longText = "a".repeat(2001);

    await expectJsonError(
      await studyChat(
        createJsonRequest({
          passageId: passageFixture.id,
          messages: [{ id: "message-1", role: "user", parts: [{ type: "text", text: longText }] }],
        }),
      ),
      400,
      "One of your messages is too long. Please shorten each message to 2000 characters or less and resend.",
    );
    expect(convertToModelMessages).not.toHaveBeenCalled();
  });
});

describe("POST /api/upload", () => {
  it("processes an authenticated file upload", async () => {
    const uploadResult = {
      filename: "user_test_123/story.txt",
      filePath: "user_test_reader/story.txt",
      passageId: passageFixture.id,
      originalLevel: "B1",
      simplifiedLevel: "A2",
      questionCount: 3,
    };
    routeMocks.processFileUpload.mockResolvedValue(uploadResult);
    const file = createFile("story.txt", "A useful story for reading practice.");

    const response = await uploadFileRoute(createUploadRequest(file));
    const payload = await parseJsonResponse(response, uploadSuccessResponseSchema);

    expect(response.status).toBe(200);
    expectApiSuccessPayload(payload);
    expect(payload).toEqual({
      success: true,
      data: {
        passageId: uploadResult.passageId,
        originalLevel: uploadResult.originalLevel,
        simplifiedLevel: uploadResult.simplifiedLevel,
        questionCount: uploadResult.questionCount,
      },
    });
    expect(payload.data).not.toHaveProperty("filename");
    expect(payload.data).not.toHaveProperty("filePath");
    expect(routeMocks.processFileUpload).toHaveBeenCalledWith(userProfileFixture.id, file);
  });

  it("rejects absent files and workflow validation errors", async () => {
    await expectJsonError(await uploadFileRoute(createUploadRequest(null)), 400, "No file provided");

    const file = createFile("bad.exe", "invalid", "application/octet-stream");
    routeMocks.processFileUpload.mockRejectedValue(new routeMocks.UploadWorkflowError("Only .txt and .pdf files are supported", 400));

    await expectJsonError(
      await uploadFileRoute(createUploadRequest(file)),
      400,
      "Only .txt and .pdf files are supported",
    );
  });

  it("rejects string file entries", async () => {
    const stringFileRequest = {
      formData: vi.fn(async () => ({
        get: vi.fn(() => "not-a-file"),
      })),
    } as unknown as NextRequest;

    await expectJsonError(await uploadFileRoute(stringFileRequest), 400, "No file provided");
  });

  it("captures unexpected upload failures", async () => {
    const error = apiError("storage down");
    routeMocks.processFileUpload.mockRejectedValue(error);
    const file = createFile("story.txt", "A useful story for reading practice.");

    await expectJsonError(await uploadFileRoute(createUploadRequest(file)), 500, "Failed to process file");
    expect(Sentry.captureException).toHaveBeenCalledWith(error, {
      tags: { route: "api:upload", method: "POST" },
    });
  });
});

describe("POST /api/upload/text", () => {
  it("processes valid text uploads", async () => {
    const result = { passageId: passageFixture.id, originalLevel: "B1", simplifiedLevel: "A2", questionCount: 3 };
    routeMocks.analyzeAndPersistContent.mockResolvedValue(result);
    const text = "This is a sufficiently long text passage for upload route testing with enough characters.";

    const response = await uploadTextRoute(createJsonRequest({ text, title: "Practice Text" }));
    const payload = await parseJsonResponse(response, uploadSuccessResponseSchema);

    expect(response.status).toBe(200);
    expectApiSuccessPayload(payload);
    expect(payload).toEqual({ success: true, data: result });
    expect(routeMocks.analyzeAndPersistContent).toHaveBeenCalledWith({
      userId: userProfileFixture.id,
      text,
      title: "Practice Text",
      sourceType: "TEXT",
    });
  });

  it("rejects missing, malformed, and invalid text payloads", async () => {
    await expectJsonError(await uploadTextRoute(createJsonRequest({})), 400, "Text content is required");
    await expectJsonError(await uploadTextRoute(createJsonRequest({ text: 123 })), 400, "Text content is required");
    await expectJsonError(
      await uploadTextRoute(createJsonRequest({ text: "too short" })),
      400,
      "Text is too short (minimum 50 characters)",
    );
  });

  it("captures malformed JSON and analysis failures", async () => {
    await expectJsonError(
      await uploadTextRoute(new NextRequest("https://english-reading.test/api/upload/text", { method: "POST", body: "{" })),
      400,
      "Invalid JSON payload.",
    );

    const error = apiError("ai down");
    routeMocks.analyzeAndPersistContent.mockRejectedValue(error);
    await expectJsonError(
      await uploadTextRoute(
        createJsonRequest({
          text: "This is a sufficiently long text passage for upload route testing with enough characters.",
        }),
      ),
      500,
      "Failed to process text",
    );
    expect(Sentry.captureException).toHaveBeenCalledWith(error, {
      tags: { route: "api:upload:text", method: "POST" },
    });
  });
});
