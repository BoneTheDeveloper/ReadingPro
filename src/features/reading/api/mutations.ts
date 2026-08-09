"use client";

import { useCallback, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  TranslationOutputSchema,
  type TranslateInput,
  type Translation,
} from "@/features/reading/schema";

/* ─── Fetcher ───────────────────────────────────────────────────────── */

async function fetchTranslation(input: TranslateInput): Promise<Translation> {
  const res = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Không dịch được từ này");
  return TranslationOutputSchema.parse(await res.json());
}

/* ─── Hook ─────────────────────────────────────────────────────────── */

export function useTranslation() {
  const [data, setData] = useState<Translation | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const mutation = useMutation({
    mutationKey: ["translate"] as const,
    mutationFn: (input: TranslateInput) => fetchTranslation(input),
  });

  const translate = useCallback(
    (word: string, context: string) => {
      mutation.mutate(
        { word, context, sourceLanguage: "en", targetLanguage: "vi" },
        {
          onSuccess: (data) => setData(data),
          onError: (error) => setError(error),
        },
      );
    },
    [mutation],
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return {
    data,
    error,
    isPending: mutation.isPending,
    translate,
    reset,
  };
}
