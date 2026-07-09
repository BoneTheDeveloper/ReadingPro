"use client";

import { authClient } from "@/lib/auth/auth-client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface AuthControlsProps {
  compact?: boolean;
  variant?: "default" | "rail";
}

export function AuthControls({
  compact = false,
  variant = "default",
}: AuthControlsProps) {
  const { data: session, isPending: loading } = authClient.useSession();
  const isRail = variant === "rail";

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
    } catch {
      // Ignore errors, redirect anyway
    }
    // Full page reload to clear state and redirect
    window.location.href = "/";
  };

  if (loading) {
    return (
      <div className="w-10 h-10 animate-pulse rounded-full bg-muted" />
    );
  }

  if (!session?.user) {
    return (
      <>
        <Link href="/sign-in">
          <Button variant="ghost" size={compact || isRail ? "icon" : "sm"}>
            Sign in
          </Button>
        </Link>
        {!compact && !isRail && (
          <Link href="/sign-up">
            <Button size="sm">Sign up</Button>
          </Link>
        )}
      </>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn("rounded-full gap-2", isRail ? "w-10 h-10 p-0" : "px-3")}
        >
          {session.user.image ? (
            <Image
              src={session.user.image}
              alt={session.user.name || "User"}
              width={36}
              height={36}
              className="w-9 h-9 rounded-full"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
              {session.user.name ? (
                <span className="text-sm font-medium">{session.user.name[0]}</span>
              ) : (
                <User className="w-4 h-4" />
              )}
            </div>
          )}
          {!isRail && (
            <span className="text-sm font-medium max-w-[100px] truncate">
              {session.user.name || "User"}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link href="/settings" className="cursor-pointer">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
          <LogOut className="w-4 h-4 mr-2" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
