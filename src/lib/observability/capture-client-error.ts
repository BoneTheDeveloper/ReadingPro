import * as Sentry from "@sentry/nextjs";

type ClientErrorContext = {
  scope: string;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
};

// Client-side symmetric of toHttp's capture: one place to attach tags/context.
export function captureClientError(err: unknown, ctx: ClientErrorContext) {
  Sentry.captureException(err, {
    tags: { scope: ctx.scope, ...ctx.tags },
    extra: ctx.extra,
  });
}
