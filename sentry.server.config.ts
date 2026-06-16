import * as Sentry from "@sentry/nextjs";
import { getSentryConfig, isSentryEnabled } from "@/shared/core/sentry";

if (isSentryEnabled()) {
  const config = getSentryConfig();
  Sentry.init({
    ...config,
    integrations: [
      Sentry.pinoIntegration({
        error: {
          levels: ["error", "fatal"],
          handled: true,
        },
        log: {
          levels: ["warn", "error", "fatal"],
        },
      }),
    ],
  });
}
