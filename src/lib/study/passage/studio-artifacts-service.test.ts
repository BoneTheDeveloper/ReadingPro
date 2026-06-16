import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db/client";
import { GENERATING_ARTIFACT_ORPHAN_TIMEOUT_MS } from "@/lib/study/shared/studio-artifact-types";
import { fetchStudioArtifacts } from "./studio-artifacts-service";

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

describe("fetchStudioArtifacts orphan reconciliation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.mocked(db.studioArtifact.updateMany).mockResolvedValue({ count: 1 } as never);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
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
