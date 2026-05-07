import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { config } from 'dotenv';
config({ path: '.env.local' });

function buildUrl(
  user: string | undefined,
  password: string | undefined,
  host: string | undefined,
  port: string | undefined,
  name: string | undefined
): string {
  if (!user || !password || !host) {
    throw new Error('Missing DB connection env vars (DB_USER, DB_PASSWORD, DB_HOST)');
  }
  return `postgresql://${user}:${password}@${host}:${port || '5432'}/${name || 'postgres'}`;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const pool = new Pool({
    connectionString: buildUrl(
      process.env.DB_USER,
      process.env.DB_PASSWORD,
      process.env.DB_HOST,
      process.env.DB_PORT,
      process.env.DB_NAME
    ),
    max: 10,
    idleTimeoutMillis: 20000,
    connectionTimeoutMillis: 10000,
  });

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}
