"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import type {
  VocabularyItem,
  VocabularyStatus,
  VocabularyListResponse,
} from "../model/vocabulary-types";

interface UseVocabularyListResult {
  items: VocabularyItem[];
  total: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useVocabularyList(
  page: number,
  statusFilter: VocabularyStatus | "ALL",
  search: string,
  enabled: boolean = true,
): UseVocabularyListResult {
  const t = useTranslations("Vocabulary");
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);

  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchItems = useCallback(async (
    pageArg: number,
    statusArg: VocabularyStatus | "ALL",
    searchArg: string,
  ) => {
    const requestId = ++requestIdRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("page", String(pageArg));
      params.set("pageSize", "20");
      if (statusArg !== "ALL") params.set("status", statusArg);
      if (searchArg.trim()) params.set("search", searchArg.trim());

      const res = await fetch(`/api/vocabulary/list?${params}`, { signal: controller.signal });
      if (!res.ok) throw new Error("Failed to load vocabulary");

      const json: unknown = await res.json();
      const data = json as VocabularyListResponse;

      if (requestIdRef.current !== requestId || !mountedRef.current) return;
      setItems(data.data.items);
      setTotal(data.data.total);
      setLoading(false);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (requestIdRef.current !== requestId || !mountedRef.current) return;
      setError(t("loadError"));
      setLoading(false);
    }
  }, [t]);

  // Fetch on dependency change using setTimeout (same pattern as dictionary page)
  useEffect(() => {
    if (!enabled) return;

    const timer = setTimeout(() => {
      fetchItems(page, statusFilter, search);
    }, 0);

    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [enabled, page, statusFilter, search, fetchItems]);

  return { items, total, loading, error, refetch: () => fetchItems(page, statusFilter, search) };
}
