"use client";

import { useCallback, useRef, useState } from "react";
import { getDictionaryEntryDetail } from "../dictionary-client";
import type {
  DictionaryEntryDto,
  DictionarySuggestItemDto,
} from "@/contracts/dictionary/dictionary-dtos";

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
      const data = await getDictionaryEntryDetail(item.id);

      if (detailRequestIdRef.current !== thisRequestId) return;

      setSelectedEntry(data);
      setStatus("found");
    } catch (err) {
      if (detailRequestIdRef.current !== thisRequestId) return;
      if (err instanceof Error && err.message.includes("Entry not found")) {
        setStatus("not-found");
      } else {
        setStatus("error");
      }
    }
  }, []);

  return { selectedEntry, status, loadEntry };
}
