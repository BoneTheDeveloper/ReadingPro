"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BookMarked, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";
import type {
  DictionaryEntryDto,
  DictionarySuggestItemDto,
} from "@/lib/dictionary/shared/dictionary-dtos";
import { normalizeDictionaryTerm } from "@/lib/dictionary/shared/normalize-dictionary-term";
import { DictionaryEntryCard } from "./dictionary-entry-card";
import { DictionarySuggestDropdown } from "./dictionary-suggest-dropdown";

type DetailStatus = "idle" | "loading" | "found" | "not-found" | "error";

const DEBOUNCE_MS = 250;
const MIN_SUGGEST_LENGTH = 2;

export function DictionaryPageClient() {
  const t = useTranslations();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<DictionarySuggestItemDto[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<DictionaryEntryDto | null>(null);
  const [detailStatus, setDetailStatus] = useState<DetailStatus>("idle");

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);
  const suggestCacheRef = useRef<Map<string, DictionarySuggestItemDto[]>>(new Map());

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    if (!value.trim()) {
      setSuggestions([]);
      setDropdownVisible(false);
      setSuggestLoading(false);
    } else {
      setSuggestLoading(true);
    }
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      const normalized = normalizeDictionaryTerm(trimmed);
      if (normalized.length < MIN_SUGGEST_LENGTH) {
        setSuggestions([]);
        setDropdownVisible(false);
        setSuggestLoading(false);
        return;
      }

      const cached = suggestCacheRef.current.get(normalized);
      if (cached) {
        setSuggestions(cached);
        setDropdownVisible(true);
        setSuggestLoading(false);
        return;
      }

      const thisRequestId = ++requestIdRef.current;
      try {
        const params = new URLSearchParams({
          q: trimmed,
          sourceLanguage: "en",
          targetLanguage: "vi",
        });
        const res = await fetch(`/api/dictionary/suggest?${params}`);
        const json = await res.json();

        if (json.success && requestIdRef.current === thisRequestId) {
          setSuggestions(json.data);
          setDropdownVisible(true);
          suggestCacheRef.current.set(normalized, json.data);
        }
      } catch {
        if (requestIdRef.current === thisRequestId) {
          setSuggestions([]);
        }
      } finally {
        if (requestIdRef.current === thisRequestId) {
          setSuggestLoading(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownVisible(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelect = useCallback(async (item: DictionarySuggestItemDto) => {
    setDropdownVisible(false);
    setDetailStatus("loading");
    setSelectedEntry(null);

    try {
      const params = new URLSearchParams({
        q: item.headword,
        sourceLanguage: "en",
        targetLanguage: "vi",
      });
      const res = await fetch(`/api/dictionary/search?${params}`);
      const json = await res.json();

      if (json.success && json.data && !("found" in json.data)) {
        setSelectedEntry(json.data as DictionaryEntryDto);
        setDetailStatus("found");
      } else {
        setDetailStatus("not-found");
      }
    } catch {
      setDetailStatus("error");
    }
  }, []);

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
              if (suggestions.length > 0) setDropdownVisible(true);
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
          <DictionaryEntryCard entry={selectedEntry} />
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
  );
}
