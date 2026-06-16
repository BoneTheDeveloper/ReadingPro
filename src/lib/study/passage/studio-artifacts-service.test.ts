import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db/client";
import { GENERATING_ARTIFACT_ORPHAN_TIMEOUT_MS } from "@/lib/study/shared/studio-artifact-types";
import { fetchStudioArtifacts, recordQuizResult, resetQuizResult } from "./studio-artifacts-service";

const NOW = new Date("2026-06-16T12:00:00.000Z");

function artifactRow(overrides: Partial<{
  id: string;
  type: string;
  passageId: string;
  title: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}> = {}) {
  return {
    id: "artifact-1",
    type: "quiz",
    passageId: "passage-1",
    title: "Quiz",
    status: "done",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

describe("studio-artifacts-service", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("fetchStudioArtifacts orphan reconciliation", () => {
    beforeEach(() => {
      vi.mocked(db.studioArtifact.updateMany).mockResolvedValue({ count: 1 } as never);
    });

    it("reconciles a stale generating row to failed and returns it as failed", async () => {
      const staleUpdatedAt = new Date(NOW.getTime() - GENERATING_ARTIFACT_ORPHAN_TIMEOUT_MS - 1_000);
      vi.mocked(db.studioArtifact.findMany).mockResolvedValue([
        artifactRow({ id: "orphan-1", status: "generating", createdAt: staleUpdatedAt, updatedAt: staleUpdatedAt }),
      ] as never);

      const { artifacts } = await fetchStudioArtifacts("user-1", "passage-1");

      expect(artifacts[0].status).toBe("failed");
      expect(db.studioArtifact.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["orphan-1"] }, userId: "user-1", status: "generating" },
        data: { status: "failed" },
      });
    });

    it("leaves a recent generating row untouched", async () => {
      const freshUpdatedAt = new Date(NOW.getTime() - 10_000);
      vi.mocked(db.studioArtifact.findMany).mockResolvedValue([
        artifactRow({ id: "live-1", status: "generating", createdAt: freshUpdatedAt, updatedAt: freshUpdatedAt }),
      ] as never);

      const { artifacts } = await fetchStudioArtifacts("user-1", "passage-1");

      expect(artifacts[0].status).toBe("generating");
      expect(db.studioArtifact.updateMany).not.toHaveBeenCalled();
    });

    it("does not write when there are no orphaned rows", async () => {
      vi.mocked(db.studioArtifact.findMany).mockResolvedValue([
        artifactRow({ id: "done-1", status: "done" }),
      ] as never);

      const { artifacts } = await fetchStudioArtifacts("user-1", "passage-1");

      expect(artifacts[0].status).toBe("done");
      expect(db.studioArtifact.updateMany).not.toHaveBeenCalled();
    });
  });

  describe("recordQuizResult", () => {
    it("upserts a QuizResult row and computes accuracy", async () => {
      vi.mocked(db.studioArtifact.findUnique).mockResolvedValue({ id: "artifact-1" } as never);
      vi.mocked(db.quizResult.upsert).mockResolvedValue({} as never);

      await recordQuizResult("artifact-1", "user-1", { correctCount: 8, totalQuestions: 10 });

      expect(db.quizResult.upsert).toHaveBeenCalledWith({
        where: { artifactId: "artifact-1" },
        create: {
          artifactId: "artifact-1",
          correctCount: 8,
          totalQuestions: 10,
          accuracyRate: 0.8,
        },
        update: {
          correctCount: 8,
          totalQuestions: 10,
          accuracyRate: 0.8,
          completedAt: NOW,
        },
      });
    });

    it("throws when artifact ownership check fails", async () => {
      vi.mocked(db.studioArtifact.findUnique).mockResolvedValue(null as never);

      await expect(recordQuizResult("artifact-1", "user-1", { correctCount: 5, totalQuestions: 5 }))
        .rejects.toThrow("Artifact not found or access denied");
    });
  });

  describe("resetQuizResult", () => {
    it("deletes the QuizResult row", async () => {
      vi.mocked(db.studioArtifact.findUnique).mockResolvedValue({ id: "artifact-1" } as never);
      vi.mocked(db.quizResult.deleteMany).mockResolvedValue({ count: 1 } as never);

      await resetQuizResult("artifact-1", "user-1");

      expect(db.quizResult.deleteMany).toHaveBeenCalledWith({
        where: { artifactId: "artifact-1" },
      });
    });

    it("throws when artifact ownership check fails", async () => {
      vi.mocked(db.studioArtifact.findUnique).mockResolvedValue(null as never);

      await expect(resetQuizResult("artifact-1", "user-1"))
        .rejects.toThrow("Artifact not found or access denied");
    });
  });
});
