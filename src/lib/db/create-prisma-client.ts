import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

export type AppPrismaClient = PrismaClient;
export type QueryMetricsPrismaClient = PrismaClient<"query">;

export function createPrismaClient(options?: {
  queryMetrics?: boolean;
}): AppPrismaClient | QueryMetricsPrismaClient {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });

  if (!options?.queryMetrics) {
    return new PrismaClient({ adapter });
  }

  return new PrismaClient({
    adapter,
    log: [{ emit: "event", level: "query" }],
  }) as QueryMetricsPrismaClient;
}
