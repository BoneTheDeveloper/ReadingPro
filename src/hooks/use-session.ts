"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { authClient } from "@/lib/auth-client";

export type SessionUser = {
  id: string;
  name: string | null;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Session = {
  user: SessionUser;
  session: {
    id: string;
    expiresAt: Date;
    token: string;
  };
};

/**
 * Hook for accessing session state in client components.
 * Uses deferred fetch to avoid React's "setState in effect" warning.
 */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSession = useCallback(async () => {
    if (!mountedRef.current) return;

    try {
      const { data } = await authClient.getSession();
      if (mountedRef.current) {
        setSession(data as Session | null);
        setLoading(false);
      }
    } catch {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    // Defer initial fetch to avoid "setState in effect" warning
    // This is the pattern Better Auth uses internally
    const timeoutId = setTimeout(() => {
      if (mountedRef.current) {
        fetchSession();
      }
    }, 0);

    // Poll every 30 seconds
    intervalRef.current = setInterval(fetchSession, 30000);

    return () => {
      mountedRef.current = false;
      clearTimeout(timeoutId);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchSession]);

  return { session, loading };
}
