// The single database entry point: one pg pool, shared by repositories and
// Better Auth.
//
// Rules for repository authors:
// - SQL lives only in `*-repository.ts`. Repositories return rows, `null` or a
//   boolean and never throw `AppError`; services decide what "missing" means.
// - Always list columns explicitly; never `SELECT *`.
// - Pass values only as `$n` parameters, never by string interpolation.
// - Send `jsonb` as `JSON.stringify(value)` with `$n::jsonb`. pg would send a
//   JS array as a Postgres array otherwise.
// - Cast every `COUNT(*)` with `::int`; pg reads `bigint` as a string.
// - Set `"updatedAt" = now()` on every UPDATE of a table that has the column.
// - Take `db: Queryable = pool` as the last parameter so services can pass a
//   transaction client from `withTransaction`.
import pg from "pg";

const globalForDb = globalThis as unknown as { pool?: pg.Pool };

export const pool =
  globalForDb.pool ?? new pg.Pool({ connectionString: process.env.DATABASE_URL });

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

/** Anything that can run a query: the pool or a transaction client. */
export type Queryable = Pick<pg.Pool, "query"> | Pick<pg.PoolClient, "query">;

/** Any value that `JSON.stringify` writes into a `jsonb` column. */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/** Runs `fn` in BEGIN/COMMIT, rolls back when it throws, and always releases the client. */
export async function withTransaction<T>(fn: (tx: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/** True when a write failed on a unique constraint (SQLSTATE 23505). */
export function isUniqueViolation(error: unknown): boolean {
  return error instanceof pg.DatabaseError && error.code === "23505";
}
