import * as Sentry from "@sentry/nextjs";

type ClientErrorContext = {
  scope: string;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
};

export function captureClientError(err: unknown, ctx: ClientErrorContext) {
  Sentry.captureException(err, {
    tags: { scope: ctx.scope, ...ctx.tags },
    extra: ctx.extra,
  });
}
