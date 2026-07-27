"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { TranslationDto } from "../schemas/translation";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; data: TranslationDto }
  | { status: "error" };

export function useInlineTranslate() {
  const [state, setState] = useState<State>({ status: "idle" });
  const controller = useRef<AbortController | null>(null);
  const cache = useRef(new Map<string, TranslationDto>());

  const translate = useCallback(async (text: string, context: string) => {
    const key = `${text}\u0000${context}`;

    const hit = cache.current.get(key);
    if (hit) return setState({ status: "done", data: hit });

    controller.current?.abort();
    const ac = new AbortController();
    controller.current = ac;
    setState({ status: "loading" });

    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, context }),
        signal: ac.signal,
      });
      if (!res.ok) return setState({ status: "error" });

      const data: TranslationDto = await res.json();
      cache.current.set(key, data);
      setState({ status: "done", data });
    } catch {
      if (ac.signal.aborted) return;
      setState({ status: "error" });
    }
  }, []);

  useEffect(() => () => controller.current?.abort(), []);

  return { state, translate };
}
