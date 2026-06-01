import type { PrismaQueryMetrics } from "@/lib/observability/prisma-query-metrics";

export const DICTIONARY_PERFORMANCE_HEADER = "x-dictionary-perf-metrics";

export interface DictionaryPerformanceSnapshot {
  queryLength: number;
  normalizedQueryLength: number;
  phase: "suggest" | "search" | "lookup";
  timings: {
    totalMs: number;
    steps: Record<string, number>;
  };
  prisma: PrismaQueryMetrics;
}

export function shouldIncludeDictionaryPerformanceMetrics(headers: Headers) {
  const value = headers.get(DICTIONARY_PERFORMANCE_HEADER);
  return value === "1" || value === "true";
}

export function createDictionaryPerformanceTracker(input: {
  query: string;
  normalizedQuery: string;
  phase: DictionaryPerformanceSnapshot["phase"];
  startedAt?: number;
}) {
  return new DictionaryPerformanceTracker(input);
}

class DictionaryPerformanceTracker {
  private readonly startedAt: number;
  private readonly queryLength: number;
  private readonly normalizedQueryLength: number;
  private readonly phase: DictionaryPerformanceSnapshot["phase"];
  private readonly steps = new Map<string, number>();

  constructor(input: {
    query: string;
    normalizedQuery: string;
    phase: DictionaryPerformanceSnapshot["phase"];
    startedAt?: number;
  }) {
    this.startedAt = input.startedAt ?? performance.now();
    this.queryLength = input.query.length;
    this.normalizedQueryLength = input.normalizedQuery.length;
    this.phase = input.phase;
  }

  async measure<T>(step: string, callback: () => Promise<T>): Promise<T> {
    const stepStartedAt = performance.now();
    try {
      return await callback();
    } finally {
      this.steps.set(step, roundMetric((this.steps.get(step) ?? 0) + performance.now() - stepStartedAt));
    }
  }

  snapshot(prisma: PrismaQueryMetrics): DictionaryPerformanceSnapshot {
    return {
      queryLength: this.queryLength,
      normalizedQueryLength: this.normalizedQueryLength,
      phase: this.phase,
      timings: {
        totalMs: roundMetric(performance.now() - this.startedAt),
        steps: Object.fromEntries(this.steps.entries()),
      },
      prisma,
    };
  }
}

function roundMetric(value: number) {
  return Math.round(value * 100) / 100;
}
