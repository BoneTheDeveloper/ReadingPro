import 'server-only';
import { createPrismaClient, type AppPrismaClient } from './create-prisma-client';

const globalForPrisma = globalThis as unknown as {
  prisma: AppPrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}
