import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db/client";
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

  describe("fetchStudioArtifacts", () => {
    it("returns done artifacts without mutating the DB", async () => {
      vi.mocked(db.studioArtifact.findMany).mockResolvedValue([
        artifactRow({ id: "done-1", status: "done" }),
      ] as never);

      const { artifacts } = await fetchStudioArtifacts("user-1", "passage-1");

      expect(artifacts.map((a) => a.id)).toEqual(["done-1"]);
      expect(db.studioArtifact.deleteMany).not.toHaveBeenCalled();
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
