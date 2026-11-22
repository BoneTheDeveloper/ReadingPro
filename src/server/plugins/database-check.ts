import { definePlugin } from "nitro";
import { checkDatabase } from "@/server/lib/database-health";
import { resolveDatabaseUrl } from "@/server/lib/database-url";
import { log } from "@/server/lib/logger";

// Reports the database connection once at startup, so a stopped database shows
// up as one clear line instead of later auth or query errors. It only logs:
// exiting would kill the dev watcher and crash-loop a production instance.
export default definePlugin(async () => {
  const health = await checkDatabase(resolveDatabaseUrl());
  if (health.ok) {
    log.info({ db: health.target }, "Database connected");
  } else {
    log.error({ db: health.target, reason: health.reason, hint: health.hint }, "Database unreachable");
  }
});
