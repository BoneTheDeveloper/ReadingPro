---
phase: 6
title: "Auth UI"
status: pending
priority: P1
effort: "1h"
dependencies: ["phase-05-auth-client"]
---

# Phase 6: Auth UI

## Overview

Replace Clerk's `<SignIn>`, `<SignUp>` components with custom React forms. Replace `<AuthControls>` with Better Auth equivalents.

## Requirements

- Functional: Sign-in, sign-up, sign-out all work; OAuth buttons trigger correct flows
- Non-functional: Mobile responsive, accessible, matches existing design

## Architecture

```
src/app/[locale]/(auth)/sign-in/[[...sign-in]]/page.tsx → Custom form
src/app/[locale]/(auth)/sign-up/[[...sign-up]]/page.tsx → Custom form
src/components/layout/auth-controls.tsx → Better Auth version
```

## Related Code Files

**Modify:**
- `src/app/[locale]/(auth)/sign-in/[[...sign-in]]/page.tsx`
- `src/app/[locale]/(auth)/sign-up/[[...sign-up]]/page.tsx`
- `src/components/layout/auth-controls.tsx`

**Create:**
- `src/components/auth/sign-in-form.tsx` — Reusable sign-in form
- `src/components/auth/sign-up-form.tsx` — Reusable sign-up form
- `src/components/auth/user-menu.tsx` — User avatar + dropdown menu

## Implementation Steps

### 6.1 Create Sign-In Form Component

Create `src/components/auth/sign-in-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface SignInFormProps {
  className?: string;
  redirectUrl?: string;
}

export function SignInForm({ className, redirectUrl }: SignInFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: authError } = await authClient.signIn.email(
      { email, password },
      {
        onSuccess: () => {
          router.push(redirectUrl || "/");
          router.refresh();
        },
        onError: (ctx) => {
          setError(ctx.error.message);
          setLoading(false);
        },
      }
    );

    if (authError) {
      setError(authError.message);
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "github") => {
    await authClient.signIn.social({
      provider,
      callbackURL: redirectUrl || "/",
    });
  };

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-4", className)}>
      {error && (
        <div className="text-sm text-destructive text-center">{error}</div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="you@example.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Signing in..." : "Sign in"}
      </Button>

      {/* OAuth buttons */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => handleOAuth("google")}
        >
          Google
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => handleOAuth("github")}
        >
          GitHub
        </Button>
      </div>
    </form>
  );
}
```

### 6.2 Create Sign-Up Form Component

Create `src/components/auth/sign-up-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface SignUpFormProps {
  className?: string;
  redirectUrl?: string;
}

export function SignUpForm({ className, redirectUrl }: SignUpFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: authError } = await authClient.signUp.email(
      { name, email, password },
      {
        onSuccess: () => {
          router.push(redirectUrl || "/");
          router.refresh();
        },
        onError: (ctx) => {
          setError(ctx.error.message);
          setLoading(false);
        },
      }
    );

    if (authError) {
      setError(authError.message);
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "github") => {
    await authClient.signIn.social({
      provider,
      callbackURL: redirectUrl || "/",
    });
  };

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-4", className)}>
      {error && (
        <div className="text-sm text-destructive text-center">{error}</div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Your name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="you@example.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Creating account..." : "Sign up"}
      </Button>

      {/* OAuth buttons */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => handleOAuth("google")}
        >
          Google
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => handleOAuth("github")}
        >
          GitHub
        </Button>
      </div>
    </form>
  );
}
```

### 6.3 Update Sign-In Page

Update `src/app/[locale]/(auth)/sign-in/[[...sign-in]]/page.tsx`:

```tsx
import { SignInForm } from "@/components/auth/sign-in-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SignInPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            Welcome back! Enter your credentials to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignInForm redirectUrl={`/${locale}`} />
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <a href={`/${locale}/sign-up`} className="text-primary hover:underline">
              Sign up
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 6.4 Update Sign-Up Page

Update `src/app/[locale]/(auth)/sign-up/[[...sign-up]]/page.tsx`:

```tsx
import { SignUpForm } from "@/components/auth/sign-up-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SignUpPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Create account</CardTitle>
          <CardDescription>
            Join us to start your English reading journey.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignUpForm redirectUrl={`/${locale}`} />
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <a href={`/${locale}/sign-in`} className="text-primary hover:underline">
              Sign in
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 6.5 Update Auth Controls

Replace `src/components/layout/auth-controls.tsx`:

```tsx
"use client";

import { useSession } from "@/hooks/use-session";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, LogOut, Settings } from "lucide-react";

interface AuthControlsProps {
  compact?: boolean;
  variant?: "default" | "rail";
}

export function AuthControls({
  compact = false,
  variant = "default",
}: AuthControlsProps) {
  const router = useRouter();
  const { session, loading } = useSession();
  const isRail = variant === "rail";

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/");
          router.refresh();
        },
      },
    });
  };

  if (loading) {
    return (
      <div className="w-10 h-10 animate-pulse rounded-full bg-muted" />
    );
  }

  if (!session?.user) {
    return (
      <>
        <Button variant="ghost" size={compact || isRail ? "icon" : "sm"} asChild>
          <a href="/sign-in" className={cn(isRail ? "w-10 h-10" : "")}>
            Sign in
          </a>
        </Button>
        {!compact && !isRail && (
          <Button size="sm" asChild>
            <a href="/sign-up">Sign up</a>
          </Button>
        )}
      </>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className={cn("rounded-full", isRail ? "w-10 h-10" : "gap-2")}>
          {session.user.image ? (
            <img
              src={session.user.image}
              alt={session.user.name || "User"}
              className="w-9 h-9 rounded-full"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
          )}
          {!isRail && (
            <span className="text-sm font-medium">{session.user.name}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <a href="/settings">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="w-4 h-4 mr-2" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

## Success Criteria

- [ ] Sign-in page uses custom `SignInForm` component
- [ ] Sign-up page uses custom `SignUpForm` component
- [ ] Auth controls shows user avatar when signed in
- [ ] Sign-out works correctly
- [ ] OAuth buttons trigger correct flows (when providers configured)

## Risk Assessment

- **Risk:** Dropdown menu components may not exist in shadcn/ui
- **Mitigation:** Install required components: `npx shadcn add dropdown-menu`

## Next Steps

Proceed to Phase 7: Feature Updates
