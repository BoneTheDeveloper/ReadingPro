"use client";

import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Button } from "@/ui/primitives/button";
import { cn } from "@/ui/utils";

interface AuthControlsProps {
  compact?: boolean;
  variant?: "default" | "rail";
}

export function AuthControls({
  compact = false,
  variant = "default",
}: AuthControlsProps) {
  const isRail = variant === "rail";
  const iconClass = isRail
    ? "text-white/60 hover:text-white hover:bg-white/[0.08]"
    : "text-muted-foreground hover:bg-accent/60";

  return (
    <>
      <Show when="signed-out">
        <SignInButton mode="modal">
          <Button
            variant="ghost"
            size={compact || isRail ? "icon" : "sm"}
            className={cn(isRail ? "w-10 h-10" : "", iconClass)}
          >
            Sign in
          </Button>
        </SignInButton>
        {!compact && !isRail && (
          <SignUpButton mode="modal">
            <Button size="sm">Sign up</Button>
          </SignUpButton>
        )}
      </Show>
      <Show when="signed-in">
        <div
          className={cn(isRail && "w-10 h-10 flex items-center justify-center")}
        >
          <UserButton
            appearance={{
              elements: {
                avatarBox: isRail ? "size-9" : "size-9",
              },
            }}
          />
        </div>
      </Show>
    </>
  );
}
