import { zValidator } from "@hono/zod-validator";
import type { ValidationTargets } from "hono";
import type { ZodType } from "zod";
import { AppError } from "@/server/lib/errors";
import type { ErrorReason } from "@/shared/api-error";

/**
 * zValidator that reports failures through `app.onError`, so a bad request gets
 * the same envelope as a `.parse()` failure inside a handler. Pass `reason` when
 * the client should show something more specific than "request.invalid".
 */
export function validate<Target extends keyof ValidationTargets, Schema extends ZodType>(
  target: Target,
  schema: Schema,
  reason?: ErrorReason,
) {
  return zValidator(target, schema, (result) => {
    if (result.success) return;
    if (reason) throw new AppError(reason, "Invalid request", result.error.issues);
    throw result.error;
  });
}
