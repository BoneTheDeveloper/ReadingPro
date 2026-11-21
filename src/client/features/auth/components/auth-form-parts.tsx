import * as React from "react";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";

const BookIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
  </svg>
);

export function AuthHeader({ title, subtitle }: { title: string; subtitle?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center mb-6">
      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#5A4FE0] to-[#4A3FD0] flex items-center justify-center text-white mb-6 shadow-md">
        <BookIcon />
      </div>
      <h1 className="text-[17px] font-semibold text-center text-foreground tracking-tight">{title}</h1>
      {subtitle && <p className="mt-2 text-sm text-muted-foreground text-center">{subtitle}</p>}
    </div>
  );
}

export function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div role="alert" className="text-sm text-coral text-center mb-4 bg-coral/10 py-2 px-4 rounded-2xl">
      {message}
    </div>
  );
}

export function OrDivider() {
  return (
    <div className="flex items-center gap-3 my-5 text-xs text-muted-foreground">
      <span className="h-px flex-1 bg-border" />
      hoặc
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

type AuthFieldProps = React.ComponentProps<typeof Input> & {
  id: string;
  label: string;
  /** Shown in red under the field, and marks the input invalid. */
  error?: string;
  /** Shown under the field while there is no error. */
  hint?: string;
};

export function AuthField({ id, label, error, hint, ...inputProps }: AuthFieldProps) {
  const messageId = `${id}-message`;
  const message = error ?? hint;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        {...inputProps}
      />
      {message && (
        <p id={messageId} className={error ? "text-xs text-coral" : "text-xs text-muted-foreground"}>
          {message}
        </p>
      )}
    </div>
  );
}
