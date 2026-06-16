"use client"

import { useCallback, useRef, useState } from "react"
import * as Sentry from "@sentry/nextjs"
import {
  dictionaryEntryDetailResponseSchema,
} from "@/shared/dictionary/dictionary-response-schema"
import type {
  DictionaryEntryDto,
  DictionarySuggestItemDto,
} from "@/shared/dictionary/dictionary-dtos"

export type DetailStatus = "idle" | "loading" | "found" | "not-found" | "error"

export function useDictionaryEntryDetail() {
  const [selectedEntry, setSelectedEntry] = useState<DictionaryEntryDto | null>(null)
  const [status, setStatus] = useState<DetailStatus>("idle")
  const detailRequestIdRef = useRef(0)

  const loadEntry = useCallback(async (item: DictionarySuggestItemDto) => {
    const thisRequestId = ++detailRequestIdRef.current
    setStatus("loading")
    setSelectedEntry(null)

    try {
      const params = new URLSearchParams({
        sourceLanguage: "en",
        targetLanguage: "vi",
      })
      const res = await fetch(`/api/dictionary/entries/${item.id}?${params}`)

      if (detailRequestIdRef.current !== thisRequestId) return

      if (res.ok) {
        const json: unknown = await res.json()
        const parsed = dictionaryEntryDetailResponseSchema.safeParse(json)
        if (detailRequestIdRef.current !== thisRequestId) return
        if (!parsed.success || "error" in parsed.data) {
          Sentry.addBreadcrumb({
            category: "dictionary",
            level: "error",
            message: "dictionary-entry-detail-schema-error",
            data: { route: "/api/dictionary/entries/:entryId" },
          })
          setStatus("error")
          return
        }
        setSelectedEntry(parsed.data.data)
        setStatus("found")
      } else {
        setStatus("not-found")
      }
    } catch {
      if (detailRequestIdRef.current !== thisRequestId) return
      setStatus("error")
    }
  }, [])

  return { selectedEntry, status, loadEntry }
}
