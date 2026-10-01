import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  // Mirrors `user.additionalFields` in src/server/modules/auth/auth.ts.
  plugins: [inferAdditionalFields({ user: { tier: { type: "string", required: false } } })],
});
