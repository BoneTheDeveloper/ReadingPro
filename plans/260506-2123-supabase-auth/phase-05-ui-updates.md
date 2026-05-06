# Phase 05: UI Updates (User Menu, Sign-Out)

## Context

- **Issue:** https://github.com/BoneTheDeveloper/english-reading-training-app/issues/22
- **Branch:** `feature/supabase-auth`
- **Depends on:** Phase 01 (client utilities)
- **Can run in parallel with:** Phases 02, 03, 04

## Overview

Replace the placeholder user info in the dashboard sidebar TopBar with a real user menu. Add sign-out functionality and display the authenticated user's name and email.

## Requirements

### Functional
- Display user's name and email in TopBar (replace "Placeholder" text)
- User avatar showing first letter of name
- Dropdown menu with: Profile info, Sign out button
- Sign-out clears Supabase session and redirects to `/sign-in`
- User info fetched from Supabase session (client-side)
- Mobile header also shows user info or sign-out option

### Non-Functional
- Consistent with existing Material Design 3 styling
- Dropdown uses shadcn/ui DropdownMenu component
- Smooth transitions and hover states

## Architecture

### Current TopBar (desktop)

```tsx
// dashboard-sidebar.tsx lines 111-123
<div className="flex items-center gap-3">
  <div className="text-right">
    <p className="...">Placeholder</p>
    <p className="...">Placeholder</p>
  </div>
  <div className="w-9 h-9 rounded-full bg-primary/10 ...">
    <span className="...">P</span>
  </div>
</div>
```

### Target TopBar (desktop)

```tsx
<UserMenu />  // New component
  ├── Avatar (first letter of name)
  ├── Name + email display
  └── DropdownMenu
      ├── User info (read-only)
      └── Sign Out button
```

### Component Structure

```
src/components/user-menu.tsx     # New: UserMenu client component
src/components/dashboard-sidebar.tsx  # Modified: Replace placeholder with UserMenu
```

## Related Code Files

### Create
- `src/components/user-menu.tsx`

### Modify
- `src/components/dashboard-sidebar.tsx` — replace placeholder with `<UserMenu />`

## Implementation Steps

### Step 1: Create UserMenu component (`src/components/user-menu.tsx`)

Client component that:
1. Creates browser Supabase client
2. Fetches current session on mount
3. Displays user name/email
4. Provides sign-out via `supabase.auth.signOut()`
5. Uses shadcn/ui DropdownMenu for the menu

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut, User } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function UserMenu() {
  const router = useRouter()
  const [userName, setUserName] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserName(user.user_metadata?.name || user.email?.split('@')[0] || 'User')
        setUserEmail(user.email)
      }
    }
    getUser()
  }, [supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/sign-in')
    router.refresh()
  }

  const initials = userName ? userName.charAt(0).toUpperCase() : '?'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-3 outline-none">
        <div className="text-right">
          <p className="text-[14px] font-semibold text-on-surface leading-none">
            {userName || 'Loading...'}
          </p>
          <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold mt-0.5">
            {userEmail || ''}
          </p>
        </div>
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-primary text-[14px] font-bold">{initials}</span>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">{userName}</p>
          <p className="text-xs text-muted-foreground">{userEmail}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-red-600 cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

### Step 2: Check if shadcn/ui DropdownMenu is installed

Run:
```bash
ls src/components/ui/dropdown-menu.tsx
```

If not present, install:
```bash
npx shadcn@latest add dropdown-menu
```

### Step 3: Update TopBar in dashboard-sidebar.tsx

Replace the placeholder block (lines 111-123) with `<UserMenu />`:

```diff
  import { UserMenu } from '@/components/user-menu'

  // In TopBar component, replace:
- <div className="flex items-center gap-3">
-   <div className="text-right">
-     <p className="text-[14px] font-semibold text-on-surface leading-none">Placeholder</p>
-     <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold mt-0.5">Placeholder</p>
-   </div>
-   <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
-     <span className="text-primary text-[14px] font-bold">P</span>
-   </div>
- </div>
+ <UserMenu />
```

### Step 4: Mobile sign-out option

For the mobile sidebar, add a sign-out option in the footer area alongside Settings and Help buttons:

```diff
  // In MobileSidebarContent, add sign-out button in footer
+ <button onClick={handleSignOut} className="..." title="Sign out">
+   <LogOut className="w-5 h-5" />
+ </button>
```

Since `MobileSidebarContent` is not a client component and doesn't have access to Supabase, either:
- Extract a small `MobileSignOutButton` client component
- Or move sign-out to the mobile TopBar area

**Recommended:** Keep mobile simple — add sign-out as a small button in the mobile TopBar next to the app title.

## Todo List

- [ ] Check/install shadcn/ui DropdownMenu component
- [ ] Create `src/components/user-menu.tsx`
- [ ] Replace placeholder in TopBar with `<UserMenu />`
- [ ] Add mobile sign-out option
- [ ] Test: user name/email displays correctly
- [ ] Test: sign-out clears session and redirects to `/sign-in`
- [ ] Test: after sign-out, accessing protected routes redirects to `/sign-in`
- [ ] Verify TypeScript compilation

## Success Criteria

- TopBar shows real user name and email (not "Placeholder")
- Avatar shows first letter of user's name
- Dropdown menu opens on click
- Sign-out clears session and redirects to `/sign-in`
- After sign-out, user cannot access protected routes
- Mobile has accessible sign-out option

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Session fetch on every render causes flicker | Low | Low | Use `useEffect` + state; show "Loading..." while fetching |
| shadcn/ui DropdownMenu conflicts with existing styles | Low | Low | Test visually; adjust if needed |

## Security Considerations

- User info fetched from Supabase session (server-validated, not client-stored)
- Sign-out calls `supabase.auth.signOut()` which clears cookies server-side
- No sensitive data in dropdown menu

## Next Steps

- Phase 06: Testing and validation
