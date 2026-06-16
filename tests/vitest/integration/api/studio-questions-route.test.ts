import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as generateQuestionsRoute } from "@/app/api/studio-questions/route";
import {
  generatedStudyQuestionsSuccessResponseSchema,
} from "@/lib/study/shared/study-response-schema";
import { apiErrorResponseSchema } from "@/lib/api/shared/api-response-schema";
import { generatedQuestionsFixture, passageFixture, userProfileFixture } from "../../fixtures";
import type { StudioArtifact } from "@/lib/study/shared/studio-artifact-types";
import { createJsonRequest, parseJsonResponse } from "../../helpers/api";
import { expectApiErrorPayload, expectApiSuccessPayload } from "../../helpers/assertions";

const routeMocks = vi.hoisted(() => {
  class AuthenticationRequiredError extends Error {
    constructor() {
      super("Authentication required");
      this.name = "AuthenticationRequiredError";
    }
  }

  class PassageStudyServiceError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "PassageStudyServiceError";
    }
  }

  return {
    getAuthenticatedUser: vi.fn(),
    generateQuestionsForPassage: vi.fn(),
    AuthenticationRequiredError,
    PassageStudyServiceError,
  };
});

vi.mock("@/lib/auth/auth-utils", () => ({
  getAuthenticatedUser: routeMocks.getAuthenticatedUser,
  AuthenticationRequiredError: routeMocks.AuthenticationRequiredError,
}));

vi.mock("@/lib/study/passage/passage-study.service", () => ({
  generateQuestionsForPassage: routeMocks.generateQuestionsForPassage,
  PassageStudyServiceError: routeMocks.PassageStudyServiceError,
}));

const ARTIFACT_ID = "11111111-1111-1111-1111-111111111111";

const generatedQuestion = {
  id: "pending-0",
  number: 1,
  questionText: generatedQuestionsFixture[0].questionText,
  options: generatedQuestionsFixture[0].options,
  correctAnswer: generatedQuestionsFixture[0].correctAnswer,
  explanation: generatedQuestionsFixture[0].explanation,
  sourceText: generatedQuestionsFixture[0].sourceText,
  sourceLine: generatedQuestionsFixture[0].sourceLine,
  questionType: generatedQuestionsFixture[0].questionType,
  difficulty: generatedQuestionsFixture[0].difficulty,
};

const generatedArtifact: StudioArtifact = {
  id: ARTIFACT_ID,
  type: "quiz",
  passageId: passageFixture.id,
  title: passageFixture.title,
  status: "done",
  createdAt: "2026-06-16T12:00:00.000Z",
  updatedAt: "2026-06-16T12:00:00.000Z",
};

async function expectJsonError(response: Response, status: number, message: string) {
  expect(response.status).toBe(status);
  expectApiErrorPayload(await parseJsonResponse(response, apiErrorResponseSchema), message);
}

beforeEach(() => {
  vi.clearAllMocks();
  routeMocks.getAuthenticatedUser.mockResolvedValue(userProfileFixture);
});

describe("POST /api/studio-questions", () => {
  it("generates questions for the authenticated user's passage", async () => {
    routeMocks.generateQuestionsForPassage.mockResolvedValue({ artifact: generatedArtifact, questions: [generatedQuestion] });

    const response = await generateQuestionsRoute(
      createJsonRequest({
        passageId: passageFixture.id,
        artifactId: ARTIFACT_ID,
      }),
    );
    const payload = await parseJsonResponse(response, generatedStudyQuestionsSuccessResponseSchema);

    expect(response.status).toBe(200);
    expectApiSuccessPayload(payload);
    expect(payload).toEqual({
      success: true,
      data: {
        artifact: expect.objectContaining({ id: ARTIFACT_ID, status: "done" }),
        questions: [generatedQuestion],
      },
    });
    expect(routeMocks.generateQuestionsForPassage).toHaveBeenCalledWith(
      userProfileFixture.id,
      passageFixture.id,
      ARTIFACT_ID,
    );
  });

  it("rejects malformed and invalid bodies before generation", async () => {
    await expectJsonError(
      await generateQuestionsRoute(
        new NextRequest("https://english-reading.test/api/studio-questions", {
          method: "POST",
          body: "{",
        }),
      ),
      400,
      "Invalid JSON payload.",
    );

    const response = await generateQuestionsRoute(
      createJsonRequest({
        passageId: "not-a-uuid",
        artifactId: ARTIFACT_ID,
      }),
    );

    expect(response.status).toBe(400);
    expectApiErrorPayload(
      await parseJsonResponse(response, apiErrorResponseSchema),
      "Invalid UUID",
    );
    expect(routeMocks.generateQuestionsForPassage).not.toHaveBeenCalled();
  });

  it("returns stable auth and missing-passage errors", async () => {
    routeMocks.getAuthenticatedUser.mockRejectedValueOnce(new routeMocks.AuthenticationRequiredError());
    await expectJsonError(
      await generateQuestionsRoute(
        createJsonRequest({
          passageId: passageFixture.id,
          artifactId: ARTIFACT_ID,
        }),
      ),
      401,
      "Authentication required.",
    );

    routeMocks.generateQuestionsForPassage.mockRejectedValueOnce(
      new routeMocks.PassageStudyServiceError("Passage not found"),
    );
    await expectJsonError(
      await generateQuestionsRoute(
        createJsonRequest({
          passageId: passageFixture.id,
          artifactId: ARTIFACT_ID,
        }),
      ),
      404,
      "Passage not found.",
    );
  });

  it("maps service generation failures without capturing expected errors", async () => {
    routeMocks.generateQuestionsForPassage.mockRejectedValueOnce(
      new routeMocks.PassageStudyServiceError("No questions generated — try again"),
    );

    await expectJsonError(
      await generateQuestionsRoute(
        createJsonRequest({
          passageId: passageFixture.id,
          artifactId: ARTIFACT_ID,
        }),
      ),
      502,
      "No questions generated — try again",
    );
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("captures unexpected generation failures", async () => {
    const error = new Error("provider down");
    routeMocks.generateQuestionsForPassage.mockRejectedValueOnce(error);

    await expectJsonError(
      await generateQuestionsRoute(
        createJsonRequest({
          passageId: passageFixture.id,
          artifactId: ARTIFACT_ID,
        }),
      ),
      500,
      "Question generation failed — try again",
    );
    expect(Sentry.captureException).toHaveBeenCalledWith(error, {
      tags: { route: "api:studio-questions", method: "POST" },
    });
  });
});
