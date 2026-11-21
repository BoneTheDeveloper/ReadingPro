import { Input } from "@/client/components/ui/input";
import { OTP_LENGTH } from "@/shared/auth/credential-rules";

interface OtpCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoFocus?: boolean;
}

/** One numeric field for the emailed code; digits only, at most OTP_LENGTH. */
export function OtpCodeInput({ value, onChange, error, autoFocus }: OtpCodeInputProps) {
  return (
    <div className="space-y-1.5">
      <Input
        aria-label="Mã OTP"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d*"
        maxLength={OTP_LENGTH}
        placeholder="••••••"
        autoFocus={autoFocus}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "otp-error" : undefined}
        className="h-12 text-center text-xl font-semibold tracking-[0.5em] md:text-xl"
      />
      {error && (
        <p id="otp-error" className="text-xs text-coral text-center">
          {error}
        </p>
      )}
    </div>
  );
}

interface ResendCodeButtonProps {
  secondsLeft: number;
  onResend: () => void;
}

export function ResendCodeButton({ secondsLeft, onResend }: ResendCodeButtonProps) {
  return (
    <button
      type="button"
      onClick={onResend}
      disabled={secondsLeft > 0}
      className="font-medium text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
    >
      {secondsLeft > 0 ? `Gửi lại mã (${secondsLeft}s)` : "Gửi lại mã"}
    </button>
  );
}
