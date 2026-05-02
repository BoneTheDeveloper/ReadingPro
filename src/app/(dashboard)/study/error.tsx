"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function StudyError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-xl font-semibold">Failed to load study session</h2>
      <p className="text-sm text-muted-foreground">
        We couldn&apos;t start your study session. Please try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
      >
        Try again
      </button>
    </div>
  );
}
