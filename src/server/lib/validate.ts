import { zValidator } from "@hono/zod-validator";
import type { ValidationTargets } from "hono";
import type { ZodType } from "zod";
import { AppError } from "@/server/lib/error/app-error";
import { ERROR_CODES } from "@/shared/api-error";

/**
 * zValidator that reports failures through `app.onError`, so a bad request gets
 * the same VALIDATION envelope as a `.parse()` failure inside a handler. With
 * `message`, the body carries that message and no issue details.
 */
export function validate<Target extends keyof ValidationTargets, Schema extends ZodType>(
  target: Target,
  schema: Schema,
  message?: string,
) {
  return zValidator(target, schema, (result) => {
    if (result.success) return;
    if (message) throw new AppError(400, ERROR_CODES.VALIDATION, message);
    throw result.error;
  });
}
