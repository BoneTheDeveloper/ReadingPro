"use client"

import { useTranslations } from "next-intl"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSignOut } from "./use-sign-out"

export function SignOutButton() {
  const t = useTranslations("Auth")
  const signOut = useSignOut()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={signOut}
      className="w-full text-muted-foreground hover:text-destructive"
      title={t("signOut")}
      aria-label={t("signOut")}
    >
      <LogOut className="w-5 h-5" />
    </Button>
  )
}
