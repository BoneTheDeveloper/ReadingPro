"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { getVocabularyStats } from "../vocabulary-client";
import type { VocabularyStatsDto as VocabularyStats } from "@/features/vocabulary/vocabulary.schema";

interface UseVocabularyStatsResult {
  stats: VocabularyStats;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useVocabularyStats(): UseVocabularyStatsResult {
  const t = useTranslations("Vocabulary");
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);

  const [stats, setStats] = useState<VocabularyStats>({
    total: 0,
    new: 0,
    learning: 0,
    known: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchStats = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const data = await getVocabularyStats();

      if (requestIdRef.current !== requestId || !mountedRef.current) return;
      setStats(data.data);
      setLoading(false);
    } catch {
      if (requestIdRef.current !== requestId || !mountedRef.current) return;
      setError(t("loadError"));
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const timer = setTimeout(fetchStats, 0);
    return () => clearTimeout(timer);
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}
