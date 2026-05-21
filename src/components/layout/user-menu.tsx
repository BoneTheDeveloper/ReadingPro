"use client"

import { useTranslations } from "next-intl"
import { LogOut } from "lucide-react"
import { useSignOut } from "./use-sign-out"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type UserMenuUser = {
  name: string | null
  email: string | null
}

export function UserMenu({ user }: { user: UserMenuUser }) {
  const t = useTranslations()
  const signOut = useSignOut()
  const userName = user.name || user.email?.split("@")[0] || "User"
  const userEmail = user.email ?? null

  const initials = userName ? userName.charAt(0).toUpperCase() : "?"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-3 cursor-pointer rounded-lg px-1 py-0.5 hover:bg-accent/60 transition-colors">
        <div className="text-right">
          <p className="text-sm font-semibold text-foreground leading-none">
            {userName || t("Common.loading")}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-0.5">
            {userEmail || ""}
          </p>
        </div>
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-primary text-sm font-bold">{initials}</span>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">{userName}</p>
          <p className="text-xs text-muted-foreground">{userEmail}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={signOut}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          {t("Auth.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
