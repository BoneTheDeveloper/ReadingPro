import type { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { ZodError } from "zod";
import { log } from "@/server/lib/logger";
import { isAppError, internalErrorBody } from "@/server/lib/error/app-error";
import { ERROR_CODES, type ErrorCode } from "@/shared/api-error";
import type { AppEnv } from "@/server/env";

const HTTP_STATUS_CODES: Partial<Record<number, ErrorCode>> = {
  400: ERROR_CODES.VALIDATION,
  401: ERROR_CODES.UNAUTHORIZED,
  403: ERROR_CODES.FORBIDDEN,
  404: ERROR_CODES.NOT_FOUND,
  409: ERROR_CODES.CONFLICT,
  429: ERROR_CODES.RATE_LIMITED,
};

/** Maps every error thrown by an API route to the `{ error: { code, message, details? } }` envelope. */
export const onError: ErrorHandler<AppEnv> = (error, c) => {
  // Errors thrown before requestContext ran (the auth handler) have no request logger.
  const logger = (c.get("log") ?? log).child({ route: c.req.routePath });

  if (error instanceof ZodError) {
    logger.info({ issues: error.issues }, "validation failed");
    return c.json(
      { error: { code: ERROR_CODES.VALIDATION, message: error.issues[0]?.message || "Invalid input", details: error.issues } },
      400,
    );
  }

  if (isAppError(error)) {
    if (error.isExpected) {
      logger.info({ code: error.code, details: error.details }, error.message);
      return c.json(error.toBody(), error.statusCode as ContentfulStatusCode);
    }
    logger.error({ err: error, details: error.details }, error.message);
    return c.json(internalErrorBody(), 500);
  }

  // Raised by Hono itself, e.g. a malformed JSON body in zValidator.
  if (error instanceof HTTPException && error.status < 500) {
    logger.info({ status: error.status }, error.message);
    const code = HTTP_STATUS_CODES[error.status] ?? ERROR_CODES.VALIDATION;
    return c.json({ error: { code, message: error.message } }, error.status);
  }

  logger.error({ err: error }, "unhandled error");
  return c.json(internalErrorBody(), 500);
};
