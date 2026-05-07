"use client"

import { LogOut } from "lucide-react"
import { useSignOut } from "@/hooks/use-sign-out"

export function SignOutButton() {
  const signOut = useSignOut()

  return (
    <button
      onClick={signOut}
      className="w-full flex justify-center p-2 rounded-lg text-on-surface-variant hover:bg-accent/60 hover:text-red-600 transition-colors"
      title="Sign out"
      aria-label="Sign out"
    >
      <LogOut className="w-5 h-5" />
    </button>
  )
}
