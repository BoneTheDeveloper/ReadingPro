import { createMiddleware } from "hono/factory";
import { AppError } from "@/server/lib/errors";
import { isProTier } from "@/shared/plan/tier";
import type { AuthEnv } from "@/server/env";

/** Throws `plan.pro_required` unless the user is on the Pro tier. */
export function assertPro(user: { tier?: string | null }): void {
  if (!isProTier(user.tier)) {
    throw new AppError("plan.pro_required", "This feature requires the Pro tier");
  }
}

/** Mount after `requireSession`. */
export const requirePro = createMiddleware<AuthEnv>(async (c, next) => {
  assertPro(c.var.user);
  await next();
});
