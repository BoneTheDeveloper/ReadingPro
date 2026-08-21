"use client";

import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/component/ui/avatar";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/component/ui/dropdown-menu";
import { User, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth/auth-client";
import { clearAllChats } from "@/features/studio/component/view/ai-chat/chat-context";

export interface AuthUser {
  name?: string | null;
  email: string;
  image?: string | null;
}

interface AuthControlsProps {
  variant?: "default" | "rail";
  user: AuthUser;
}

export function AuthControls({
  variant = "default",
  user,
}: AuthControlsProps) {
  const isRail = variant === "rail";
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleSignOut = async () => {
    // Clear all Chat instances from the registry to prevent memory leaks
    clearAllChats();
    // Clear the query cache to remove all cached data
    queryClient.clear();

    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/");
        },
      },
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar
          className={cn(
            "rounded-full cursor-pointer select-none transition-colors w-9 h-9",
            isRail
              ? "hover:bg-white/[0.08] data-[state=open]:bg-white/[0.14] after:border-transparent"
              : "hover:bg-accent",
          )}
        >
          {user.image ? (
            <AvatarImage
              src={user.image}
              alt={user.name || "User avatar"}
            />
          ) : null}
          <AvatarFallback
            className={cn(
              "uppercase",
              isRail && "bg-white/10 text-white",
            )}
          >
            {user.name ? (
              user.name[0]
            ) : (
              <User className="w-4 h-4" />
            )}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5 text-sm">
          <p className="font-medium truncate">{user.name}</p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/account" className="cursor-pointer w-full">
            <Settings className="w-4 h-4 mr-2" />
            Cài đặt
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleSignOut}
          className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
