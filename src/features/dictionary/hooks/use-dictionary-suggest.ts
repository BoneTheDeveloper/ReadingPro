"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import * as Sentry from "@sentry/nextjs"
import {
  dictionarySuggestResponseSchema,
} from "@/shared/dictionary/dictionary-response-schema"
import type {
  DictionarySuggestItemDto,
} from "@/shared/dictionary/dictionary-dtos"
import { normalizeDictionaryTerm } from "@/shared/dictionary/normalize-dictionary-term"

const DEBOUNCE_MS = 250
const MIN_SUGGEST_LENGTH = 2

export function useDictionarySuggest() {
  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState<DictionarySuggestItemDto[]>([])
  const [loading, setLoading] = useState(false)
  const [dropdownVisible, setDropdownVisible] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  const requestIdRef = useRef(0)
  const suggestCacheRef = useRef<Map<string, DictionarySuggestItemDto[]>>(new Map())

  const handleQueryChange = useCallback((value: string) => {
    requestIdRef.current += 1
    setQuery(value)
    if (!value.trim()) {
      setSuggestions([])
      setDropdownVisible(false)
      setLoading(false)
    } else {
      setLoading(true)
    }
  }, [])

  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) return

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      const normalized = normalizeDictionaryTerm(trimmed)
      if (normalized.length < MIN_SUGGEST_LENGTH) {
        setSuggestions([])
        setDropdownVisible(false)
        setLoading(false)
        return
      }

      const cached = suggestCacheRef.current.get(normalized)
      if (cached) {
        setSuggestions(cached)
        setDropdownVisible(true)
        setLoading(false)
        return
      }

      const thisRequestId = requestIdRef.current
      try {
        const params = new URLSearchParams({
          q: trimmed,
          sourceLanguage: "en",
          targetLanguage: "vi",
        })
        const res = await fetch(`/api/dictionary/suggest?${params}`)
        const json: unknown = await res.json()
        const parsed = dictionarySuggestResponseSchema.safeParse(json)

        if (!parsed.success || "error" in parsed.data) {
          Sentry.addBreadcrumb({
            category: "dictionary",
            level: "error",
            message: "dictionary-suggest-schema-error",
            data: { route: "/api/dictionary/suggest" },
          })
        }

        if (!parsed.success || "error" in parsed.data) {
          if (requestIdRef.current === thisRequestId) {
            setSuggestions([])
            setDropdownVisible(false)
          }
          return
        }

        if (requestIdRef.current === thisRequestId) {
          setSuggestions(parsed.data.data)
          setDropdownVisible(true)
          suggestCacheRef.current.set(normalized, parsed.data.data)
        }
      } catch {
        if (requestIdRef.current === thisRequestId) {
          setSuggestions([])
        }
      } finally {
        if (requestIdRef.current === thisRequestId) {
          setLoading(false)
        }
      }
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  return {
    query,
    suggestions,
    loading,
    dropdownVisible,
    setDropdownVisible,
    handleQueryChange,
  }
}
