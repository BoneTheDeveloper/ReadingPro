import * as Sentry from "@sentry/nextjs";
import { getSentryConfig, isSentryEnabled } from "@/shared/core/sentry";

if (isSentryEnabled()) {
  Sentry.init(getSentryConfig());
}
