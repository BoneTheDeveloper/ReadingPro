import "server-only";
import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";
import * as Sentry from "@sentry/nextjs";
import { log } from "@/lib/logger";
import { isAppError, internalErrorBody, ERROR_CODES } from "@/lib/error/app-error";
import type pino from "pino";

type RouteContext = { params: Promise<Record<string, string>> };

type HandlerCtx = RouteContext & { log: pino.Logger };

type Handler = (req: Request, ctx: HandlerCtx) => Promise<Response>;

export function withErrorHandling(name: string, handler: Handler) {
  return async (req: Request, routeCtx: RouteContext): Promise<Response> => {
    const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
    const logger = log.child({
      route: name,
      method: req.method,
      requestId,
    });

    try {
      return await handler(req, { ...routeCtx, log });
    } catch (error) {
      unstable_rethrow(error);

      if (error instanceof ZodError) {
        logger.info({ issues: error.issues }, "validation failed");
        return Response.json(
          { error: { code: ERROR_CODES.VALIDATION, message: error.issues[0]?.message || "Invalid input", details: error.issues } },
          { status: 400 },
        );
      }

      if (isAppError(error)) {
        if (error.isExpected) {
          log.info({ code: error.code, details: error.details }, error.message);
          return error.toResponse();
        }
        logger.error({ err: error, details: error.details }, error.message);
        Sentry.captureException(error, { tags: { route: name, requestId } });
        return Response.json(internalErrorBody(), { status: 500 });
      }

      logger.error({ err: error }, "unhandled error");
      Sentry.captureException(error, { tags: { route: name, requestId } });
      return Response.json(internalErrorBody(), { status: 500 });
    }
  };
}
