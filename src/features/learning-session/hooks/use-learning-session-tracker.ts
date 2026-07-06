"use client";

import { useEffect, useRef } from "react";
import * as Sentry from "@sentry/nextjs";
import { ensureStudySession } from "../learning-session-client";

const PING_THROTTLE_MS = 60_000;

export function useLearningSessionTracker() {
  const lastPingAt = useRef<number>(0);

  useEffect(() => {
    const pingSession = async () => {
      if (document.visibilityState !== "visible") return;

      const now = Date.now();
      if (now - lastPingAt.current < PING_THROTTLE_MS) return;

      lastPingAt.current = now;

      try {
        await ensureStudySession();
      } catch {
        Sentry.addBreadcrumb({
          category: "learning-session",
          level: "error",
          message: "learning-session-ping-failed",
        });
      }
    };

    // Initial ping on mount
    void pingSession();

    const handleActivity = () => {
      void pingSession();
    };

    // Desktop
    window.addEventListener("mousedown", handleActivity, { passive: true });
    window.addEventListener("keydown", handleActivity, { passive: true });

    // Mobile
    window.addEventListener("scroll", handleActivity, { passive: true });
    window.addEventListener("touchstart", handleActivity, { passive: true });

    // Visibility
    document.addEventListener("visibilitychange", handleActivity);

    return () => {
      window.removeEventListener("mousedown", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("scroll", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
      document.removeEventListener("visibilitychange", handleActivity);
    };
  }, []);
}
