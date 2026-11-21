import * as React from "react";
import { PillButton } from "@/client/components/ui/pill-button";
import { authClient } from "@/client/lib/auth/auth-client";
import { AUTH_FORM_MESSAGES, getAuthErrorMessage } from "@/client/lib/api/error-message";
import { OTP_LENGTH } from "@/shared/auth/credential-rules";
import { useResendCooldown } from "../hooks/use-resend-cooldown";
import { AuthHeader, FormError } from "./auth-form-parts";
import { OtpCodeInput, ResendCodeButton } from "./otp-code-input";

interface OtpVerificationFormProps {
  /** The address a code was just sent to. */
  email: string;
  /** Runs after the email is verified; the server has signed the user in by then. */
  onVerified: () => void;
  onBack: () => void;
}

export function OtpVerificationForm({ email, onVerified, onBack }: OtpVerificationFormProps) {
  const [otp, setOtp] = React.useState("");
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const cooldown = useResendCooldown();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setNotice("");
    if (otp.length !== OTP_LENGTH) {
      setError(AUTH_FORM_MESSAGES.otpIncomplete);
      return;
    }
    setSubmitting(true);
    setError("");
    const { error: verifyError } = await authClient.emailOtp.verifyEmail({ email, otp });
    if (verifyError) {
      setError(getAuthErrorMessage(verifyError));
      setOtp("");
      setSubmitting(false);
      return;
    }
    onVerified();
  };

  const handleResend = async () => {
    setError("");
    setNotice("");
    cooldown.restart();
    const { error: sendError } = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "email-verification",
    });
    if (sendError) {
      setError(getAuthErrorMessage(sendError));
      cooldown.clear();
      return;
    }
    setNotice("Đã gửi mã mới.");
  };

  return (
    <form onSubmit={handleSubmit} className="w-full" noValidate>
      <AuthHeader
        title="Xác thực email"
        subtitle={
          <>
            Nhập mã {OTP_LENGTH} số vừa gửi tới <span className="font-medium text-foreground">{email}</span>
          </>
        }
      />

      <FormError message={error} />
      <OtpCodeInput value={otp} onChange={setOtp} autoFocus />

      <PillButton type="submit" className="w-full mt-4" disabled={submitting}>
        {submitting ? "Đang xác thực..." : "Xác thực"}
      </PillButton>

      <div className="mt-4 flex items-center justify-between text-sm">
        <button type="button" onClick={onBack} className="text-muted-foreground hover:text-foreground">
          ← Quay lại
        </button>
        <ResendCodeButton secondsLeft={cooldown.secondsLeft} onResend={handleResend} />
      </div>

      {notice && <p className="mt-3 text-center text-sm text-success">{notice}</p>}
    </form>
  );
}
