import { createMiddleware } from "hono/factory";
import { log } from "@/server/lib/logger";
import type { AppEnv, AuthEnv } from "@/server/env";

/** Gives each request a child logger and writes one access line when it completes. */
export const requestContext = createMiddleware<AppEnv>(async (c, next) => {
  const start = performance.now();
  const logger = log.child({ requestId: c.get("requestId"), method: c.req.method, path: c.req.path });
  c.set("log", logger);

  await next();

  const user = (c.var as Partial<AuthEnv["Variables"]>).user;
  logger.info(
    {
      status: c.res.status,
      durationMs: Math.round(performance.now() - start),
      userId: user?.id,
      reason: c.get("errorReason"),
    },
    "request completed",
  );
});
