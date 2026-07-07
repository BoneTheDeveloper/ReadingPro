"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { getVocabularyList } from "../vocabulary-client";
import type { VocabularyItemDto, VocabularyStatus } from "../schemas/vocabulary.schema";

interface UseVocabularyListResult {
  items: VocabularyItemDto[];
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

  const [items, setItems] = useState<VocabularyItemDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchItems = useCallback(
    async (
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
        const data = await getVocabularyList({
          page: pageArg,
          status: statusArg,
          search: searchArg,
          signal: controller.signal,
        });

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
    },
    [t],
  );

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

  return {
    items,
    total,
    loading,
    error,
    refetch: () => fetchItems(page, statusFilter, search),
  };
}
