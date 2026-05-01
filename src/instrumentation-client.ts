import * as Sentry from "@sentry/nextjs";
import { getSentryConfig, isSentryEnabled } from "@/lib/core/sentry";

if (isSentryEnabled()) {
  Sentry.init({
    ...getSentryConfig(),
    integrations: [Sentry.replayIntegration()],
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
