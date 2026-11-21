// Runs once before the suite: refuses a non-local database, checks that Flyway
// has applied V1, and removes test users left behind by an interrupted run.
import pg from "pg";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

export default async function setup() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Run pnpm db:up && pnpm db:migrate first.");

  const host = new URL(url).hostname;
  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(
      `Tests only run against a local database; DATABASE_URL points at "${host}".`,
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
      throw new Error("The database has no Flyway V1. Run pnpm db:up && pnpm db:migrate first.");
    }
    await client.query(`DELETE FROM "User" WHERE "email" LIKE '%@test.invalid'`);
  } finally {
    await client.end();
  }
}
