import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import * as Sentry from "@sentry/nextjs";
import { AuthenticationRequiredError } from "@/services/clerk";
import type { createRequestLogger } from "@/services/logger";

// Domain error raised by repo/service when a resource does not exist or is not
// owned by the caller. The two cases are merged deliberately so a non-owner
// cannot distinguish "missing" from "forbidden". toHttp maps this to 404.
export class NotFoundError extends Error {
  constructor(resource: string) {
    super(`${resource} not found.`);
    this.name = "NotFoundError";
  }
}

export function isAuthenticationRequiredError(error: unknown) {
  return error instanceof AuthenticationRequiredError;
}

// Single boundary translating a caught error into an HTTP response. Takes the
// request logger + a route id so 500s keep their per-route logging + Sentry tag.
export function toHttp(
  error: unknown,
  log: ReturnType<typeof createRequestLogger>,
  route: string,
): NextResponse {
  if (isAuthenticationRequiredError(error)) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }
  if (error instanceof NotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: getZodErrorMessage(error) },
      { status: 400 },
    );
  }
  log.error({ err: error }, `${route} failed`);
  Sentry.captureException(error, { tags: { route } });
  return NextResponse.json({ error: "Internal error." }, { status: 500 });
}

export function getZodErrorMessage(
  error: z.ZodError,
  fallback = "Invalid request",
) {
  return error.issues[0]?.message ?? fallback;
}

