// Password sign-up with a username, email OTP verification, then sign-in,
// driven through Better Auth's server API. Outgoing email is captured.
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pool } from "@/server/lib/db";
import { deleteTestUsers } from "@/server/test/users";
import { sendOtpEmail } from "./otp-mailer";
import { auth } from "./auth";

vi.mock("./otp-mailer", () => ({ sendOtpEmail: vi.fn(async () => {}) }));

const PASSWORD = "correct-horse-1";
const userIds: string[] = [];
afterEach(() => deleteTestUsers(userIds));
beforeEach(() => vi.mocked(sendOtpEmail).mockClear());

function newIdentity() {
  const suffix = randomUUID().slice(0, 8);
  return { username: `Reader_${suffix}`, email: `signup-${suffix}@test.invalid` };
}

async function signUp(identity = newIdentity()) {
  const result = await auth.api.signUpEmail({
    body: { ...identity, name: identity.username, password: PASSWORD },
  });
  userIds.push(result.user.id);
  return { ...identity, result };
}

/** The last code emailed to `email`, as the user would read it. */
function lastOtpFor(email: string): string {
  const call = vi.mocked(sendOtpEmail).mock.calls.findLast(([to]) => to === email);
  if (!call) throw new Error(`No OTP was sent to ${email}`);
  expect(call[2]).toBe("email-verification");
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

describe("password sign-up with email OTP", () => {
  it("creates an unverified user without a session and emails a 6-digit code", async () => {
    const { email, username, result } = await signUp();

    expect(result.token).toBeNull();
    expect(lastOtpFor(email)).toMatch(/^\d{6}$/);

    const { rows } = await pool.query(
      `SELECT "emailVerified", "username", "displayUsername" FROM "User" WHERE "id" = $1`,
      [result.user.id],
    );
    expect(rows[0]).toEqual({
      emailVerified: false,
      username: username.toLowerCase(),
      displayUsername: username,
    });
  });

  it("refuses password sign-in until the email is verified", async () => {
    const { email, username } = await signUp();

    expect(await errorCode(auth.api.signInEmail({ body: { email, password: PASSWORD } }))).toBe(
      "EMAIL_NOT_VERIFIED",
    );
    expect(await errorCode(auth.api.signInUsername({ body: { username, password: PASSWORD } }))).toBe(
      "EMAIL_NOT_VERIFIED",
    );
  });

  it("rejects a wrong code, then verifies the right one and signs the user in", async () => {
    const { email, result } = await signUp();
    const otp = lastOtpFor(email);
    const wrong = otp === "000000" ? "111111" : "000000";

    expect(await errorCode(auth.api.verifyEmailOTP({ body: { email, otp: wrong } }))).toBe("INVALID_OTP");

    const { headers, response } = await auth.api.verifyEmailOTP({
      body: { email, otp },
      returnHeaders: true,
    });
    expect(response.status).toBe(true);
    expect(response.token).toEqual(expect.any(String));
    expect(headers.get("set-cookie")).toContain("better-auth.session_token");

    const { rows } = await pool.query(`SELECT "emailVerified" FROM "User" WHERE "id" = $1`, [result.user.id]);
    expect(rows[0].emailVerified).toBe(true);
  });

  it("resends a fresh code that replaces the previous one", async () => {
    const { email } = await signUp();
    const first = lastOtpFor(email);

    await auth.api.sendVerificationOTP({ body: { email, type: "email-verification" } });
    const second = lastOtpFor(email);

    if (first !== second) {
      expect(await errorCode(auth.api.verifyEmailOTP({ body: { email, otp: first } }))).toBe("INVALID_OTP");
    }
    await expect(auth.api.verifyEmailOTP({ body: { email, otp: second } })).resolves.toMatchObject({
      status: true,
    });
  });

  it("signs in by username, case-insensitively, after verification", async () => {
    const { email, username } = await signUp();
    await auth.api.verifyEmailOTP({ body: { email, otp: lastOtpFor(email) } });

    const byUsername = await auth.api.signInUsername({
      body: { username: username.toUpperCase(), password: PASSWORD },
    });
    expect(byUsername?.token).toEqual(expect.any(String));

    const byEmail = await auth.api.signInEmail({ body: { email, password: PASSWORD } });
    expect(byEmail.token).toEqual(expect.any(String));

    expect(
      await errorCode(auth.api.signInUsername({ body: { username, password: "wrong-password" } })),
    ).toBe("INVALID_USERNAME_OR_PASSWORD");
  });

  it("refuses a password without a letter, without a digit, or shorter than 8 characters", async () => {
    const { username, email } = newIdentity();
    const attempt = (password: string) =>
      errorCode(auth.api.signUpEmail({ body: { username, email, name: username, password } }));

    expect(await attempt("no-digits-here")).toBe("PASSWORD_NO_DIGIT");
    expect(await attempt("12345678")).toBe("PASSWORD_NO_LETTER");
    expect(await attempt("short1")).toBe("PASSWORD_TOO_SHORT");
    expect(vi.mocked(sendOtpEmail)).not.toHaveBeenCalled();
  });

  it("replaces an abandoned, unverified sign-up so only the new password works", async () => {
    const { email, result: first } = await signUp();
    const retry = await auth.api.signUpEmail({
      body: { email, username: newIdentity().username, name: "Retry", password: "new-password-2" },
    });
    userIds.push(retry.user.id);
    expect(retry.user.id).not.toBe(first.user.id);

    await auth.api.verifyEmailOTP({ body: { email, otp: lastOtpFor(email) } });

    await expect(auth.api.signInEmail({ body: { email, password: "new-password-2" } })).resolves.toMatchObject({
      token: expect.any(String),
    });
    expect(await errorCode(auth.api.signInEmail({ body: { email, password: PASSWORD } }))).toBe(
      "INVALID_EMAIL_OR_PASSWORD",
    );
  });

  it("leaves a verified account and its password alone when the email signs up again", async () => {
    const { email, result } = await signUp();
    await auth.api.verifyEmailOTP({ body: { email, otp: lastOtpFor(email) } });

    await auth.api
      .signUpEmail({ body: { email, username: newIdentity().username, name: "Again", password: "other-pass-3" } })
      .catch(() => undefined);

    const { rows } = await pool.query(`SELECT "id" FROM "User" WHERE "email" = $1`, [email]);
    expect(rows).toEqual([{ id: result.user.id }]);
    await expect(auth.api.signInEmail({ body: { email, password: PASSWORD } })).resolves.toMatchObject({
      token: expect.any(String),
    });
  });

  it("refuses a username that is already taken", async () => {
    const { username } = await signUp();
    const other = newIdentity();

    expect(
      await errorCode(
        auth.api.signUpEmail({
          body: { username, email: other.email, name: username, password: PASSWORD },
        }),
      ),
    ).toBe("USERNAME_IS_ALREADY_TAKEN");
  });
});

describe("Google sign-in onto a password account", () => {
  async function credentialCount(userId: string): Promise<number> {
    const { rows } = await pool.query<{ count: number }>(
      `SELECT COUNT(*)::int AS "count" FROM "account" WHERE "userId" = $1 AND "providerId" = 'credential'`,
      [userId],
    );
    return rows[0].count;
  }

  async function linkGoogle(userId: string) {
    const { internalAdapter } = await auth.$context;
    await internalAdapter.linkAccount({ userId, providerId: "google", accountId: `google-${randomUUID()}` });
  }

  it("verifies an unverified user and drops the password nobody proved", async () => {
    const { result } = await signUp();
    expect(await credentialCount(result.user.id)).toBe(1);

    await linkGoogle(result.user.id);

    expect(await credentialCount(result.user.id)).toBe(0);
    const { rows } = await pool.query(`SELECT "emailVerified" FROM "User" WHERE "id" = $1`, [result.user.id]);
    expect(rows[0].emailVerified).toBe(true);
  });

  it("keeps the password of a user who already verified the email", async () => {
    const { email, result } = await signUp();
    await auth.api.verifyEmailOTP({ body: { email, otp: lastOtpFor(email) } });

    await linkGoogle(result.user.id);

    expect(await credentialCount(result.user.id)).toBe(1);
  });
});
