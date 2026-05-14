# OAuth Setup Guide — Google Sign-In

**English Reading Training App**

---

## Overview

This app uses Supabase Auth for authentication with Google OAuth support. The OAuth flow uses PKCE via `@supabase/ssr` with server-side code exchange.

---

## Prerequisites

- Supabase project created at [supabase.com/dashboard](https://supabase.com/dashboard)
- Google Cloud Console project with OAuth consent screen configured

---

## Step 1: Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Navigate to **APIs & Services → OAuth consent screen**
   - Select **External** user type
   - Fill in app name, user support email, developer contact email
   - Add test users (your email) if in "Testing" mode
4. Navigate to **APIs & Services → Credentials**
   - Click **Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: `ReadingPro (Supabase)`
   - Authorized JavaScript origins: see URLs below per environment
   - Authorized redirect URIs: see URLs below per environment
5. Copy the **Client ID** and **Client Secret**

---

## Step 2: Configure Supabase Dashboard

1. Go to [Supabase Dashboard → Authentication → Providers → Google](https://supabase.com/dashboard/project/_/auth/providers)
2. Toggle **Enable Google provider**
3. Paste **Client ID** from Google Cloud Console
4. Paste **Client Secret** from Google Cloud Console
5. Click **Save**

Also configure redirect URLs:
1. Go to **Authentication → URL Configuration**
2. **Site URL**: your app's base URL per environment (see below)
3. **Redirect URLs**: add the callback URL per environment

---

## Environment URLs

**IMPORTANT:** Google OAuth routes through Supabase's servers, NOT directly to your app. The `redirect_uri_mismatch` error means Google doesn't recognize the Supabase callback URL. You MUST add the Supabase project URL to Google Cloud Console.

The flow is: `Browser → Supabase Auth → Google (uses supabase.co/auth/v1/callback) → Supabase → Browser (redirects to your app URL)`.

### Local Development

| Setting | Where to configure | Value |
|---------|-------------------|-------|
| **Site URL** | Supabase Dashboard → Auth → URL Configuration | `http://localhost:3000` |
| **Redirect URL** | Supabase Dashboard → Auth → URL Configuration | `http://localhost:3000/auth/callback` |
| **Google JS Origin** | Google Cloud Console → Credentials | `http://localhost:3000` |
| **Google Redirect URI** | Google Cloud Console → Credentials | `https://<project-ref>.supabase.co/auth/v1/callback` |

### Vercel Development (Preview)

| Setting | Where to configure | Value |
|---------|-------------------|-------|
| **Site URL** | Supabase Dashboard → Auth → URL Configuration | `https://your-app-git-branch-your-team.vercel.app` |
| **Redirect URL** | Supabase Dashboard → Auth → URL Configuration | `https://your-app-git-branch-your-team.vercel.app/auth/callback` |
| **Google JS Origin** | Google Cloud Console → Credentials | `https://your-app-git-branch-your-team.vercel.app` |
| **Google Redirect URI** | Google Cloud Console → Credentials | `https://<project-ref>.supabase.co/auth/v1/callback` |

Find your preview URL in Vercel dashboard → your project → Deployments → latest preview deployment.

### Vercel Production

| Setting | Where to configure | Value |
|---------|-------------------|-------|
| **Site URL** | Supabase Dashboard → Auth → URL Configuration | `https://your-app.vercel.app` |
| **Redirect URL** | Supabase Dashboard → Auth → URL Configuration | `https://your-app.vercel.app/auth/callback` |
| **Google JS Origin** | Google Cloud Console → Credentials | `https://your-app.vercel.app` |
| **Google Redirect URI** | Google Cloud Console → Credentials | `https://<project-ref>.supabase.co/auth/v1/callback` |

---

## Step 3: Environment Variables

### `.env.local` (local)

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Vercel Project Settings (production/preview)

1. Go to Vercel dashboard → your project → **Settings → Environment Variables**
2. Add both variables with the same values
3. Select **Production**, **Preview**, and **Development** environments

---

## Step 4: Verify

1. Start dev server: `pnpm dev`
2. Navigate to `http://localhost:3000/sign-in`
3. Click "Sign in with Google"
4. You should be redirected to Google sign-in, then back to `/study`
5. Check your Supabase Dashboard → Authentication → Users to confirm the user was created

---

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| `redirect_uri_mismatch` error | Google doesn't recognize the redirect URI | Add `https://<project-ref>.supabase.co/auth/v1/callback` to Google Cloud Console authorized redirect URIs (NOT your localhost URL — Google routes through Supabase) |
| `invalid_client` error | Wrong Client ID/Secret in Supabase | Double-check credentials match between Google and Supabase |
| OAuth redirect loops | Site URL misconfigured in Supabase | Set Site URL to exact app base URL |
| Callback returns `?error=auth_callback_failed` | Code exchange failed | Check Supabase logs in Dashboard → Logs → Auth |
| `access_denied` on Google consent | App in testing mode, user not in test list | Add your email to OAuth consent screen test users |

---

## Architecture

```
Browser                    Supabase                   Google
  │                          │                          │
  │── signInWithOAuth() ────>│                          │
  │<── redirect URL ────────│                          │
  │                          │                          │
  │── redirect to Google ─────────────────────────────>│
  │<── auth code + callback ──────────────────────────│
  │                          │                          │
  │── GET /auth/callback ──>│                          │
  │   (with ?code=...)       │                          │
  │                          │── exchangeCodeForSession │
  │<── set session cookie ──│                          │
  │── redirect to /study ───│                          │
```

---

**Last Updated:** 2026-05-07
