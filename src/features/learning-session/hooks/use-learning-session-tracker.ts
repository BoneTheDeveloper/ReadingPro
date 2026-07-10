"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ensureStudySessionAction } from "../actions";
import type { LearningSessionDto } from "../schemas/learning-session.schema";

const SESSION_IDLE_MS = 10 * 60 * 1000; // 10 minutes - must match server
const STORAGE_KEY = "study_session_state";

interface SessionState {
  sessionId: string;
  validUntil: number; // timestamp when session expires
}

function loadSessionState(): SessionState | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveSessionState(state: SessionState) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable - ignore
  }
}

function clearSessionState() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}

export function useLearningSessionTracker() {
  const [currentSession, setCurrentSession] = useState<LearningSessionDto | null>(null);
  const sessionStateRef = useRef<SessionState | null>(null);
  const initRef = useRef(false);

  // Load state on mount
  useEffect(() => {
    sessionStateRef.current = loadSessionState();
  }, []);

  // Ensure session is valid (call server only if needed)
  const ensureSession = useCallback(async () => {
    const now = Date.now();
    const state = sessionStateRef.current;

    // If we have a valid, non-expired session → skip server call
    if (state && state.validUntil > now) {
      return;
    }

    try {
      const session = await ensureStudySessionAction();

      // Store new session state with 10-min validity
      const newState: SessionState = {
        sessionId: session.id,
        validUntil: now + SESSION_IDLE_MS,
      };
      sessionStateRef.current = newState;
      saveSessionState(newState);
      setCurrentSession(session);
    } catch {
      // On error, clear state so we retry next time
      clearSessionState();
      sessionStateRef.current = null;
    }
  }, []);

  // Initial call on mount (only once)
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    void ensureSession();
  }, [ensureSession]);

  // Activity events update local state only (no server call)
  // Session is valid for 10 min from last server check
  const handleActivity = useCallback(() => {
    const now = Date.now();
    const state = sessionStateRef.current;

    if (state) {
      // Extend local validity (don't call server)
      state.validUntil = now + SESSION_IDLE_MS;
    }
  }, []);

  useEffect(() => {
    // Desktop
    window.addEventListener("mousedown", handleActivity, { passive: true });
    window.addEventListener("keydown", handleActivity, { passive: true });

    // Mobile
    window.addEventListener("scroll", handleActivity, { passive: true });
    window.addEventListener("touchstart", handleActivity, { passive: true });

    return () => {
      window.removeEventListener("mousedown", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("scroll", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
    };
  }, [handleActivity]);

  return currentSession;
}
