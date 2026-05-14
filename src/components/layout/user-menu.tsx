"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { LogOut } from "lucide-react"
import { useSignOut } from "./use-sign-out"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function UserMenu() {
  const [userName, setUserName] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const signOut = useSignOut()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        setUserName(
          user.user_metadata?.name ||
            user.user_metadata?.full_name ||
            user.email?.split("@")[0] ||
            "User",
        )
        setUserEmail(user.email ?? null)
      }
    }
    getUser()
  }, [supabase])

  const initials = userName ? userName.charAt(0).toUpperCase() : "?"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-3 cursor-pointer rounded-lg px-1 py-0.5 hover:bg-accent/60 transition-colors">
        <div className="text-right">
          <p className="text-[14px] font-semibold text-on-surface leading-none">
            {userName || "Loading..."}
          </p>
          <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold mt-0.5">
            {userEmail || ""}
          </p>
        </div>
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-primary text-[14px] font-bold">{initials}</span>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">{userName}</p>
          <p className="text-xs text-on-surface-variant">{userEmail}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={signOut}
          className="text-red-600 focus:text-red-600"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
