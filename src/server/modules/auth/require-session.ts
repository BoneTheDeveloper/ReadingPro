import { createMiddleware } from "hono/factory";
import { auth } from "./auth";
import { AppError } from "@/server/lib/error/app-error";
import { ERROR_CODES } from "@/shared/api-error";
import type { AuthEnv } from "@/server/env";

export const requireSession = createMiddleware<AuthEnv>(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    throw new AppError(401, ERROR_CODES.UNAUTHORIZED, "Authentication required");
  }
  c.set("user", session.user);
  c.set("session", session.session);
  await next();
});
