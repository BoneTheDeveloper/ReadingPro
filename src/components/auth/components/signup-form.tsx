"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PillButton } from "./pill-button";
import { PillInput } from "./pill-input";
import { PasswordInput } from "./password-input";
import { CodeInput } from "./code-input";
import { storage } from "@/lib/storage";
import { authClient } from "@/lib/auth/auth-client";

export type AuthTranslations = {
  signIn: string;
  signUp: string;
  signOut: string;
  signInTitle: string;
  signInDescription: string;
  signUpTitle: string;
  signUpDescription: string;
  email: string;
  emailPlaceholder?: string;
  password: string;
  passwordPlaceholder?: string;
  confirmPassword: string;
  confirmPasswordPlaceholder?: string;
  signInWithGoogle: string;
  signUpWithGoogle: string;
  continueWithGoogle: string;
  continueWithEmail: string;
  or: string;
  goBack: string;
  continue?: string;
  noAccount: string;
  hasAccount: string;
  youUsedGoogleLastTime?: string;
  passwordsDoNotMatch: string;
  passwordMinLength: string;
  invalidEmail?: string;
  enter6DigitCode?: string;
  codeSentTo?: string;
  verify?: string;
  didNotReceiveCode?: string;
  resend?: string;
  createPasswordFor?: string;
  createAccount?: string;
  errors?: {
    oauthFailed?: string;
    signupFailed?: string;
    unexpected?: string;
  };
};

type Translations = {
  auth: AuthTranslations;
  common: Record<string, string>;
};

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const EmailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

const BookIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
  </svg>
);

type SignupStep = "method" | "email" | "code" | "password";

interface SignUpFormProps {
  translations: Translations;
  signUpLabel: string;
}

export function SignUpForm({ translations, signUpLabel }: SignUpFormProps) {
  const router = useRouter();
  const [step, setStep] = React.useState<SignupStep>("method");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [code, setCode] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const handleOAuth = async (provider: "google") => {
    storage.set("lastLoginMethod", provider);
    setLoading(true);
    try {
      await authClient.signIn.social({
        provider,
        callbackURL: "/",
      });
    } catch {
      setError(translations.auth.errors?.oauthFailed || "OAuth sign in failed");
      setLoading(false);
    }
  };

  const handleEmailNext = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(translations.auth.invalidEmail || "Invalid email format");
      return;
    }
    setError("");
    setStep("code");
  };

  const handleCodeNext = () => {
    if (code.length !== 6) {
      setError(translations.auth.enter6DigitCode || "Please enter 6-digit code");
      return;
    }
    setError("");
    setStep("password");
  };

  const handlePasswordSubmit = async () => {
    if (password.length < 8) {
      setError(translations.auth.passwordMinLength || "Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError(translations.auth.passwordsDoNotMatch || "Passwords do not match");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const result = await authClient.signUp.email({
        email,
        password,
        name: email.split("@")[0],
        callbackURL: "/",
      });

      if (result.error) {
        setError(result.error.message || translations.auth.errors?.signupFailed || "Signup failed");
        setLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError(translations.auth.errors?.unexpected || "An unexpected error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[320px] flex flex-col items-center">
      {/* Logo */}
      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#5A4FE0] to-[#4A3FD0] flex items-center justify-center text-white mb-6 shadow-md">
        <BookIcon />
      </div>

      {/* Title */}
      <h1 className="text-[17px] font-semibold mb-6 text-center text-foreground tracking-tight">
        {signUpLabel}
      </h1>

      {/* Error message */}
      {error && (
        <div className="text-sm text-coral text-center mb-4 bg-coral/10 py-2 rounded-full">
          {error}
        </div>
      )}

      {/* Step 1: Method */}
      {step === "method" && (
        <div className="space-y-3 w-full">
          <PillButton onClick={() => handleOAuth("google")} className="w-full" disabled={loading}>
            <GoogleIcon />
            {translations.auth.continueWithGoogle}
          </PillButton>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[#EAE5DB]" />
            <span className="text-[11px] text-muted-foreground font-medium">{translations.auth.or}</span>
            <div className="flex-1 h-px bg-[#EAE5DB]" />
          </div>

          <PillButton variant="secondary" onClick={() => setStep("email")} className="w-full" disabled={loading}>
            <EmailIcon />
            {translations.auth.continueWithEmail}
          </PillButton>
        </div>
      )}

      {/* Step 2: Email */}
      {step === "email" && (
        <div className="space-y-3 w-full">
          <PillInput
            type="email"
            placeholder={translations.auth.emailPlaceholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <PillButton onClick={handleEmailNext} className="w-full" disabled={loading}>
            {translations.auth.continue}
            <ArrowRightIcon />
          </PillButton>
          <button
            onClick={() => setStep("method")}
            className="w-full text-[13px] text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 py-2"
          >
            <ArrowLeftIcon />
            {translations.auth.goBack}
          </button>
        </div>
      )}

      {/* Step 3: Code */}
      {step === "code" && (
        <div className="space-y-3 w-full">
          <p className="text-[13px] text-muted-foreground mb-3 text-center">
            {translations.auth.codeSentTo}<br />
            <span className="font-medium text-foreground">{email}</span>
          </p>
          <CodeInput onChange={setCode} />
          <PillButton onClick={handleCodeNext} className="w-full mt-4" disabled={loading}>
            {translations.auth.verify}
          </PillButton>
          <p className="text-[12px] text-muted-foreground text-center">
            {translations.auth.didNotReceiveCode}{" "}
            <button className="text-primary font-medium hover:underline">{translations.auth.resend}</button>
          </p>
          <button
            onClick={() => setStep("email")}
            className="w-full text-[13px] text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 py-2"
          >
            <ArrowLeftIcon />
            {translations.auth.goBack}
          </button>
        </div>
      )}

      {/* Step 4: Password */}
      {step === "password" && (
        <div className="space-y-3 w-full">
          <p className="text-[13px] text-muted-foreground mb-3 text-center">
            {translations.auth.createPasswordFor}<br />
            <span className="font-medium text-foreground">{email}</span>
          </p>
          <PasswordInput
            placeholder={translations.auth.passwordPlaceholder}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <PasswordInput
            placeholder={translations.auth.confirmPasswordPlaceholder}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {confirmPassword && password !== confirmPassword && (
            <p className="text-[12px] text-coral text-center">{translations.auth.passwordsDoNotMatch}</p>
          )}
          <PillButton onClick={handlePasswordSubmit} className="w-full" disabled={loading}>
            {translations.auth.createAccount}
          </PillButton>
          <button
            onClick={() => setStep("code")}
            className="w-full text-[13px] text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 py-2"
          >
            <ArrowLeftIcon />
            {translations.auth.goBack}
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 text-[13px] text-muted-foreground text-center">
        {translations.auth.hasAccount}{" "}
        <Link href="/login" className="text-foreground font-medium hover:underline">
          {translations.auth.signIn}
        </Link>
      </div>
    </div>
  );
}
