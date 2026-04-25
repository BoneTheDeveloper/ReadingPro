"use client"

import * as Sentry from "@sentry/nextjs"
import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="vi">
      <body className="min-h-full flex items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4 px-8 text-center">
          <h1 className="text-2xl font-semibold">Đã xảy ra lỗi</h1>
          <p className="text-sm text-muted-foreground">
            Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.
          </p>
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
          >
            Thử lại
          </button>
        </div>
      </body>
    </html>
  )
}
