import { describe, expect, it, vi } from "vitest";
import {
  aggregateScenarioSamples,
  benchmarkReportMarkdownPath,
  calculateRoundTripStats,
  reportLatencyBudgetFailures,
  renderPerformanceReportMarkdown,
  type BenchmarkScenarioReport,
} from "../../../performance/benchmark-utils";

describe("performance benchmark utilities", () => {
  it("calculates median and p95 from sorted copies of raw samples", () => {
    const samples = [40, 10, 50, 20, 30];

    expect(calculateRoundTripStats(samples)).toEqual({
      samples,
      min: 10,
      median: 30,
      p95: 48,
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
        actual: 234,
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

  it("renders benchmark reports as readable Markdown", () => {
    const markdown = renderPerformanceReportMarkdown({
      title: "Dictionary Flow",
      generatedAt: "2026-06-02T04:00:00.000Z",
      reports: [
        {
          ...sampleReport({ roundTripMs: 240, queryCount: 5 }),
          samples: 3,
          queryPassed: false,
          roundTripStats: {
            samples: [120, 180, 240],
            min: 120,
            median: 180,
            p95: 240,
            max: 240,
          },
          latencyPassed: false,
          latencyFailures: [
            {
              scenario: "lookup-exact-headword",
              metric: "p95RoundTripMs",
              gate: "soft",
              actual: 240,
              max: 200,
            },
          ],
          performance: {
            prisma: {
              queryCount: 5,
              totalDurationMs: 12.5,
              steps: {
                "lookupResolve.alias": { queries: 2, ms: 7.25 },
              },
            },
            timings: {
              totalMs: 240,
              steps: {
                auth: 4.5,
              },
            },
          },
        },
      ],
    });

    expect(markdown).toContain("# Dictionary Flow Performance Report");
    expect(markdown).toContain("| lookup-exact-headword | 3 | 180ms | 240ms | 240ms | 5 | fail <= 4 hard | fail median <= 200ms, p95 <= 200ms soft | review |");
    expect(markdown).toContain("- [HARD] lookup-exact-headword: 5 Prisma queries, budget <= 4.");
    expect(markdown).toContain("- [SOFT] lookup-exact-headword: p95RoundTripMs 240ms, budget <= 200ms.");
    expect(markdown).toContain("| lookupResolve.alias | 2 | 7.25ms |");
    expect(markdown).toContain("| auth | 4.5ms |");
  });

  it("derives Markdown report paths from JSON report paths", () => {
    expect(benchmarkReportMarkdownPath("test-results/performance/translate-flow.json"))
      .toBe("test-results/performance/translate-flow.md");
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
