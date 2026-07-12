import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import * as Sentry from "@sentry/nextjs";
import type { createRequestLogger } from "@/lib/logger";
import {
  NotFoundError,
  UnauthorizedError,
  ValidationError,
  ConflictError,
} from "@/lib/errors";
import type { ApiErrorResponse } from "./api-envelope-schema";

export function toHttp(
  error: unknown,
  log: ReturnType<typeof createRequestLogger>,
  route: string,
): NextResponse {
  let statusCode = 500;
  let clientMessage = "Internal error.";

  // Map domain errors to HTTP status codes
  if (error instanceof UnauthorizedError) {
    statusCode = 401;
    clientMessage = error.message;
  } else if (error instanceof NotFoundError) {
    statusCode = 404;
    clientMessage = error.message;
  } else if (error instanceof ValidationError) {
    statusCode = 400;
    clientMessage = error.message;
  } else if (error instanceof ConflictError) {
    statusCode = 409;
    clientMessage = error.message;
  } else if (error instanceof z.ZodError) {
    statusCode = 400;
    clientMessage = getZodErrorMessage(error);
  } else if (
    error instanceof Error &&
    error.message === "Authentication required"
  ) {
    statusCode = 401;
    clientMessage = "Authentication required.";
  }

  // Strict Telemetry Boundary: Only log & notify Sentry on 500s
  if (statusCode >= 500) {
    log.error({ err: error }, `${route} failed`);
    Sentry.captureException(error, { tags: { route } });
  }

  // Uniformly safe payload conforming to ApiErrorResponse schema
  const errorPayload: ApiErrorResponse = {
    success: false,
    error: clientMessage,
  };

  return NextResponse.json(errorPayload, { status: statusCode });
}

export function getZodErrorMessage(
  error: z.ZodError,
  fallback = "Invalid request",
) {
  return error.issues[0]?.message ?? fallback;
}
