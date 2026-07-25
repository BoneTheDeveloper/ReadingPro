import { createAuthClient } from "better-auth/react";

// Google sign-in is triggered by the UI via `authClient.signIn.social({
// provider: "google", popupWindow: true })`. `popupWindow: true` opens a
// mini browser window for the OAuth flow instead of redirecting the main
// page. Server-side provider config in `betterAuth({ socialProviders })`
// owns the real clientId/clientSecret.
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_SITE_URL,
});
