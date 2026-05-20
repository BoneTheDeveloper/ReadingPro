"use client"

import * as Sentry from "@sentry/nextjs"
import { useEffect } from "react"
import { useTranslations } from "next-intl"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations("Errors")

  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="flex min-h-100 flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-xl font-semibold">{t("somethingWentWrong")}</h2>
      <p className="text-sm text-muted-foreground">
        {t("unexpectedError")}
      </p>
      {/* Raw button intentional — error boundary must work if shadcn fails to load */}
      <button
        type="button"
        onClick={reset}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
      >
        {t("goHome")}
      </button>
    </div>
  )
}
