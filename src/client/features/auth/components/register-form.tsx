import * as React from "react";
import { Link, useNavigate } from "react-router";
import { PillButton } from "@/client/components/ui/pill-button";
import { authClient } from "@/client/lib/auth/auth-client";
import {
  PASSWORD_HINT,
  credentialErrorText,
  getAuthErrorMessage,
} from "@/client/lib/api/error-message";
import {
  validateRegistration,
  type RegistrationField,
  type RegistrationValues,
} from "@/shared/auth/credential-rules";
import { AuthField, AuthHeader, FormError, OrDivider } from "./auth-form-parts";
import { GoogleSignInButton } from "./google-sign-in-button";
import { OtpVerificationForm } from "./otp-verification-form";

/** Server error codes that belong to one field, so they show under it. */
const SERVER_ERROR_FIELD: Record<string, RegistrationField> = {
  USERNAME_IS_ALREADY_TAKEN: "username",
  USERNAME_TOO_SHORT: "username",
  USERNAME_TOO_LONG: "username",
  INVALID_USERNAME: "username",
  USER_ALREADY_EXISTS: "email",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "email",
  INVALID_EMAIL: "email",
  PASSWORD_TOO_SHORT: "password",
  PASSWORD_TOO_LONG: "password",
  PASSWORD_NO_LETTER: "password",
  PASSWORD_NO_DIGIT: "password",
};

const EMPTY: RegistrationValues = { username: "", email: "", password: "", confirmPassword: "" };

/**
 * Step 1 creates the user with an unverified email; the server emails a code.
 * Step 2 verifies that code, which signs the user in.
 */
export function RegisterForm() {
  const navigate = useNavigate();
  const [step, setStep] = React.useState<"details" | "otp">("details");
  const [values, setValues] = React.useState<RegistrationValues>(EMPTY);
  // Fields stay quiet until the first submit, then re-check on every keystroke.
  const [submitted, setSubmitted] = React.useState(false);
  const [serverErrors, setServerErrors] = React.useState<Partial<Record<RegistrationField, string>>>({});
  const [formError, setFormError] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const clientErrors = submitted ? validateRegistration(values) : {};
  const fieldError = (field: RegistrationField) =>
    credentialErrorText(clientErrors[field]) ?? serverErrors[field];

  const update = (field: RegistrationField) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setValues((prev) => ({ ...prev, [field]: event.target.value }));
    setServerErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    setFormError("");
    if (Object.keys(validateRegistration(values)).length > 0) return;

    setSubmitting(true);
    const username = values.username.trim();
    const email = values.email.trim();
    const { error } = await authClient.signUp.email({
      email,
      password: values.password,
      name: username,
      username,
    });
    setSubmitting(false);
    if (error) {
      const field = error.code ? SERVER_ERROR_FIELD[error.code] : undefined;
      if (field) setServerErrors({ [field]: getAuthErrorMessage(error) });
      else setFormError(getAuthErrorMessage(error));
      return;
    }
    setValues((prev) => ({ ...prev, email }));
    setStep("otp");
  };

  if (step === "otp") {
    return (
      <OtpVerificationForm
        email={values.email}
        onVerified={() => navigate("/study", { replace: true })}
        onBack={() => setStep("details")}
      />
    );
  }

  return (
    <div className="w-full">
      <AuthHeader title="Tạo tài khoản" />
      <FormError message={formError} />

      <GoogleSignInButton label="Đăng ký với Google" disabled={submitting} onError={setFormError} />
      <OrDivider />

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <AuthField
          id="username"
          label="Tên đăng nhập"
          value={values.username}
          onChange={update("username")}
          error={fieldError("username")}
          autoComplete="username"
        />
        <AuthField
          id="email"
          label="Email"
          type="email"
          value={values.email}
          onChange={update("email")}
          error={fieldError("email")}
          autoComplete="email"
        />
        <AuthField
          id="password"
          label="Mật khẩu"
          type="password"
          value={values.password}
          onChange={update("password")}
          error={fieldError("password")}
          hint={PASSWORD_HINT}
          autoComplete="new-password"
        />
        <AuthField
          id="confirmPassword"
          label="Nhập lại mật khẩu"
          type="password"
          value={values.confirmPassword}
          onChange={update("confirmPassword")}
          error={fieldError("confirmPassword")}
          autoComplete="new-password"
        />
        <PillButton type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Đang gửi mã..." : "Đăng ký"}
        </PillButton>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Đã có tài khoản?{" "}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Đăng nhập
        </Link>
      </p>
    </div>
  );
}
