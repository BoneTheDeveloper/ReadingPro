import 'server-only';
import { AsyncLocalStorage } from "node:async_hooks";

export interface PrismaQueryMetrics {
  queryCount: number;
  totalDurationMs: number;
  steps: Record<string, PrismaQueryStepMetrics>;
}

export interface PrismaQueryStepMetrics {
  queries: number;
  ms: number;
}

interface PrismaQueryMetricsStore {
  queryCount: number;
  totalDurationMs: number;
  currentStep: string | null;
  steps: Map<string, PrismaQueryStepMetrics>;
}

const storage = new AsyncLocalStorage<PrismaQueryMetricsStore>();

export function runWithPrismaQueryMetrics<T>(fn: () => T): T {
  return storage.run(
    {
      queryCount: 0,
      totalDurationMs: 0,
      currentStep: null,
      steps: new Map(),
    },
    fn,
  );
}

export async function runWithPrismaQueryStep<T>(step: string, fn: () => Promise<T>): Promise<T> {
  const store = storage.getStore();
  if (!store) return fn();

  const previousStep = store.currentStep;
  store.currentStep = step;

  try {
    return await fn();
  } finally {
    store.currentStep = previousStep;
  }
}

export function recordPrismaQueryDuration(durationMs: number) {
  const store = storage.getStore();
  if (!store) return;

  store.queryCount += 1;
  store.totalDurationMs += durationMs;

  if (!store.currentStep) return;

  const step = store.steps.get(store.currentStep) ?? {
    queries: 0,
    ms: 0,
  };
  step.queries += 1;
  step.ms += durationMs;
  store.steps.set(store.currentStep, step);
}

export function getPrismaQueryMetrics(): PrismaQueryMetrics | null {
  const store = storage.getStore();
  if (!store) return null;

  return {
    queryCount: store.queryCount,
    totalDurationMs: roundMetric(store.totalDurationMs),
    steps: Object.fromEntries(
      Array.from(store.steps.entries()).map(([step, metrics]) => [
        step,
        {
          queries: metrics.queries,
          ms: roundMetric(metrics.ms),
        },
      ]),
    ),
  };
}

function roundMetric(value: number) {
  return Math.round(value * 100) / 100;
}
