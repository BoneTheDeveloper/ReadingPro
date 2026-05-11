# Phase 02: Auth Pages (Sign-In / Sign-Up)

## Context

- **Issue:** https://github.com/BoneTheDeveloper/english-reading-training-app/issues/22
- **Branch:** `feature/supabase-auth`
- **Depends on:** Phase 01 (client utilities)

## Overview

Build sign-in and sign-up pages using existing shadcn/ui components. Support email/password authentication and Google OAuth. Create OAuth callback route for Google sign-in redirect flow.

## Requirements

### Functional
- Sign-in page at `/sign-in` with email/password form
- Sign-up page at `/sign-up` with email/password form
- Google OAuth button on both pages
- OAuth callback route at `/auth/callback`
- User profile auto-created in local `users` table on first sign-up
- Redirect to `/study` after successful sign-in
- Error messages displayed inline (not alerts)
- Link between sign-in and sign-up pages

### Non-Functional
- Consistent with existing Material Design 3 + shadcn/ui style
- Responsive — works on mobile and desktop
- Accessible — proper labels, focus states, error states

## Architecture

### Route Structure

```
src/app/(auth)/
├── layout.tsx         # Centered layout, no sidebar
├── sign-in/
│   └── page.tsx       # Sign-in form + Google OAuth
└── sign-up/
    └── page.tsx       # Sign-up form + Google OAuth

src/app/auth/
└── callback/
    └── route.ts       # OAuth redirect handler
```

Using `(auth)` route group — separate from `(dashboard)` route group. Auth pages get their own layout without the sidebar.

### User Sync Flow

```
User signs up (email/password or Google)
    │
    ▼
Supabase Auth creates auth.users row
    │
    ▼
OAuth callback or sign-up success handler calls syncUser()
    │
    ▼
syncUser() → db.user.upsert({ where: { supabaseAuthId }, create: {...}, update: {} })
    │
    ▼
User redirected to /study
```

## Related Code Files

### Modify
- `prisma/schema.prisma` — add `supabaseAuthId` column to User model

### Create
- `src/app/(auth)/layout.tsx`
- `src/app/(auth)/sign-in/page.tsx`
- `src/app/(auth)/sign-up/page.tsx`
- `src/app/auth/callback/route.ts`
- `src/lib/auth/sync-user.ts`

## Implementation Steps

### Step 1: Update Prisma schema

Add `supabaseAuthId` to User model:

```prisma
model User {
  id              String   @id @default(cuid())
  email           String   @unique
  name            String?
  supabaseAuthId  String?  @unique    // NEW: Supabase Auth UUID
  targetLevel     CEFRLevel @default(B2)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  passages      Passage[]
  studySessions StudySession[]
  cardReviews   CardReview[]

  @@map("users")
}
```

Run migration:
```bash
npx prisma migrate dev --name add-supabase-auth-id
```

### Step 2: Create user sync utility (`src/lib/auth/sync-user.ts`)

```typescript
import { db } from '@/lib/db/client'

export async function syncUser(supabaseAuthId: string, email: string, name?: string) {
  return db.user.upsert({
    where: { supabaseAuthId },
    update: { email, name },
    create: { email, name: name || email.split('@')[0], supabaseAuthId },
  })
}
```

### Step 3: Create auth layout (`src/app/(auth)/layout.tsx`)

Centered card layout, no sidebar, consistent with app's Material Design 3 styling. Background with subtle gradient.

### Step 4: Create sign-in page (`src/app/(auth)/sign-in/page.tsx`)

Client component with:
- Email input + password input using shadcn/ui Input components
- "Sign In" button (primary)
- "Sign in with Google" button (outline)
- Link to `/sign-up` ("Don't have an account?")
- Inline error message display
- Loading state on submit

Auth logic:
```typescript
const supabase = createClient() // browser client

// Email/password
const { error } = await supabase.auth.signInWithPassword({ email, password })

// Google OAuth
const { error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { redirectTo: `${origin}/auth/callback` },
})
```

### Step 5: Create sign-up page (`src/app/(auth)/sign-up/page.tsx`)

Same layout as sign-in, with:
- Email input + password input + confirm password input
- "Sign Up" button (primary)
- "Sign up with Google" button (outline)
- Link to `/sign-in` ("Already have an account?")
- Password validation feedback (min 8 chars)

Auth logic:
```typescript
// Email/password
const { data, error } = await supabase.auth.signUp({ email, password })

// Google OAuth — same as sign-in
const { error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { redirectTo: `${origin}/auth/callback` },
})
```

### Step 6: Create OAuth callback route (`src/app/auth/callback/route.ts`)

```typescript
import { NextResponse } from 'next/server'
import { createServerActionClient } from '@/lib/supabase/server'
import { syncUser } from '@/lib/auth/sync-user'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/study'

  if (code) {
    const supabase = await createServerActionClient()
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && user) {
      await syncUser(user.id, user.email!, user.user_metadata?.name)
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/sign-in?error=auth_callback_failed`)
}
```

### Step 7: Google OAuth configuration

Document setup in Supabase dashboard:
1. Go to Authentication → Providers → Google
2. Enable Google provider
3. Set Client ID and Client Secret from Google Cloud Console
4. Add `http://localhost:3000/auth/callback` to Authorized redirect URIs
5. (Production) Add production domain callback URL

## Todo List

- [ ] Add `supabaseAuthId` to Prisma schema + run migration
- [ ] Create `src/lib/auth/sync-user.ts`
- [ ] Create `(auth)` route group layout
- [ ] Create sign-in page with email/password + Google OAuth
- [ ] Create sign-up page with email/password + Google OAuth
- [ ] Create OAuth callback route with user sync
- [ ] Test email/password sign-up → sign-in → redirect
- [ ] Test Google OAuth sign-in → callback → redirect
- [ ] Verify TypeScript compilation

## Success Criteria

- `/sign-in` renders with email/password form and Google button
- `/sign-up` renders with email/password/confirm form and Google button
- Email/password sign-up creates Supabase Auth user + local `users` row
- Google OAuth sign-in creates Supabase Auth user + local `users` row
- Successful auth redirects to `/study`
- Error states display inline (wrong password, user exists, etc.)
- Navigation between sign-in and sign-up works

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Google OAuth callback URL mismatch | Document exact URL in plan; test with localhost first |
| User sync fails silently on first sign-up | Log errors; show user-friendly error message |
| Password validation mismatch between client and Supabase | Use Supabase's built-in validation (min 6 chars) |

## Security Considerations

- Passwords handled entirely by Supabase Auth — never stored in app DB
- OAuth tokens managed server-side via `exchangeCodeForSession`
- `supabaseAuthId` unique constraint prevents duplicate profiles
- Rate limiting on sign-up handled by Supabase Auth (built-in)

## Next Steps

- Phase 03: Middleware and route protection
- Phase 05: UI updates (user menu in sidebar)
