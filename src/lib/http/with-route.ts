import type { NextRequest } from "next/server";
import type { ContextLogger } from "@/lib/logger";
import { createRequestLogger, createRequestLogContext } from "@/lib/logger";
import { toHttp } from "./route-error-handler";

type RouteContext = Record<string, unknown>;

type RouteHandler = (
  req: NextRequest,
  ctx: RouteContext,
  log: ContextLogger,
) => Promise<Response>;

/**
 * Route wrapper that handles:
 * - Request logger creation
 * - Error catching and toHttp mapping
 *
 * Usage:
 * ```typescript
 * export const GET = withRoute("api:health", "/api/health", async (req, _ctx, log) => {
 *   return json({ status: "ok" });
 * });
 * ```
 */
export function withRoute(
  routeName: string,
  fallbackPath: string,
): (handler: RouteHandler) => (req: NextRequest, ctx: RouteContext) => Promise<Response> {
  return (handler: RouteHandler) => {
    return async (req: NextRequest, ctx: RouteContext) => {
      const log = createRequestLogger(
        routeName,
        createRequestLogContext(req, req.method, fallbackPath),
      );

      try {
        return await handler(req, ctx, log);
      } catch (error) {
        return toHttp(error, log, routeName);
      }
    };
  };
}
