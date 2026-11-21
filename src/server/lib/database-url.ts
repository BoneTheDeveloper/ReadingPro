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
