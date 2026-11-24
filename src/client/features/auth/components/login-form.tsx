import * as React from "react";
import { Link, useNavigate } from "react-router";
import { PillButton } from "@/client/components/ui/pill-button";
import { authClient } from "@/client/lib/auth/auth-client";
import {
  AUTH_FORM_MESSAGES,
  credentialErrorText,
  getAuthErrorMessage,
} from "@/client/lib/api/error-message";
import { AuthField, AuthHeader, FormError, OrDivider } from "./auth-form-parts";
import { GoogleSignInButton } from "./google-sign-in-button";
import { OtpVerificationForm } from "./otp-verification-form";

/** Signs in with a username or an email plus password, or with Google. */
export function LoginForm() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  // Empty-field errors appear after the first submit, then follow the input.
  const [submitted, setSubmitted] = React.useState(false);
  const identifierError = submitted && !identifier.trim() ? credentialErrorText("identifier.required") : undefined;
  const passwordError = submitted && !password ? credentialErrorText("password.required") : undefined;
  // Set when a password sign-in hits an unverified email: finish the OTP step first.
  const [verifyEmail, setVerifyEmail] = React.useState<string | null>(null);

  const goToApp = () => navigate("/study", { replace: true });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    setError("");
    const id = identifier.trim().normalize("NFC");
    if (!id || !password) return;
    setSubmitting(true);
    const isEmail = id.includes("@");
    const { error: signInError } = isEmail
      ? await authClient.signIn.email({ email: id, password })
      : await authClient.signIn.username({ username: id, password });

    if (!signInError) {
      goToApp();
      return;
    }
    setSubmitting(false);

    if (signInError.code !== "EMAIL_NOT_VERIFIED") {
      setError(getAuthErrorMessage(signInError));
      return;
    }
    // A username sign-in does not tell us the address to send the code to.
    if (!isEmail) {
      setError(AUTH_FORM_MESSAGES.usernameUnverified);
      return;
    }
    const { error: sendError } = await authClient.emailOtp.sendVerificationOtp({
      email: id,
      type: "email-verification",
    });
    if (sendError) {
      setError(AUTH_FORM_MESSAGES.otpSendFailed);
      return;
    }
    setVerifyEmail(id);
  };

  if (verifyEmail) {
    return <OtpVerificationForm email={verifyEmail} onVerified={goToApp} onBack={() => setVerifyEmail(null)} />;
  }

  return (
    <div className="w-full">
      <AuthHeader title="Đăng nhập" />
      <FormError message={error} />

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <AuthField
          id="identifier"
          label="Tên đăng nhập hoặc email"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          error={identifierError}
          autoComplete="username"
        />
        <AuthField
          id="password"
          label="Mật khẩu"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={passwordError}
          autoComplete="current-password"
        />
        <div className="-mt-2 text-right text-sm">
          <Link to="/forgot-password" className="font-medium text-primary hover:underline">
            Quên mật khẩu?
          </Link>
        </div>
        <PillButton type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
        </PillButton>
      </form>

      <OrDivider />
      <GoogleSignInButton label="Đăng nhập với Google" disabled={submitting} onError={setError} />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Chưa có tài khoản?{" "}
        <Link to="/register" className="font-medium text-primary hover:underline">
          Đăng ký
        </Link>
      </p>
    </div>
  );
}
