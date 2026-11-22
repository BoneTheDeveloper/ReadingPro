import pg from "pg";

export type DatabaseHealth =
  | { ok: true; target: string }
  | { ok: false; target: string | null; reason: string; hint?: string };

const CONNECT_TIMEOUT_MS = 5_000;

/** host:port/database, never the credentials. */
export function describeDatabaseTarget(url: string): string {
  try {
    const { hostname, port, pathname } = new URL(url);
    return `${hostname}:${port || "5432"}${pathname}`;
  } catch {
    return "<unparseable database url>";
  }
}

function isLocalHost(url: string): boolean {
  try {
    return ["localhost", "127.0.0.1", "::1"].includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

/**
 * Opens one short-lived connection and runs `SELECT 1`. Uses its own client
 * with a connect timeout, so an unreachable host cannot hang startup the way
 * the shared pool (no timeout) would.
 */
export async function checkDatabase(url: string | undefined): Promise<DatabaseHealth> {
  if (!url) {
    return {
      ok: false,
      target: null,
      reason: "No database configured",
      hint: "Set DATABASE_URL, or the POSTGRES_* variables from .env.example",
    };
  }

  const target = describeDatabaseTarget(url);
  const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: CONNECT_TIMEOUT_MS });
  try {
    await client.connect();
    await client.query("SELECT 1");
    return { ok: true, target };
  } catch (error) {
    const reason = error instanceof Error ? error.message || error.name : String(error);
    return {
      ok: false,
      target,
      reason,
      ...(isLocalHost(url) && { hint: "Start the local database with `pnpm db:up`" }),
    };
  } finally {
    await client.end().catch(() => {});
  }
}
