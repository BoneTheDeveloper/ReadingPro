"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { TranslationDto } from "../schemas/translation";
export function useTranslation() {
  const [data, setData] = useState<TranslationDto | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isPending, setIsPending] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const translate = useCallback(async (word: string, context: string) => {
    abortRef.current?.abort();
    setIsPending(true);
    setError(null);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ word, context }),
      });
      if (!res.ok) throw new Error(`translate failed: ${res.status}`);
      setData(await res.json());
      setIsPending(false);
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setError(e as Error);
        setIsPending(false);
      }
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setData(null);
    setError(null);
    setIsPending(false);
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  return { data, error, isPending, translate, reset };
}
