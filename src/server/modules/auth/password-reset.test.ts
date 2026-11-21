// "Forgot password" by email OTP, which is also how a Google-only user adds a
// password. Driven through Better Auth's server API; outgoing email is captured.
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pool } from "@/server/lib/db";
import { deleteTestUsers } from "@/server/test/users";
import { sendOtpEmail } from "./otp-mailer";
import { auth } from "./auth";

vi.mock("./otp-mailer", () => ({ sendOtpEmail: vi.fn(async () => {}) }));

const OLD_PASSWORD = "old-password-1";
const NEW_PASSWORD = "new-password-2";
const userIds: string[] = [];
afterEach(() => deleteTestUsers(userIds));
beforeEach(() => vi.mocked(sendOtpEmail).mockClear());

const newEmail = () => `reset-${randomUUID().slice(0, 8)}@test.invalid`;

/** A verified user who signed up with a password. */
async function createPasswordUser() {
  const email = newEmail();
  const { user } = await auth.api.signUpEmail({
    body: { email, name: "Reset", username: `r${randomUUID().slice(0, 8)}`, password: OLD_PASSWORD },
  });
  userIds.push(user.id);
  await pool.query(`UPDATE "User" SET "emailVerified" = true WHERE "id" = $1`, [user.id]);
  return { email, userId: user.id };
}

/** A user who only ever signed in with Google. */
async function createGoogleUser() {
  const { internalAdapter } = await auth.$context;
  const email = newEmail();
  const user = await internalAdapter.createUser(
    { name: "Google", email, emailVerified: true },
    { method: "oauth", oauth: { providerId: "google" } },
  );
  userIds.push(user.id);
  await internalAdapter.linkAccount({ userId: user.id, providerId: "google", accountId: `g-${randomUUID()}` });
  return { email, userId: user.id };
}

async function requestResetCode(email: string): Promise<string> {
  await auth.api.requestPasswordResetEmailOTP({ body: { email } });
  const call = vi.mocked(sendOtpEmail).mock.calls.findLast(([to]) => to === email);
  if (!call) throw new Error(`No OTP was sent to ${email}`);
  expect(call[2]).toBe("forget-password");
  return call[1];
}

async function errorCode(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
  } catch (error) {
    return (error as { body?: { code?: string } }).body?.code;
  }
  throw new Error("Expected the call to fail");
}

const signIn = (email: string, password: string) => auth.api.signInEmail({ body: { email, password } });

describe("password reset by email OTP", () => {
  it("replaces the password and signs out every existing session", async () => {
    const { email, userId } = await createPasswordUser();
    await signIn(email, OLD_PASSWORD);
    const otp = await requestResetCode(email);

    await auth.api.resetPasswordEmailOTP({ body: { email, otp, password: NEW_PASSWORD } });

    await expect(signIn(email, NEW_PASSWORD)).resolves.toMatchObject({ token: expect.any(String) });
    expect(await errorCode(signIn(email, OLD_PASSWORD))).toBe("INVALID_EMAIL_OR_PASSWORD");
    const { rows } = await pool.query<{ count: number }>(
      `SELECT COUNT(*)::int AS "count" FROM "session" WHERE "userId" = $1`,
      [userId],
    );
    expect(rows[0].count).toBe(1); // only the sign-in made after the reset
  });

  it("lets a Google-only user add a password and keep Google", async () => {
    const { email, userId } = await createGoogleUser();
    const otp = await requestResetCode(email);

    await auth.api.resetPasswordEmailOTP({ body: { email, otp, password: NEW_PASSWORD } });

    await expect(signIn(email, NEW_PASSWORD)).resolves.toMatchObject({ token: expect.any(String) });
    const { rows } = await pool.query<{ providerId: string }>(
      `SELECT "providerId" FROM "account" WHERE "userId" = $1 ORDER BY "providerId"`,
      [userId],
    );
    expect(rows.map((r) => r.providerId)).toEqual(["credential", "google"]);
  });

  it("rejects a wrong code and a new password that breaks the rules", async () => {
    const { email } = await createPasswordUser();
    const otp = await requestResetCode(email);
    const wrong = otp === "000000" ? "111111" : "000000";

    expect(
      await errorCode(auth.api.resetPasswordEmailOTP({ body: { email, otp: wrong, password: NEW_PASSWORD } })),
    ).toBe("INVALID_OTP");
    expect(
      await errorCode(auth.api.resetPasswordEmailOTP({ body: { email, otp, password: "no-digits-here" } })),
    ).toBe("PASSWORD_NO_DIGIT");
    await expect(signIn(email, OLD_PASSWORD)).resolves.toMatchObject({ token: expect.any(String) });
  });

  it("answers an unknown email like a known one, without sending anything", async () => {
    await expect(auth.api.requestPasswordResetEmailOTP({ body: { email: newEmail() } })).resolves.toMatchObject({
      success: true,
    });
    expect(vi.mocked(sendOtpEmail)).not.toHaveBeenCalled();
  });
});
