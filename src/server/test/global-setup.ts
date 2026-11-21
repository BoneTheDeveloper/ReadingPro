// Runs once before the suite: refuses a non-local database, checks that Flyway
// has applied V1, and removes test users left behind by an interrupted run.
import pg from "pg";
import { resolveDatabaseUrl } from "../lib/database-url";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

export default async function setup() {
  const url = resolveDatabaseUrl();
  if (!url) throw new Error("No database configured: set the POSTGRES_* variables in .env, then run pnpm db:up.");

  const host = new URL(url).hostname;
  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(
      `Tests only run against a local database; the configured database is on "${host}".`,
    );
  }

  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    const history = await client.query<{ applied: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM "flyway_schema_history" WHERE "version" = '1' AND "success"
       ) AS "applied"`,
    ).catch(() => null);
    if (!history?.rows[0]?.applied) {
      throw new Error("The database has no Flyway V1. Run pnpm db:up first.");
    }
    await client.query(`DELETE FROM "User" WHERE "email" LIKE '%@test.invalid'`);
  } finally {
    await client.end();
  }
}
