import "server-only";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
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
        // keeps it idempotent across OAuth account-linking and re-signup.
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
} satisfies BetterAuthOptions);

// Type export for use in other files
export type Auth = typeof auth;
