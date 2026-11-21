import { createAuthClient } from "better-auth/react";
import {
  emailOTPClient,
  inferAdditionalFields,
  usernameClient,
} from "better-auth/client/plugins";

// Plugins mirror the server's in src/server/modules/auth/auth.ts.
export const authClient = createAuthClient({
  plugins: [
    inferAdditionalFields({ user: { tier: { type: "string", required: false } } }),
    usernameClient(),
    emailOTPClient(),
  ],
});
