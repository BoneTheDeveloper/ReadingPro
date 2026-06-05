"use client";

import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export function AuthControls({ compact = false }: { compact?: boolean }) {
  return (
    <>
      <Show when="signed-out">
        <SignInButton mode="modal">
          <Button variant="ghost" size={compact ? "icon" : "sm"}>
            Sign in
          </Button>
        </SignInButton>
        {!compact && (
          <SignUpButton mode="modal">
            <Button size="sm">Sign up</Button>
          </SignUpButton>
        )}
      </Show>
      <Show when="signed-in">
        <UserButton
          appearance={{ elements: { avatarBox: "size-9" } }}
        />
      </Show>
    </>
  );
}
