"use client"

import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export function useSignOut() {
  const router = useRouter()

  return async () => {
    const { error } = await createClient().auth.signOut()
    if (error) {
      console.error("Sign out failed:", error.message)
      return
    }
    router.push("/sign-in")
    router.refresh()
  }
}
