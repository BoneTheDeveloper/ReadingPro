import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { oAuthProxy } from "better-auth/plugins";
import prisma from "@/lib/prisma";

const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),

  baseURL: {
    allowedHosts: ["*.vercel.app", "localhost:3000"],
    fallback: productionUrl,
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      prompt: "select_account",
    },
  },

  plugins: [
    oAuthProxy({
      productionURL: productionUrl,
      secret: process.env.OAUTH_PROXY_SECRET,
    }),
  ],

  trustedOrigins: [
    "http://localhost:3000",
    "https://*.vercel.app",
  ],

  account: {
    accountLinking: { enabled: true, trustedProviders: ["google"] },
  },

  user: {
    additionalFields: {
      tier: { type: "string", required: false, defaultValue: "FREE" },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 5 * 60, strategy: "compact" },
  },

  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await prisma.userProfile.upsert({
            where: { id: user.id },
            create: { id: user.id, updatedAt: new Date() },
            update: {},
          });
        },
      },
    },
  },
});
