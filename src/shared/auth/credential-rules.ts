// Username and password rules, shared so the sign-up form and the server
// enforce exactly the same thing. Functions return error keys; the client
// turns keys into text (src/client/lib/api/error-message.ts).

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;
/**
 * One word of letters and digits in any script (Vietnamese accents included),
 * plus "_". The server passes the same check to Better Auth's
 * username plugin, which would otherwise allow ASCII only.
 */
const USERNAME_PATTERN = /^[\p{L}\p{M}\p{N}_]+$/u;

/** Usernames are compared in NFC, so an accented name typed on any OS is one name. */
export function normalizeUsername(username: string): string {
  return username.trim().normalize("NFC");
}

export function isValidUsernameFormat(username: string): boolean {
  return USERNAME_PATTERN.test(username);
}

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
const HAS_DIGIT = /\d/;

/** Digits in an emailed one-time code. */
export const OTP_LENGTH = 6;

// Deliberately loose: a real address is proven by the OTP, not by this check.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type CredentialErrorKey =
  | "username.required"
  | "username.too_short"
  | "username.too_long"
  | "username.invalid"
  | "email.required"
  | "email.invalid"
  | "password.required"
  | "password.too_short"
  | "password.too_long"
  | "password.no_digit"
  | "confirmPassword.required"
  | "confirmPassword.mismatch"
  | "identifier.required";

export function usernameError(username: string): CredentialErrorKey | undefined {
  const value = normalizeUsername(username);
  if (!value) return "username.required";
  if (value.length < USERNAME_MIN_LENGTH) return "username.too_short";
  if (value.length > USERNAME_MAX_LENGTH) return "username.too_long";
  if (!isValidUsernameFormat(value)) return "username.invalid";
  return undefined;
}

export function emailError(email: string): CredentialErrorKey | undefined {
  const value = email.trim();
  if (!value) return "email.required";
  if (!EMAIL_PATTERN.test(value)) return "email.invalid";
  return undefined;
}

/** The first password rule that `password` breaks, if any. */
export function passwordError(password: string): CredentialErrorKey | undefined {
  if (!password) return "password.required";
  if (password.length < PASSWORD_MIN_LENGTH) return "password.too_short";
  if (password.length > PASSWORD_MAX_LENGTH) return "password.too_long";
  if (!HAS_DIGIT.test(password)) return "password.no_digit";
  return undefined;
}

export function confirmPasswordError(password: string, confirmation: string): CredentialErrorKey | undefined {
  if (!confirmation) return "confirmPassword.required";
  if (confirmation !== password) return "confirmPassword.mismatch";
  return undefined;
}

export type RegistrationField = "username" | "email" | "password" | "confirmPassword";
export type RegistrationValues = Record<RegistrationField, string>;
export type RegistrationErrors = Partial<Record<RegistrationField, CredentialErrorKey>>;

export function validateRegistration(values: RegistrationValues): RegistrationErrors {
  const errors: RegistrationErrors = {
    username: usernameError(values.username),
    email: emailError(values.email),
    password: passwordError(values.password),
    confirmPassword: confirmPasswordError(values.password, values.confirmPassword),
  };
  return Object.fromEntries(Object.entries(errors).filter(([, key]) => key)) as RegistrationErrors;
}
