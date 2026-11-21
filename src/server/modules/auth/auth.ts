import { betterAuth } from "better-auth";
import { oAuthProxy } from "better-auth/plugins";
import { pool } from "@/server/lib/db";

const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const auth = betterAuth({
  // Better Auth's built-in Kysely adapter on the app's pool. Flyway owns the
  // auth tables (db/migrations); never run Better Auth's own migrate command.
  database: pool,

  baseURL: {
    // Do not allow the API server's own host (localhost:3001): the dev proxy
    // forwards Host as 3001, and allowing it makes auth redirects land on the
    // API server instead of the browser origin. Unknown hosts use `fallback`.
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
    modelName: "User",
    additionalFields: {
      tier: { type: "string", required: false, defaultValue: "FREE" },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 5 * 60, strategy: "compact" },
  },
});
