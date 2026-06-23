import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as listArtifactsRoute } from "@/app/api/study/studio/artifacts/route";
import { GET as getArtifactDetailRoute } from "@/app/api/study/studio/artifacts/[id]/route";
import { POST as recordQuizResultRoute } from "@/app/api/study/studio/artifacts/[id]/quiz-result/route";
import { passageFixture } from "../../fixtures";
import { expectApiSuccessPayload } from "../../helpers/assertions";
import { expectJsonError } from "../../helpers/api-test-helpers";
import { userProfileFixture } from "../../fixtures/user";

const ARTIFACT_ID = "art-1";
const QUESTION_ID = "q-1";

const routeMocks = vi.hoisted(() => {
  class AuthenticationRequiredError extends Error {
    constructor() {
      super("Authentication required");
      this.name = "AuthenticationRequiredError";
    }
  }
  return {
    getUserId: vi.fn(),
    fetchStudioArtifacts: vi.fn(),
    recordQuizResult: vi.fn(),
    AuthenticationRequiredError,
  };
});

vi.mock("@/server/auth/auth-utils", () => ({
  getUserId: routeMocks.getUserId,
  AuthenticationRequiredError: routeMocks.AuthenticationRequiredError,
}));

vi.mock("@/server/modules/study/passage/studio-artifacts-service", () => ({
  fetchStudioArtifacts: routeMocks.fetchStudioArtifacts,
  recordQuizResult: routeMocks.recordQuizResult,
}));

vi.mock("@/server/db/client", () => ({
  db: {
    question: {
      findMany: vi.fn(),
    },
    studioArtifact: {
      findFirst: vi.fn(),
    },
  },
}));

import { db } from "@/server/db/client";

beforeEach(() => {
  vi.clearAllMocks();
  routeMocks.getUserId.mockResolvedValue(userProfileFixture.id);
});

describe("GET /api/study/studio/artifacts", () => {
  it("returns artifacts scoped to a passage for the authenticated user", async () => {
    const artifacts = [
      { id: ARTIFACT_ID, passageId: passageFixture.id, type: "questions" },
    ];
    routeMocks.fetchStudioArtifacts.mockResolvedValue({ artifacts });

    const request = new NextRequest(
      `https://english-reading.test/api/study/studio/artifacts?passageId=${passageFixture.id}`,
    );
    const response = await listArtifactsRoute(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expectApiSuccessPayload(payload);
    expect(payload.data.artifacts).toEqual(artifacts);
    expect(routeMocks.fetchStudioArtifacts).toHaveBeenCalledWith(
      userProfileFixture.id,
      passageFixture.id,
    );
  });

  it("rejects a missing or malformed passageId with 400", async () => {
    const request = new NextRequest("https://english-reading.test/api/study/studio/artifacts");
    const response = await listArtifactsRoute(request);
    await expectJsonError(response, 400, "Invalid passageId: must be a valid UUID.");
    expect(routeMocks.fetchStudioArtifacts).not.toHaveBeenCalled();
  });

  it("rejects a non-UUID passageId with 400", async () => {
    const request = new NextRequest(
      "https://english-reading.test/api/study/studio/artifacts?passageId=not-a-uuid",
    );
    const response = await listArtifactsRoute(request);
    await expectJsonError(response, 400, "Invalid passageId: must be a valid UUID.");
  });

  it("rejects unauthenticated requests with 401", async () => {
    routeMocks.getUserId.mockRejectedValue(new routeMocks.AuthenticationRequiredError());
    const request = new NextRequest(
      `https://english-reading.test/api/study/studio/artifacts?passageId=${passageFixture.id}`,
    );
    const response = await listArtifactsRoute(request);
    await expectJsonError(response, 401, "Authentication required.");
  });
});

describe("GET /api/study/studio/artifacts/[id]", () => {
  it("returns questions for an owned artifact", async () => {
    vi.mocked(db.question.findMany).mockResolvedValue([
      {
        id: QUESTION_ID,
        questionText: "What happened?",
        options: [{ id: "a", text: "Yes" }, { id: "b", text: "No" }],
        correctOption: "a",
        sourceText: "Source.",
        sourceLine: 1,
        explanation: null,
        questionType: "COMPREHENSION",
        difficulty: "MEDIUM",
      },
    ] as never);

    const response = await getArtifactDetailRoute(new Request("https://english-reading.test/"), {
      params: Promise.resolve({ id: ARTIFACT_ID }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.questions).toHaveLength(1);
    expect(payload.data.questions[0].id).toBe(QUESTION_ID);
    expect(db.question.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ artifactId: ARTIFACT_ID }),
      }),
    );
  });

  it("scopes questions through the parent artifact's owner", async () => {
    vi.mocked(db.question.findMany).mockResolvedValue([] as never);
    vi.mocked(db.studioArtifact.findFirst).mockResolvedValue({
      id: ARTIFACT_ID,
      userId: userProfileFixture.id,
    } as never);

    const response = await getArtifactDetailRoute(new Request("https://english-reading.test/"), {
      params: Promise.resolve({ id: ARTIFACT_ID }),
    });

    expect(response.status).toBe(200);
    const whereArg = vi.mocked(db.question.findMany).mock.calls[0]?.[0]?.where as Record<string, unknown>;
    expect(whereArg).toMatchObject({
      artifactId: ARTIFACT_ID,
      artifact: { userId: userProfileFixture.id },
    });
  });

  it("returns 404 when artifact is not owned by user", async () => {
    vi.mocked(db.question.findMany).mockResolvedValue([] as never);
    vi.mocked(db.studioArtifact.findFirst).mockResolvedValue(null as never);

    const response = await getArtifactDetailRoute(new Request("https://english-reading.test/"), {
      params: Promise.resolve({ id: ARTIFACT_ID }),
    });
    await expectJsonError(response, 404, "Artifact not found");
  });

  it("rejects unauthenticated requests with 401", async () => {
    routeMocks.getUserId.mockRejectedValue(new routeMocks.AuthenticationRequiredError());
    const response = await getArtifactDetailRoute(new Request("https://english-reading.test/"), {
      params: Promise.resolve({ id: ARTIFACT_ID }),
    });
    await expectJsonError(response, 401, "Authentication required");
  });
});

describe("POST /api/study/studio/artifacts/[id]/quiz-result", () => {
  it("records a quiz result with valid counts", async () => {
    routeMocks.recordQuizResult.mockResolvedValue(undefined);

    const response = await recordQuizResultRoute(
      new Request("https://english-reading.test/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ correctCount: 4, totalQuestions: 5 }),
      }),
      { params: Promise.resolve({ id: ARTIFACT_ID }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ success: true });
    expect(routeMocks.recordQuizResult).toHaveBeenCalledWith(
      ARTIFACT_ID,
      userProfileFixture.id,
      { correctCount: 4, totalQuestions: 5 },
    );
  });

  it("rejects negative correctCount with 400", async () => {
    const response = await recordQuizResultRoute(
      new Request("https://english-reading.test/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ correctCount: -1, totalQuestions: 5 }),
      }),
      { params: Promise.resolve({ id: ARTIFACT_ID }) },
    );
    await expectJsonError(response, 400, "Too small: expected number to be >=0");
    expect(routeMocks.recordQuizResult).not.toHaveBeenCalled();
  });

  it("rejects correctCount exceeding totalQuestions with 400", async () => {
    const response = await recordQuizResultRoute(
      new Request("https://english-reading.test/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ correctCount: 6, totalQuestions: 5 }),
      }),
      { params: Promise.resolve({ id: ARTIFACT_ID }) },
    );
    await expectJsonError(response, 400, "correctCount cannot exceed totalQuestions");
    expect(routeMocks.recordQuizResult).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated requests with 401", async () => {
    routeMocks.getUserId.mockRejectedValue(new routeMocks.AuthenticationRequiredError());
    const response = await recordQuizResultRoute(
      new Request("https://english-reading.test/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ correctCount: 4, totalQuestions: 5 }),
      }),
      { params: Promise.resolve({ id: ARTIFACT_ID }) },
    );
    await expectJsonError(response, 401, "Authentication required");
  });
});
