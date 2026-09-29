import type { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { ZodError } from "zod";
import { log } from "@/server/lib/logger";
import { ERROR_REASONS, type ApiErrorBody, type ErrorReason } from "@/shared/api-error";
import type { AppEnv } from "@/server/env";

/**
 * The one error type server code throws. Status and code come from the reason,
 * so a reason always answers the same way; `message` is English for logs.
 */
export class AppError extends Error {
  constructor(
    public readonly reason: ErrorReason,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }

  get status(): ContentfulStatusCode {
    return ERROR_REASONS[this.reason].status;
  }

  toBody(): ApiErrorBody {
    return {
      error: {
        code: ERROR_REASONS[this.reason].code,
        reason: this.reason,
        message: this.message,
        ...(this.details !== undefined && { details: this.details }),
      },
    };
  }
}

const INTERNAL_ERROR = new AppError("internal", "Internal server error");

/** Maps every error thrown by an API route to the `ApiErrorBody` envelope. */
export const onError: ErrorHandler<AppEnv> = (error, c) => {
  // Errors thrown before requestContext ran (the auth handler) have no request logger.
  const logger = (c.get("log") ?? log).child({ route: c.req.routePath });

  if (error instanceof ZodError) {
    logger.info({ issues: error.issues }, "validation failed");
    const invalid = new AppError("request.invalid", error.issues[0]?.message || "Invalid input", error.issues);
    return c.json(invalid.toBody(), invalid.status);
  }

  // Raised by Hono itself, e.g. a malformed JSON body in zValidator.
  if (error instanceof HTTPException && error.status < 500) {
    logger.info({ status: error.status }, error.message);
    const invalid = new AppError("request.invalid", error.message);
    return c.json(invalid.toBody(), invalid.status);
  }

  if (error instanceof AppError && error.status < 500) {
    logger.info({ reason: error.reason, details: error.details }, error.message);
    return c.json(error.toBody(), error.status);
  }

  logger.error({ err: error }, error instanceof AppError ? error.message : "unhandled error");
  return c.json(INTERNAL_ERROR.toBody(), INTERNAL_ERROR.status);
};
