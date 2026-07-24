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
import { Link, useRouter } from "@/i18n/navigation";
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
  const router = useRouter();

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/sign-in");
          router.refresh();
        },
      },
    });
  };

  if (loading) {
    if (compact || isRail) {
      return <div className="w-10 h-10 animate-pulse rounded-full bg-muted" />;
    }
    return (
      <div className="flex gap-2">
        <div className="w-[72px] h-9 animate-pulse rounded-md bg-muted" />
        <div className="w-[76px] h-9 animate-pulse rounded-md bg-primary/20" />
      </div>
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
              alt={session.user.name || "User avatar"}
              width={36}
              height={36}
              className="rounded-full object-cover"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center uppercase">
              {session.user.name ? (
                <span className="text-sm font-medium">{session.user.name[0]}</span>
              ) : (
                <User className="w-4 h-4" />
              )}
            </div>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5 text-sm">
          <p className="font-medium truncate">{session.user.name}</p>
          <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
        </div>
        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/account" className="cursor-pointer w-full">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
          <LogOut className="w-4 h-4 mr-2" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
