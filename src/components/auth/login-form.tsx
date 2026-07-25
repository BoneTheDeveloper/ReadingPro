"use client";

import * as React from "react";
import { PillButton } from "../ui/pill-button";
import { authClient } from "@/lib/auth/auth-client";

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const BookIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
  </svg>
);

interface LoginFormProps {
  signInLabel?: string;
}

export function LoginForm({ signInLabel = "Đăng nhập" }: LoginFormProps) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const handleGoogle = async () => {
    setLoading(true);
    setError("");
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/study",
      });
    } catch {
      setError("Đăng nhập Google thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[320px] flex flex-col items-center">
      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#5A4FE0] to-[#4A3FD0] flex items-center justify-center text-white mb-6 shadow-md">
        <BookIcon />
      </div>

      <h1 className="text-[17px] font-semibold mb-6 text-center text-foreground tracking-tight">
        {signInLabel}
      </h1>

      {error && (
        <div className="text-sm text-coral text-center mb-4 bg-coral/10 py-2 rounded-full">
          {error}
        </div>
      )}

      <div className="space-y-3 w-full">
        <PillButton onClick={handleGoogle} className="w-full" disabled={loading}>
          <GoogleIcon />
          Đăng nhập với Google
        </PillButton>
      </div>
    </div>
  );
}
