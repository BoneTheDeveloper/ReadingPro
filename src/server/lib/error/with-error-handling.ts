import type { Context } from "hono";
import { ZodError } from "zod";
import { log } from "@/server/lib/logger";
import { isAppError, internalErrorBody } from "@/server/lib/error/app-error";
import { ERROR_CODES } from "@/shared/contracts/api-error";
import type pino from "pino";

type HandlerCtx = { params: Promise<Record<string, string>>; log: pino.Logger };

type Handler = (req: Request, ctx: HandlerCtx) => Promise<Response>;

export function withErrorHandling(name: string, handler: Handler) {
  return async (c: Context): Promise<Response> => {
    const req = c.req.raw;
    const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
    const logger = log.child({
      route: name,
      method: req.method,
      requestId,
    });

    try {
      return await handler(req, { params: Promise.resolve(c.req.param()), log: logger });
    } catch (error) {
      if (error instanceof ZodError) {
        logger.info({ issues: error.issues }, "validation failed");
        return Response.json(
          { error: { code: ERROR_CODES.VALIDATION, message: error.issues[0]?.message || "Invalid input", details: error.issues } },
          { status: 400 },
        );
      }

      if (isAppError(error)) {
        if (error.isExpected) {
          logger.info({ code: error.code, details: error.details }, error.message);
          return error.toResponse();
        }
        logger.error({ err: error, details: error.details }, error.message);
        return Response.json(internalErrorBody(), { status: 500 });
      }

      logger.error({ err: error }, "unhandled error");
      return Response.json(internalErrorBody(), { status: 500 });
    }
  };
}
