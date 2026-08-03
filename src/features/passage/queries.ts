"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  passageSchema,
  passageListSchema,
  type Passage,
  type PassageListItem,
} from "@/features/passage/schema";
import { passageKeys } from "./query-keys";

/* ─── Fetchers ─────────────────────────────────────────────────────── */

// 404 from GET /api/passage/[id] means the passage is still PENDING.
// Treat that as a sentinel — don't throw, keep polling. The list query
// is the source of truth for non-terminal status UX.
class PassageNotReady extends Error {
  readonly status: "PENDING";
  constructor(status: "PENDING") {
    super(`passage ${status}`);
    this.status = status;
  }
}

async function fetchPassage(
  id: string,
  signal?: AbortSignal,
): Promise<Passage> {
  const res = await fetch(`/api/passage/${id}`, { signal });

  if (res.status === 404) {
    throw new PassageNotReady("PENDING");
  }

  if (!res.ok) throw new Error("Không tải được nội dung tài liệu");

  return passageSchema.parse(await res.json());
}

async function fetchPassages(
  signal?: AbortSignal,
): Promise<PassageListItem[]> {
  const res = await fetch("/api/passage", { signal });

  if (!res.ok) throw new Error("Không tải được danh sách tài liệu");

  return passageListSchema.parse(await res.json());
}

/* ─── Query hooks ──────────────────────────────────────────────────── */

export function usePassages() {
  return useQuery({
    queryKey: passageKeys.list(),
    queryFn: ({ signal }) => fetchPassages(signal),
    // Poll while any passage is non-terminal. The list is the source of truth
    // for status display; it must refresh on PENDING → COMPLETED transitions
    // that happen in the background (AI processing). Stops when all rows are
    // terminal — most users will have a small number of in-flight passages.
    refetchInterval: (query) => {
      const items = query.state.data ?? [];
      const hasPending = items.some((p) => p.status !== "COMPLETED");
      return hasPending ? 2000 : false;
    },
  });
}

export function usePassage(passageId: string | null) {
  // Detail is reactive only. The list query (usePassages) is the single
  // polling loop while any row is non-terminal; status changes flow in via
  // shared cache invalidation. A 404 here means the row exists but is still
  // PENDING — the list poll will flip it to COMPLETED and re-render.
  const query = useQuery({
    queryKey: passageKeys.detail(passageId ?? ""),
    queryFn: ({ signal }) => fetchPassage(passageId!, signal),
    enabled: passageId !== null,
    placeholderData: keepPreviousData,
    retry: (failureCount, error) => {
      if (error instanceof PassageNotReady) return false;
      return failureCount < 3;
    },
  });

  return query;
}
