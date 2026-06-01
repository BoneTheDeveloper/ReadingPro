import { describe, expect, it } from "vitest";
import {
  getPrismaQueryMetrics,
  recordPrismaQueryDuration,
  runWithPrismaQueryMetrics,
  runWithPrismaQueryStep,
} from "./prisma-query-metrics";

describe("prisma query metrics", () => {
  it("records aggregate and per-step query metrics", async () => {
    const metrics = await runWithPrismaQueryMetrics(async () => {
      recordPrismaQueryDuration(10);

      await runWithPrismaQueryStep("sourceFetch", async () => {
        recordPrismaQueryDuration(5);
        recordPrismaQueryDuration(7);
      });

      await runWithPrismaQueryStep("cacheRead", async () => {
        recordPrismaQueryDuration(3.5);
      });

      return getPrismaQueryMetrics();
    });

    expect(metrics).toEqual({
      queryCount: 4,
      totalDurationMs: 25.5,
      steps: {
        sourceFetch: {
          queries: 2,
          ms: 12,
        },
        cacheRead: {
          queries: 1,
          ms: 3.5,
        },
      },
    });
  });
});
