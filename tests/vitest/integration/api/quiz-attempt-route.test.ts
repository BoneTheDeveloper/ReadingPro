import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PATCH as completeAttempt, POST as createAttempt } from "@/app/api/quiz-attempt/route";
import {
  quizAttemptResponseSchema,
  quizAttemptSuccessResponseSchema,
  toQuizAttemptDto,
} from "@/lib/study/shared/study-response-schema";
import { apiErrorResponseSchema } from "@/lib/api/shared/api-response-schema";
import { passageFixture, studySessionFixture, userProfileFixture } from "../../fixtures";
import { createJsonRequest, parseJsonResponse } from "../../helpers/api";
import { expectApiErrorPayload, expectApiSuccessPayload } from "../../helpers/assertions";

const routeMocks = vi.hoisted(() => {
  class AuthenticationRequiredError extends Error {
    constructor() {
      super("Authentication required");
      this.name = "AuthenticationRequiredError";
    }
  }

  return {
    getAuthenticatedUser: vi.fn(),
    createQuizAttempt: vi.fn(),
    completeQuizAttempt: vi.fn(),
    AuthenticationRequiredError,
  };
});

vi.mock("@/lib/auth/auth-utils", () => ({
  getAuthenticatedUser: routeMocks.getAuthenticatedUser,
  AuthenticationRequiredError: routeMocks.AuthenticationRequiredError,
}));

vi.mock("@/lib/db/quiz-attempt-queries", () => ({
  createQuizAttempt: routeMocks.createQuizAttempt,
  completeQuizAttempt: routeMocks.completeQuizAttempt,
}));

vi.mock("@sentry/nextjs", () => ({
  startSpan: (_: unknown, fn: () => unknown) => fn(),
  captureException: vi.fn(),
}));

const quizAttemptFixture = {
  id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  studySessionId: studySessionFixture.id,
  userId: userProfileFixture.id,
  passageId: passageFixture.id,
  correctCount: 0,
  incorrectCount: 0,
  totalQuestions: 0,
  accuracyRate: null,
  startedAt: new Date("2026-06-08T12:00:00.000Z"),
  completedAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  routeMocks.getAuthenticatedUser.mockResolvedValue(userProfileFixture);
});

describe("POST /api/quiz-attempt", () => {
  it("creates a quiz attempt and returns DTO", async () => {
    routeMocks.createQuizAttempt.mockResolvedValue(quizAttemptFixture);

    const req = createJsonRequest({
      studySessionId: studySessionFixture.id,
      passageId: passageFixture.id,
    });
    const response = await createAttempt(req);
    const payload = await parseJsonResponse(response, quizAttemptSuccessResponseSchema);

    expect(response.status).toBe(200);
    expectApiSuccessPayload(payload);
    expect(payload.data).toEqual(toQuizAttemptDto(quizAttemptFixture));
    expect(routeMocks.createQuizAttempt).toHaveBeenCalledWith(
      studySessionFixture.id,
      userProfileFixture.id,
      passageFixture.id,
    );
  });

  it("creates attempt without passageId", async () => {
    const attemptNoPassage = { ...quizAttemptFixture, passageId: null };
    routeMocks.createQuizAttempt.mockResolvedValue(attemptNoPassage);

    const req = createJsonRequest({ studySessionId: studySessionFixture.id });
    const response = await createAttempt(req);
    const payload = await parseJsonResponse(response, quizAttemptSuccessResponseSchema);

    expect(response.status).toBe(200);
    expect(payload.data.passageId).toBeNull();
  });

  it("returns 400 for invalid body", async () => {
    const req = createJsonRequest({ studySessionId: 123 });
    const response = await createAttempt(req);

    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid JSON", async () => {
    const req = new NextRequest("https://test/api/quiz-attempt", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not-json",
    });
    const response = await createAttempt(req);

    expect(response.status).toBe(400);
  });

  it("returns 400 when session not found or not owned", async () => {
    const { ZodError } = await import("zod");
    routeMocks.createQuizAttempt.mockRejectedValue(
      new ZodError([
        { code: "custom", message: "Study session not found or not owned by user", path: ["studySessionId"] },
      ]),
    );

    const req = createJsonRequest({ studySessionId: "nonexistent-id" });
    const response = await createAttempt(req);

    expect(response.status).toBe(400);
  });
});

describe("PATCH /api/quiz-attempt", () => {
  const completedFixture = {
    ...quizAttemptFixture,
    correctCount: 3,
    incorrectCount: 2,
    totalQuestions: 5,
    accuracyRate: 60,
    completedAt: new Date("2026-06-08T12:01:00.000Z"),
  };

  it("completes a quiz attempt with computed accuracy", async () => {
    routeMocks.completeQuizAttempt.mockResolvedValue(completedFixture);

    const req = createJsonRequest({
      attemptId: quizAttemptFixture.id,
      correctCount: 3,
      incorrectCount: 2,
      totalQuestions: 5,
    });
    const response = await completeAttempt(req);
    const payload = await parseJsonResponse(response, quizAttemptSuccessResponseSchema);

    expect(response.status).toBe(200);
    expectApiSuccessPayload(payload);
    expect(payload.data.correctCount).toBe(3);
    expect(payload.data.incorrectCount).toBe(2);
    expect(payload.data.totalQuestions).toBe(5);
    expect(payload.data.accuracyRate).toBe(60);
    expect(payload.data.completedAt).not.toBeNull();
    expect(routeMocks.completeQuizAttempt).toHaveBeenCalledWith(
      quizAttemptFixture.id,
      userProfileFixture.id,
      { correctCount: 3, incorrectCount: 2, totalQuestions: 5 },
    );
  });

  it("returns 400 for missing fields", async () => {
    const req = createJsonRequest({ attemptId: quizAttemptFixture.id });
    const response = await completeAttempt(req);

    expect(response.status).toBe(400);
  });

  it("returns 400 when attempt already completed", async () => {
    const { ZodError } = await import("zod");
    routeMocks.completeQuizAttempt.mockRejectedValue(
      new ZodError([
        { code: "custom", message: "Quiz attempt already completed", path: ["attemptId"] },
      ]),
    );

    const req = createJsonRequest({
      attemptId: quizAttemptFixture.id,
      correctCount: 3,
      incorrectCount: 2,
      totalQuestions: 5,
    });
    const response = await completeAttempt(req);

    expect(response.status).toBe(400);
  });

  it("returns 400 when attempt not owned by user", async () => {
    const { ZodError } = await import("zod");
    routeMocks.completeQuizAttempt.mockRejectedValue(
      new ZodError([
        { code: "custom", message: "Quiz attempt not found or not owned by user", path: ["attemptId"] },
      ]),
    );

    const req = createJsonRequest({
      attemptId: "other-user-attempt",
      correctCount: 3,
      incorrectCount: 2,
      totalQuestions: 5,
    });
    const response = await completeAttempt(req);

    expect(response.status).toBe(400);
  });
});
