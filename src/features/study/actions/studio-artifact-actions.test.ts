import { beforeEach, describe, expect, it, vi } from "vitest";

const studyShared = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
}));

const artifactsService = vi.hoisted(() => ({
  createStudioArtifact: vi.fn(),
  completeStudioArtifact: vi.fn(),
  deleteStudioArtifact: vi.fn(),
  recordQuizResult: vi.fn(),
  resetQuizResult: vi.fn(),
}));

const dbClient = vi.hoisted(() => ({
  db: { question: { findMany: vi.fn() } },
}));

vi.mock("@/features/study/actions/study-shared", () => studyShared);
vi.mock("@/lib/study/passage/studio-artifacts-service", () => artifactsService);
vi.mock("@/lib/db/client", () => dbClient);

describe("studio-artifact actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    studyShared.getAuthenticatedUser.mockResolvedValue({ id: "user-1" });
  });

  describe("studioRecordQuizResultAction", () => {
    it("rejects invalid counts without touching persistence", async () => {
      const { studioRecordQuizResultAction } = await import("./studio-artifact-actions");

      const tooMany = await studioRecordQuizResultAction({ artifactId: "a1", correctCount: 6, totalQuestions: 5 });
      const zeroTotal = await studioRecordQuizResultAction({ artifactId: "a1", correctCount: 0, totalQuestions: 0 });
      const negative = await studioRecordQuizResultAction({ artifactId: "a1", correctCount: -1, totalQuestions: 5 });

      expect(tooMany).toEqual({ error: "Invalid quiz result data" });
      expect(zeroTotal).toEqual({ error: "Invalid quiz result data" });
      expect(negative).toEqual({ error: "Invalid quiz result data" });
      expect(artifactsService.recordQuizResult).not.toHaveBeenCalled();
    });

    it("persists a valid result via the service", async () => {
      artifactsService.recordQuizResult.mockResolvedValue(undefined);
      const { studioRecordQuizResultAction } = await import("./studio-artifact-actions");

      const result = await studioRecordQuizResultAction({ artifactId: "a1", correctCount: 4, totalQuestions: 5 });

      expect(result).toEqual({ ok: true });
      expect(artifactsService.recordQuizResult).toHaveBeenCalledWith("a1", "user-1", {
        correctCount: 4,
        totalQuestions: 5,
      });
    });

    it("returns an error result when the service throws", async () => {
      artifactsService.recordQuizResult.mockRejectedValue(new Error("Artifact not found or access denied"));
      const { studioRecordQuizResultAction } = await import("./studio-artifact-actions");

      const result = await studioRecordQuizResultAction({ artifactId: "a1", correctCount: 4, totalQuestions: 5 });

      expect(result).toEqual({ error: "Failed to record quiz result" });
    });
  });

  describe("studioLoadArtifactDetailAction", () => {
    const baseRow = {
      id: "q1",
      questionText: "Q?",
      correctOption: "a",
      sourceText: "src",
      sourceLine: 1,
      explanation: "because",
      questionType: "MULTIPLE_CHOICE",
      difficulty: 3,
    };
    const optionsArray = [
      { id: "a", text: "A" },
      { id: "b", text: "B" },
    ];

    it("scopes the question query to the authenticated owner", async () => {
      dbClient.db.question.findMany.mockResolvedValue([]);
      const { studioLoadArtifactDetailAction } = await import("./studio-artifact-actions");

      await studioLoadArtifactDetailAction({ artifactId: "art-1", type: "quiz", passageId: "p1" });

      expect(dbClient.db.question.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { artifactId: "art-1", artifact: { userId: "user-1" } },
        }),
      );
    });

    it("returns options as an array when stored natively", async () => {
      dbClient.db.question.findMany.mockResolvedValue([{ ...baseRow, options: optionsArray }]);
      const { studioLoadArtifactDetailAction } = await import("./studio-artifact-actions");

      const result = await studioLoadArtifactDetailAction({ artifactId: "art-1", type: "quiz", passageId: "p1" });

      expect("questions" in result && result.questions?.[0].options).toEqual(optionsArray);
    });

    it("parses legacy stringified options back into an array", async () => {
      dbClient.db.question.findMany.mockResolvedValue([{ ...baseRow, options: JSON.stringify(optionsArray) }]);
      const { studioLoadArtifactDetailAction } = await import("./studio-artifact-actions");

      const result = await studioLoadArtifactDetailAction({ artifactId: "art-1", type: "quiz", passageId: "p1" });

      expect("questions" in result && result.questions?.[0].options).toEqual(optionsArray);
    });
  });

  describe("studioDeleteArtifactAction", () => {
    it("deletes the artifact for the authenticated user", async () => {
      artifactsService.deleteStudioArtifact.mockResolvedValue(undefined);
      const { studioDeleteArtifactAction } = await import("./studio-artifact-actions");

      const result = await studioDeleteArtifactAction({ artifactId: "a1" });

      expect(result).toEqual({ ok: true });
      expect(artifactsService.deleteStudioArtifact).toHaveBeenCalledWith("a1", "user-1");
    });
  });
});
