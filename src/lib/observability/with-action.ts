import "server-only";
import * as Sentry from "@sentry/nextjs";
import { headers } from "next/headers";
import { createModuleLogger } from "@/lib/logger";
import { AppError } from "@/lib/errors";

export type ActionContext = {
  logger: ReturnType<typeof createModuleLogger>;
  requestId: string;
};

/**
 * Higher-order function that wraps a server action with observability:
 * - Request ID correlation from headers
 * - Scoped logger with requestId
 * - Sentry span for tracing
 * - Lifecycle logging (start/success/error)
 * - Selective error capture (business errors vs unexpected)
 *
 * Usage:
 * ```typescript
 * export const createVocabularyItem = withAction(
 *   "vocabulary.create",
 *   async (ctx, input: CreateInput) => {
 *     ctx.logger.info({ passageId: input.passageId }, "creating item");
 *     // ... business logic
 *   }
 * );
 * ```
 */
export function withAction<TArgs extends unknown[], TResult>(
  name: string,
  fn: (ctx: ActionContext, ...args: TArgs) => Promise<TResult>,
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    const requestId =
      (await headers()).get("x-request-id") ?? crypto.randomUUID();
    const logger = createModuleLogger(name).child({ requestId });

    return Sentry.startSpan(
      { name, op: "server.action", attributes: { requestId } },
      async () => {
        logger.info("action.start");
        try {
          const result = await fn({ logger, requestId }, ...args);
          logger.info("action.success");
          return result;
        } catch (error) {
          // Business/operational errors: warn only, no Sentry Issue
          if (error instanceof AppError && error.isOperational) {
            logger.warn({ err: error }, "action.rejected");
          } else {
            // Unexpected errors: log + capture to Sentry
            logger.error({ err: error }, "action.error");
            Sentry.captureException(error, {
              tags: { action: name },
              extra: { requestId },
            });
          }
          throw error;
        }
      },
    );
  };
}
