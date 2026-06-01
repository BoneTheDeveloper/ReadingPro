import { describe, expect, it, vi } from "vitest";
import {
  aggregateScenarioSamples,
  calculateRoundTripStats,
  reportLatencyBudgetFailures,
  type BenchmarkScenarioReport,
} from "../../../performance/benchmark-utils";

describe("performance benchmark utilities", () => {
  it("calculates median and p95 from sorted copies of raw samples", () => {
    const samples = [40, 10, 50, 20, 30];

    expect(calculateRoundTripStats(samples)).toEqual({
      samples,
      min: 10,
      median: 30,
      p95: 50,
      max: 50,
    });
  });

  it("aggregates sampled scenario reports with max query count and latency budget failures", () => {
    const reports: BenchmarkScenarioReport[] = [
      sampleReport({ roundTripMs: 100, queryCount: 2 }),
      sampleReport({ roundTripMs: 240, queryCount: 4 }),
      sampleReport({ roundTripMs: 180, queryCount: 3 }),
    ];

    const aggregate = aggregateScenarioSamples(reports);

    expect(aggregate.roundTripMs).toBe(180);
    expect(aggregate.samples).toBe(3);
    expect(aggregate.performance.prisma.queryCount).toBe(4);
    expect(aggregate.queryPassed).toBe(true);
    expect(aggregate.latencyPassed).toBe(false);
    expect(aggregate.latencyFailures).toEqual([
      {
        scenario: "lookup-exact-headword",
        metric: "p95RoundTripMs",
        gate: "soft",
        actual: 240,
        max: 200,
      },
    ]);
  });

  it("keeps soft latency budgets warning-only and reserves throws for hard gates", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    expect(() => reportLatencyBudgetFailures("suite", [
      {
        scenario: "scenario",
        metric: "medianRoundTripMs",
        gate: "soft",
        actual: 150,
        max: 100,
      },
    ])).not.toThrow();

    expect(() => reportLatencyBudgetFailures("suite", [
      {
        scenario: "scenario",
        metric: "medianRoundTripMs",
        gate: "hard",
        actual: 150,
        max: 100,
      },
    ])).toThrow("suite hard latency budget failure");

    warn.mockRestore();
  });
});

function sampleReport(input: {
  roundTripMs: number;
  queryCount: number;
}): BenchmarkScenarioReport {
  return {
    scenario: "lookup-exact-headword",
    roundTripMs: input.roundTripMs,
    performance: {
      prisma: {
        queryCount: input.queryCount,
      },
    },
    queryBudget: {
      maxQueries: 4,
      gate: "hard",
    },
    queryPassed: input.queryCount <= 4,
    latencyBudget: {
      medianRoundTripMs: 200,
      p95RoundTripMs: 200,
      gate: "soft",
    },
  };
}
