import { createMiddleware } from "hono/factory";
import { log } from "@/server/lib/logger";
import type { AppEnv } from "@/server/env";

/** Tags every request with an id (the client's `x-request-id` when sent) and a child logger. */
export const requestContext = createMiddleware<AppEnv>(async (c, next) => {
  const requestId = c.req.header("x-request-id") ?? crypto.randomUUID();
  c.set("requestId", requestId);
  c.set("log", log.child({ method: c.req.method, requestId }));
  await next();
});
