import * as React from "react";
import { Link, useNavigate } from "react-router";
import { PillButton } from "@/client/components/ui/pill-button";
import { authClient } from "@/client/lib/auth/auth-client";
import {
  AUTH_FORM_MESSAGES,
  PASSWORD_HINT,
  credentialErrorText,
  getAuthErrorMessage,
} from "@/client/lib/api/error-message";
import {
  OTP_LENGTH,
  confirmPasswordError,
  emailError,
  passwordError,
} from "@/shared/auth/credential-rules";
import { useResendCooldown } from "../hooks/use-resend-cooldown";
import { AuthField, AuthHeader, FormError } from "./auth-form-parts";
import { OtpCodeInput, ResendCodeButton } from "./otp-code-input";

/** Server error codes shown under the code field rather than above the form. */
const OTP_ERROR_CODES = new Set(["INVALID_OTP", "OTP_EXPIRED", "TOO_MANY_ATTEMPTS"]);
const PASSWORD_ERROR_CODES = new Set(["PASSWORD_TOO_SHORT", "PASSWORD_TOO_LONG", "PASSWORD_NO_DIGIT"]);

/**
 * Step 1 asks for the email and sends a code. The answer is the same whether
 * or not the email has an account, so the page never reveals who is registered.
 * Step 2 takes the code and a new password. A Google-only account gains a
 * password this way, and keeps Google.
 */
export function ForgotPasswordForm() {
  const [email, setEmail] = React.useState<string | null>(null);

  if (email) return <ResetPasswordStep email={email} onBack={() => setEmail(null)} />;
  return <RequestCodeStep onSent={setEmail} />;
}

function RequestCodeStep({ onSent }: { onSent: (email: string) => void }) {
  const [email, setEmail] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);
  const [formError, setFormError] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const fieldError = submitted ? credentialErrorText(emailError(email)) : undefined;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    setFormError("");
    if (emailError(email)) return;

    setSubmitting(true);
    const trimmed = email.trim();
    const { error } = await authClient.emailOtp.requestPasswordReset({ email: trimmed });
    setSubmitting(false);
    if (error) {
      setFormError(getAuthErrorMessage(error));
      return;
    }
    onSent(trimmed);
  };

  return (
    <div className="w-full">
      <AuthHeader title="Quên mật khẩu" />
      <FormError message={formError} />

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <AuthField
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldError}
          autoComplete="email"
          autoFocus
        />
        <PillButton type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Đang gửi mã..." : "Gửi mã"}
        </PillButton>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Nhớ mật khẩu rồi?{" "}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Đăng nhập
        </Link>
      </p>
    </div>
  );
}

type ResetErrors = { otp?: string; password?: string; confirmPassword?: string };

function ResetPasswordStep({ email, onBack }: { email: string; onBack: () => void }) {
  const navigate = useNavigate();
  const [otp, setOtp] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  // Fields stay quiet until the first submit, then re-check on every keystroke.
  const [submitted, setSubmitted] = React.useState(false);
  const [serverErrors, setServerErrors] = React.useState<ResetErrors>({});
  const [formError, setFormError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  // Set when the password changed but signing in with it did not work.
  const [done, setDone] = React.useState(false);
  const cooldown = useResendCooldown();

  const clientErrors: ResetErrors = submitted
    ? {
        otp: otp.length === OTP_LENGTH ? undefined : AUTH_FORM_MESSAGES.otpIncomplete,
        password: credentialErrorText(passwordError(password)),
        confirmPassword: credentialErrorText(confirmPasswordError(password, confirmPassword)),
      }
    : {};
  const errorFor = (field: keyof ResetErrors) => clientErrors[field] ?? serverErrors[field];

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    setFormError("");
    setNotice("");
    if (otp.length !== OTP_LENGTH || passwordError(password) || confirmPasswordError(password, confirmPassword)) {
      return;
    }

    setSubmitting(true);
    const { error } = await authClient.emailOtp.resetPassword({ email, otp, password });
    if (error) {
      setSubmitting(false);
      const message = getAuthErrorMessage(error);
      if (error.code && OTP_ERROR_CODES.has(error.code)) {
        setServerErrors({ otp: message });
        setOtp("");
      } else if (error.code && PASSWORD_ERROR_CODES.has(error.code)) {
        setServerErrors({ password: message });
      } else {
        setFormError(message);
      }
      return;
    }

    // The reset signs every device out; sign this one in with the new password.
    const { error: signInError } = await authClient.signIn.email({ email, password });
    if (signInError) {
      setSubmitting(false);
      setDone(true);
      return;
    }
    navigate("/study", { replace: true });
  };

  const handleResend = async () => {
    setFormError("");
    setNotice("");
    cooldown.restart();
    const { error } = await authClient.emailOtp.requestPasswordReset({ email });
    if (error) {
      setFormError(getAuthErrorMessage(error));
      cooldown.clear();
      return;
    }
    setNotice("Đã gửi mã mới.");
  };

  if (done) {
    return (
      <div className="w-full text-center">
        <AuthHeader title="Đã đặt mật khẩu mới" subtitle="Hãy đăng nhập bằng mật khẩu vừa đặt." />
        <PillButton asChild className="w-full">
          <Link to="/login">Đăng nhập</Link>
        </PillButton>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full" noValidate>
      <AuthHeader
        title="Đặt mật khẩu mới"
        subtitle={
          <>
            Đã gửi mã OTP tới <span className="font-medium text-foreground">{email}</span>
          </>
        }
      />
      <FormError message={formError} />

      <div className="space-y-4">
        <OtpCodeInput
          value={otp}
          onChange={(value) => {
            setOtp(value);
            setServerErrors((prev) => ({ ...prev, otp: undefined }));
          }}
          error={errorFor("otp")}
          autoFocus
        />
        <AuthField
          id="password"
          label="Mật khẩu mới"
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setServerErrors((prev) => ({ ...prev, password: undefined }));
          }}
          error={errorFor("password")}
          hint={PASSWORD_HINT}
          autoComplete="new-password"
        />
        <AuthField
          id="confirmPassword"
          label="Nhập lại mật khẩu mới"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={errorFor("confirmPassword")}
          autoComplete="new-password"
        />
        <PillButton type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Đang lưu..." : "Đặt mật khẩu"}
        </PillButton>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <button type="button" onClick={onBack} className="text-muted-foreground hover:text-foreground">
          ← Đổi email
        </button>
        <ResendCodeButton secondsLeft={cooldown.secondsLeft} onResend={handleResend} />
      </div>

      {notice && <p className="mt-3 text-center text-sm text-success">{notice}</p>}
    </form>
  );
}
