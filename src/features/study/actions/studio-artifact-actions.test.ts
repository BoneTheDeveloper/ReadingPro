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

vi.mock("@/features/study/actions/study-shared", () => studyShared);
vi.mock("@/lib/study/passage/studio-artifacts-service", () => artifactsService);

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
