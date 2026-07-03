"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { ensureStudySession } from "../api-client/learning-session-client";
import { STUDY_API_ROUTES } from "@/features/study/shared/api-utils";

const STUDY_SESSION_HEARTBEAT_MS = 60_000;

export function useStudySessionHeartbeat(enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const pingSession = async () => {
      if (document.visibilityState !== "visible") return;

      try {
        const result = await ensureStudySession();
        if (cancelled) return;

        if ("error" in result) {
          Sentry.addBreadcrumb({
            category: "learning-session",
            level: "error",
            message: "learning-session-heartbeat-failed",
            data: { route: STUDY_API_ROUTES.sessions },
          });
        }
      } catch {
        Sentry.addBreadcrumb({
          category: "learning-session",
          level: "error",
          message: "learning-session-heartbeat-failed",
          data: { route: STUDY_API_ROUTES.sessions },
        });
      }
    };

    void pingSession();

    const intervalId = window.setInterval(() => {
      void pingSession();
    }, STUDY_SESSION_HEARTBEAT_MS);

    const handleVisibilityChange = () => {
      void pingSession();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled]);
}
