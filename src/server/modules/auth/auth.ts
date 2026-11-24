import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { emailOTP, oAuthProxy, username } from "better-auth/plugins";
import { pool } from "@/server/lib/db";
import {
  OTP_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  passwordError,
  isValidUsernameFormat,
} from "@/shared/auth/credential-rules";
import { claimUnverifiedUserForOAuth, deletePendingPasswordSignUp } from "./auth-repository";
import { sendOtpEmail } from "./otp-mailer";

// Endpoints that set a password, and the body field that carries it. Better
// Auth checks only the length; the shared rules also require a digit.
const PASSWORD_FIELDS: Record<string, string> = {
  "/sign-up/email": "password",
  "/change-password": "newPassword",
  "/reset-password": "newPassword",
  "/email-otp/reset-password": "password",
};

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

  // Password sign-up stays signed out until the email is verified with the
  // OTP that `emailOTP` sends; verifying it signs the user in.
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: PASSWORD_MIN_LENGTH,
    maxPasswordLength: PASSWORD_MAX_LENGTH,
    // A reset (by the forget-password OTP) signs out every other device.
    revokeSessionsOnPasswordReset: true,
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
  },

  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      const field = PASSWORD_FIELDS[ctx.path];
      const password: unknown = field ? ctx.body?.[field] : undefined;
      if (typeof password === "string" && passwordError(password) === "password.no_digit") {
        throw new APIError("BAD_REQUEST", {
          code: "PASSWORD_NO_DIGIT",
          message: "Password must contain at least one digit",
        });
      }
      if (
        ctx.path === "/sign-up/email" &&
        typeof ctx.body?.email === "string" &&
        typeof password === "string" &&
        !passwordError(password)
      ) {
        await deletePendingPasswordSignUp(ctx.body.email);
      }
    }),
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
    // Adds "User"."username" / "displayUsername" and /sign-in/username.
    username({
      minUsernameLength: USERNAME_MIN_LENGTH,
      maxUsernameLength: USERNAME_MAX_LENGTH,
      usernameValidator: isValidUsernameFormat,
    }),
    emailOTP({
      // Email verification sends a 6-digit code instead of a link.
      overrideDefaultEmailVerification: true,
      otpLength: OTP_LENGTH,
      expiresIn: 5 * 60,
      allowedAttempts: 5,
      sendVerificationOTP: ({ email, otp, type }) => sendOtpEmail(email, otp, type),
    }),
  ],

  trustedOrigins: [
    "http://localhost:3000",
    "https://*.vercel.app",
  ],

  account: {
    accountLinking: { enabled: true, trustedProviders: ["google"] },
  },

  databaseHooks: {
    account: {
      create: {
        // Linking never changes emailVerified, so a same-email Google sign-in
        // would otherwise land in an unverified account whose password someone
        // else may know. See claimUnverifiedUserForOAuth.
        after: async (account) => {
          if (account.providerId === "google") await claimUnverifiedUserForOAuth(account.userId);
        },
      },
    },
  },

  user: {
    modelName: "User",
    additionalFields: {
      tier: { type: "string", required: false, defaultValue: "FREE" },
    },
    // Self-service deletion from Settings. Every table references "User" with
    // ON DELETE CASCADE, so one delete removes all of the user's data.
    // Without a password the session must be fresh (signed in within
    // session.freshAge, one day by default).
    deleteUser: { enabled: true },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 5 * 60, strategy: "compact" },
  },
});
