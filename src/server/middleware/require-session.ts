import { createMiddleware } from "hono/factory";
import { auth } from "@/server/modules/auth";
import { AppError } from "@/server/lib/errors";
import type { AuthEnv } from "@/server/env";

export const requireSession = createMiddleware<AuthEnv>(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    throw new AppError("auth.required", "Authentication required");
  }
  c.set("user", session.user);
  c.set("session", session.session);
  await next();
});
