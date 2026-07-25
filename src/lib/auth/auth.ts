import "server-only";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { oneTap } from "better-auth/plugins";
import { prisma } from "@/lib/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      // Force the Google account chooser on every sign-in (security baseline).
      // Better Auth forwards this as the `prompt` query param to Google's authorize URL.
      prompt: "select_account",
    },
  },
  account: {
    accountLinking: {
      // Auto-link Google accounts that share a verified email with existing
      // credential accounts. Add other trusted providers here only if they
      // verify email ownership.
      enabled: true,
      trustedProviders: ["google"],
    },
  },
  user: {
    additionalFields: {
      tier: {
        type: "string",
        required: false,
        defaultValue: "FREE",
      },
      stripeCustomerId: {
        type: "string",
        required: false,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        // Every auth user needs an app-side UserProfile: it is the owner
        // (foreign key target) for passages, uploads, vocabulary, etc. Runs
        // after the `user` row is committed so the FK is satisfiable. Upsert
        // keeps it idempotent across OAuth account-linking.
        after: async (user) => {
          await prisma.userProfile.upsert({
            where: { id: user.id },
            create: { id: user.id },
            update: {},
          });
        },
      },
    },
  },
  plugins: [
    // One Tap shows Google's credential picker as a popup iframe; falls back
    // to the standard Google OAuth redirect when no stored account is found.
    // Reads clientId/clientSecret from socialProviders.google above.
    oneTap(),
  ],
} satisfies BetterAuthOptions);
