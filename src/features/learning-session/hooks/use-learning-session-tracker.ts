"use client";

import { useEffect, useRef } from "react";
import { ensureStudySessionAction } from "../actions";

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
        await ensureStudySessionAction();
      } catch {
        // Swallow: presence heartbeat failures should never disrupt the study session.
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
