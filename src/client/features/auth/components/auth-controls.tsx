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
import { CreditCard, LogOut, Settings, Sparkles, User } from "lucide-react";
import { useIsPro } from "@/client/features/subscription";
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
  const isPro = useIsPro();

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

      <DropdownMenuContent align="end" className="w-64">
        <div className="flex items-center gap-3 px-2.5 py-2">
          <Avatar className="h-9 w-9 rounded-full after:border-transparent">
            {user.image ? <AvatarImage src={user.image} alt="" /> : null}
            <AvatarFallback className="uppercase">{user.name?.[0] ?? <User className="h-4 w-4" />}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link to="/account">
            <Settings />
            Cài đặt
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link to="/account/billing">
            <CreditCard />
            <span className="flex-1">Gói đăng ký</span>
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
              {isPro ? "Pro" : "Free"}
            </span>
          </Link>
        </DropdownMenuItem>

        {!isPro && (
          <DropdownMenuItem asChild>
            <Link to="/pricing" className="font-medium text-primary [&_svg]:text-primary">
              <Sparkles />
              Nâng cấp lên Pro
            </Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut />
          Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
