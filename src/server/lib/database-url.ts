/**
 * The database the app connects to. DATABASE_URL wins when set (production or
 * any other database). Otherwise it is the local Docker database, built from
 * the same POSTGRES_* variables that docker-compose.yml reads.
 */
export function resolveDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string | undefined {
  if (env.DATABASE_URL) return env.DATABASE_URL;

  const { POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, POSTGRES_PORT } = env;
  if (!POSTGRES_USER || !POSTGRES_PASSWORD || !POSTGRES_DB || !POSTGRES_PORT) return undefined;

  const credentials = `${encodeURIComponent(POSTGRES_USER)}:${encodeURIComponent(POSTGRES_PASSWORD)}`;
  return `postgres://${credentials}@localhost:${POSTGRES_PORT}/${encodeURIComponent(POSTGRES_DB)}`;
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

/**
 * The database URL, but only when it points at this machine. Tests and test
 * account seeding create and delete rows, so they refuse any other database.
 */
export function requireLocalDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const url = resolveDatabaseUrl(env);
  if (!url) throw new Error("No database configured: set the POSTGRES_* variables in .env, then run pnpm db:up.");

  const host = new URL(url).hostname;
  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(`Only a local database is allowed here; the configured database is on "${host}".`);
  }
  return url;
}
