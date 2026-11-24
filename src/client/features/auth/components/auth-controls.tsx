"use client";

import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/client/components/ui/avatar";
import { cn } from "@/client/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu";
import { User, LogOut, Settings, Crown } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/client/lib/auth/auth-client";
import { clearAllChats } from "@/client/features/studio";
import { useAppSelector } from "@/client/lib/store/hooks";
import { selectSessionUser } from "@/client/lib/store/session-slice";

interface AuthControlsProps {
  /** `rail` sits on the dark nav rail; `tab` is the account cell of the mobile bottom tab bar. */
  variant?: "default" | "rail" | "tab";
  /** Highlights the `tab` trigger while an account route is open. */
  active?: boolean;
}

export function AuthControls({ variant = "default", active = false }: AuthControlsProps) {
  const isTab = variant === "tab";
  const isRail = variant === "rail" || isTab;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAppSelector(selectSessionUser);

  const handleSignOut = async () => {
    // Clear all Chat instances from the registry to prevent memory leaks
    clearAllChats();
    // Clear the query cache to remove all cached data
    queryClient.clear();

    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          navigate("/");
        },
      },
    });
  };

  if (!user) return null;

  const avatar = (
    <Avatar
      className={cn(
        "rounded-full cursor-pointer select-none transition-colors",
        isTab ? "w-6 h-6" : "w-9 h-9",
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
          isTab && "text-[11px]",
        )}
      >
        {user.name ? (
          user.name[0]
        ) : (
          <User className="w-4 h-4" />
        )}
      </AvatarFallback>
    </Avatar>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {isTab ? (
          <button
            type="button"
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors outline-none focus-visible:bg-white/[0.08]",
              active ? "text-white" : "text-sidebar-foreground hover:text-white",
            )}
          >
            {active && (
              <span className="absolute top-0 h-0.5 w-8 rounded-full bg-sidebar-ring" />
            )}
            {avatar}
            Tài khoản
          </button>
        ) : (
          avatar
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5 text-sm">
          <p className="font-medium truncate">{user.name}</p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link to="/account" className="cursor-pointer w-full">
            <Settings className="w-4 h-4 mr-2" />
            Cài đặt
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link to="/pricing" className="cursor-pointer w-full">
            <Crown className="w-4 h-4 mr-2" />
            Nâng cấp gói
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
