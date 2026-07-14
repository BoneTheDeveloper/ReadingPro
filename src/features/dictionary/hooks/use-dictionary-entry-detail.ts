"use client";

import { useCallback, useRef, useState } from "react";
import { getDictionaryEntryDetailAction } from "../server/actions/dictionary";
import type {
  DictionaryEntryDto,
  DictionarySuggestItemDto,
} from "@/features/dictionary/schemas/dictionary";

export type DetailStatus = "idle" | "loading" | "found" | "not-found" | "error";

export function useDictionaryEntryDetail() {
  const [selectedEntry, setSelectedEntry] = useState<DictionaryEntryDto | null>(
    null,
  );
  const [status, setStatus] = useState<DetailStatus>("idle");
  const detailRequestIdRef = useRef(0);

  const loadEntry = useCallback(async (item: DictionarySuggestItemDto) => {
    const thisRequestId = ++detailRequestIdRef.current;
    setStatus("loading");
    setSelectedEntry(null);

    try {
      const data = await getDictionaryEntryDetailAction(item.id);

      if (detailRequestIdRef.current !== thisRequestId) return;

      if (!data) {
        setStatus("not-found");
        return;
      }

      setSelectedEntry(data);
      setStatus("found");
    } catch {
      if (detailRequestIdRef.current !== thisRequestId) return;
      setStatus("error");
    }
  }, []);

  return { selectedEntry, status, loadEntry };
}
