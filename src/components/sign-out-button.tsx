"use client"

import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSignOut } from "@/hooks/use-sign-out"

export function SignOutButton() {
  const signOut = useSignOut()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={signOut}
      className="w-full text-muted-foreground hover:text-destructive"
      title="Sign out"
      aria-label="Sign out"
    >
      <LogOut className="w-5 h-5" />
    </Button>
  )
}
