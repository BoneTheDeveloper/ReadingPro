import { createPrismaClient, type AppPrismaClient, type QueryMetricsPrismaClient } from './create-prisma-client';
import { recordPrismaQueryDuration } from '@/lib/observability/prisma-query-metrics';

const globalForPrisma = globalThis as unknown as {
  prisma: AppPrismaClient | QueryMetricsPrismaClient | undefined;
};

// PRISMA_QUERY_METRICS is enabled only by performance benchmark runners to
// collect per-request query counts. Keep it unset for normal app runtime.
const queryMetricsEnabled = process.env.PRISMA_QUERY_METRICS === '1';

export const db = globalForPrisma.prisma ?? createPrismaClient({
  queryMetrics: queryMetricsEnabled,
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}

if (queryMetricsEnabled) {
  (db as QueryMetricsPrismaClient).$on('query', (event) => {
    recordPrismaQueryDuration(event.duration);
  });
}
