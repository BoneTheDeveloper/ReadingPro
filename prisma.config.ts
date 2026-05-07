import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: ".env.local" });

function buildUrl(
  user: string | undefined,
  password: string | undefined,
  host: string | undefined,
  port: string | undefined,
  name: string | undefined
): string {
  if (!user || !password || !host) {
    throw new Error("Missing DB connection env vars (DB_USER, DB_PASSWORD, DB_HOST)");
  }
  return `postgresql://${user}:${password}@${host}:${port || '5432'}/${name || 'postgres'}`;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: buildUrl(
      process.env.DIRECT_DB_USER,
      process.env.DIRECT_DB_PASSWORD,
      process.env.DIRECT_DB_HOST,
      process.env.DIRECT_DB_PORT,
      process.env.DIRECT_DB_NAME
    ),
  },
});
