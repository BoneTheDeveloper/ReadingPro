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
  // Falls back to the root logger if requestContext never ran.
  const logger = (c.get("log") ?? log).child({ route: c.req.routePath });
  const appError = toAppError(error);
  c.set("errorReason", appError.reason);

  // Expected failures are already visible on the access line; details only matter while debugging.
  if (appError.status < 500) {
    logger.debug({ reason: appError.reason, details: appError.details }, appError.message);
    return c.json(appError.toBody(), appError.status);
  }

  logger.error({ err: error }, error instanceof AppError ? error.message : "unhandled error");
  return c.json(INTERNAL_ERROR.toBody(), INTERNAL_ERROR.status);
};

function toAppError(error: Error): AppError {
  if (error instanceof ZodError) {
    return new AppError("request.invalid", error.issues[0]?.message || "Invalid input", error.issues);
  }
  // Raised by Hono itself, e.g. a malformed JSON body in zValidator.
  if (error instanceof HTTPException && error.status < 500) {
    return new AppError("request.invalid", error.message);
  }
  if (error instanceof AppError) return error;
  return INTERNAL_ERROR;
}
