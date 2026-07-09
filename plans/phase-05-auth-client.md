---
phase: 5
title: "Auth Client"
status: pending
priority: P1
effort: "15min"
dependencies: ["phase-04-auth-server"]
---

# Phase 5: Auth Client

## Overview

Create client-side session management utilities and hooks for React components.

## Requirements

- Functional: Session state accessible in client components, sign-in/sign-out work
- Non-functional: Type-safe, compatible with React 19

## Architecture

```
src/lib/auth-client.ts     # Base client (already created in phase 2)
src/hooks/use-session.ts   # React hook for session state
```

## Related Code Files

**Create:**
- `src/hooks/use-session.ts` — React hook wrapping `authClient.getSession()`

## Implementation Steps

### 5.1 Create Session Hook

Create `src/hooks/use-session.ts`:

```ts
"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

export type SessionUser = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
};

export type Session = {
  user: SessionUser;
  session: {
    id: string;
    expiresAt: Date;
  };
};

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    authClient.getSession().then(({ data }) => {
      setSession(data as Session | null);
      setLoading(false);
    });

    // Listen for session changes
    const unsubscribe = authClient.onSessionChange((session) => {
      setSession(session as Session | null);
    });

    return unsubscribe;
  }, []);

  return { session, loading };
}
```

### 5.2 Create Sign-Out Action (Server Action)

Add to `src/lib/auth-server.ts`:

```ts
// Server-side sign out
export async function signOut(headers: Headers): Promise<void> {
  await auth.api.signOut({ headers });
}
```

## Success Criteria

- [ ] `useSession` hook available for client components
- [ ] Session updates trigger re-renders
- [ ] Sign-out function available for server components

## Risk Assessment

- **Risk:** `onSessionChange` subscription may not work in all React versions
- **Mitigation:** Fallback to polling or manual refresh calls

## Next Steps

Proceed to Phase 6: Auth UI
