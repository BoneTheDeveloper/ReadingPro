# Phase 01: Package Setup and Supabase Client Utilities

## Context

- **Issue:** https://github.com/BoneTheDeveloper/english-reading-training-app/issues/22
- **Branch:** `feature/supabase-auth`
- **Depends on:** None (first phase)
- **Unblocks:** Phases 02-05

## Overview

Install Supabase packages, configure environment variables, and create the three Supabase client utilities needed across the app: browser client, server client, and middleware client.

## Requirements

### Functional
- Install `@supabase/supabase-js` and `@supabase/ssr`
- Create browser client for client components
- Create server client for server components, server actions, API routes
- Create middleware client for route protection
- Add environment variables to `.env.example`

### Non-Functional
- Type-safe clients using TypeScript
- Singleton pattern for server client (same as current Prisma pattern)
- Minimal configuration — just URL + anon key

## Architecture

```
src/lib/supabase/
├── client.ts      # createBrowserClient — for "use client" components
├── server.ts      # createServerClient — for server components, actions, API routes
└── middleware.ts   # createServerClient — for middleware.ts (different cookie handling)
```

Client utility usage pattern:
```
Client components  → import { createBrowserClient } from '@/lib/supabase/client'
Server components  → import { createServerComponentClient } from '@/lib/supabase/server'
Server actions     → import { createServerActionClient } from '@/lib/supabase/server'
API routes         → import { createRouteHandlerClient } from '@/lib/supabase/server'
Middleware         → import { createMiddlewareClient } from '@/lib/supabase/middleware'
```

## Related Code Files

### Modify
- `package.json` — add `@supabase/supabase-js`, `@supabase/ssr`
- `.env.example` — add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Create
- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`
- `src/lib/supabase/middleware.ts`

## Implementation Steps

### Step 1: Install packages

```bash
npm install @supabase/supabase-js @supabase/ssr
```

Remove ghost dependency:
```bash
npm uninstall @types/bcryptjs
```

### Step 2: Update `.env.example`

Add after existing variables:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Step 3: Create browser client (`src/lib/supabase/client.ts`)

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
```

### Step 4: Create server client (`src/lib/supabase/server.ts`)

Two exported functions with different cookie handling:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// For Server Components (read-only cookies)
export async function createServerComponentClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        // setAll omitted — cannot set cookies from Server Components
      },
    },
  )
}

// For Server Actions & Route Handlers (read + write cookies)
export async function createServerActionClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        },
      },
    },
  )
}
```

### Step 5: Create middleware client (`src/lib/supabase/middleware.ts`)

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll().map(c => ({ name: c.name, value: c.value }))
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    },
  )

  // Refresh session — important for Server Components
  await supabase.auth.getUser()

  return supabaseResponse
}
```

## Todo List

- [ ] Install `@supabase/supabase-js` and `@supabase/ssr`
- [ ] Remove `@types/bcryptjs` ghost dependency
- [ ] Update `.env.example` with Supabase env vars
- [ ] Create `src/lib/supabase/client.ts` (browser client)
- [ ] Create `src/lib/supabase/server.ts` (server component + server action clients)
- [ ] Create `src/lib/supabase/middleware.ts` (middleware client)
- [ ] Verify TypeScript compilation passes

## Success Criteria

- `npm run build` passes with new packages
- All three client utilities export correctly
- No TypeScript errors
- `.env.example` documents all required Supabase variables

## Security Considerations

- Only use `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public key) — never expose service role key to client
- Server clients also use anon key — RLS policies enforce access control at the DB level
- Cookie-based PKCE flow is secure by default (no localStorage tokens)

## Next Steps

- Phase 02: Auth pages (sign-in/sign-up)
- Phase 03: Middleware and route protection
