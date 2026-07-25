import { createAuthClient } from "better-auth/react";
import { oneTapClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  plugins: [
    // Google One Tap popup. The client ID is intentionally public — Google's
    // GIS library runs in the browser and ships it to Google's servers.
    oneTapClient({
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "",
      uxMode: "popup",
      cancelOnTapOutside: true,
      context: "signin",
    }),
  ],
});
