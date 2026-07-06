"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { getVocabularySets } from "../vocabulary-client";
import type { VocabularySet } from "../model/vocabulary-types";

interface UseVocabularySetsResult {
  sets: VocabularySet[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useVocabularySets(
  enabled: boolean = false,
): UseVocabularySetsResult {
  const t = useTranslations("Vocabulary");
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);

  const [sets, setSets] = useState<VocabularySet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchSets = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const data = await getVocabularySets();

      if (requestIdRef.current !== requestId || !mountedRef.current) return;
      setSets(data.data);
      setLoading(false);
    } catch {
      if (requestIdRef.current !== requestId || !mountedRef.current) return;
      setError(t("loadError"));
      setLoading(false);
    }
  }, [t]);

  // Fetch on enable using setTimeout (same pattern as dictionary page)
  useEffect(() => {
    if (!enabled) return;

    const timer = setTimeout(() => {
      fetchSets();
    }, 0);

    return () => clearTimeout(timer);
  }, [enabled, fetchSets]);

  return { sets, loading, error, refetch: fetchSets };
}
