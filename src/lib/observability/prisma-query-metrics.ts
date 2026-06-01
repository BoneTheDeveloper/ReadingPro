import { AsyncLocalStorage } from "node:async_hooks";

export interface PrismaQueryMetrics {
  queryCount: number;
  totalDurationMs: number;
}

const storage = new AsyncLocalStorage<PrismaQueryMetrics>();

export function runWithPrismaQueryMetrics<T>(fn: () => T): T {
  return storage.run(
    {
      queryCount: 0,
      totalDurationMs: 0,
    },
    fn,
  );
}

export function recordPrismaQueryDuration(durationMs: number) {
  const store = storage.getStore();
  if (!store) return;

  store.queryCount += 1;
  store.totalDurationMs += durationMs;
}

export function getPrismaQueryMetrics(): PrismaQueryMetrics | null {
  const store = storage.getStore();
  if (!store) return null;

  return {
    queryCount: store.queryCount,
    totalDurationMs: roundMetric(store.totalDurationMs),
  };
}

function roundMetric(value: number) {
  return Math.round(value * 100) / 100;
}
