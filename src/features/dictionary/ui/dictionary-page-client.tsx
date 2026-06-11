"use client"

import { useEffect, useRef } from "react"
import { BookMarked, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useTranslations } from "next-intl"
import { DictionaryEntryCard } from "./dictionary-entry-card"
import { DictionarySuggestDropdown } from "./dictionary-suggest-dropdown"
import { useSaveDictionaryVocabulary } from "../model/use-save-dictionary-vocabulary"
import { useDictionarySuggest } from "../model/use-dictionary-suggest"
import { useDictionaryEntryDetail } from "../model/use-dictionary-entry-detail"

export function DictionaryPageClient() {
  const t = useTranslations()
  const {
    query, suggestions, loading: suggestLoading,
    dropdownVisible, setDropdownVisible, handleQueryChange,
  } = useDictionarySuggest()
  const { selectedEntry, status: detailStatus, loadEntry } = useDictionaryEntryDetail()
  const { saveSense, getStatus } = useSaveDictionaryVocabulary()

  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownVisible(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [setDropdownVisible])

  const handleSelect = async (item: Parameters<typeof loadEntry>[0]) => {
    setDropdownVisible(false)
    loadEntry(item)
  }

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto px-4 py-8 gap-6">
      <div className="flex items-center gap-3">
        <BookMarked className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">{t("Dictionary.title")}</h1>
      </div>

      <div ref={containerRef} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setDropdownVisible(true)
            }}
            placeholder={t("Dictionary.searchPlaceholder")}
            className="pl-9"
          />
        </div>
        <DictionarySuggestDropdown
          suggestions={suggestions}
          loading={suggestLoading}
          visible={dropdownVisible}
          onSelect={handleSelect}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {detailStatus === "loading" && (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            {t("Dictionary.loading")}
          </div>
        )}

        {detailStatus === "found" && selectedEntry && (
          <DictionaryEntryCard
            entry={selectedEntry}
            saveSense={saveSense}
            getSaveStatus={getStatus}
          />
        )}

        {detailStatus === "not-found" && (
          <div className="text-center py-12 text-muted-foreground">
            <p>{t("Dictionary.noResult")}</p>
          </div>
        )}

        {detailStatus === "error" && (
          <div className="text-center py-12 text-destructive">
            <p>{t("Dictionary.error")}</p>
          </div>
        )}

        {detailStatus === "idle" && (
          <div className="text-center py-12 text-muted-foreground">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>{t("Dictionary.idleHint")}</p>
          </div>
        )}
      </div>
    </div>
  )
}
