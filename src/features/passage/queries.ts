import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  passageSchema,
  passageListSchema,
  type Passage,
  type PassageListItem,
} from "@/features/passage/schema";

/* ─── Keys ─────────────────────────────────────────────────────────── */

export const passageKeys = {
  all: ["passages"] as const,
  list: () => [...passageKeys.all, "list"] as const,
  detail: (id: string) => [...passageKeys.all, "detail", id] as const,
};

/* ─── Fetchers ─────────────────────────────────────────────────────── */

async function fetchPassage(
  id: string,
  signal?: AbortSignal,
): Promise<Passage> {
  const res = await fetch(`/api/passage/${id}`, { signal });

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
  });
}

export function usePassage(passageId: string | null) {
  return useQuery({
    queryKey: passageKeys.detail(passageId ?? ""),
    queryFn: ({ signal }) => fetchPassage(passageId!, signal),
    enabled: passageId !== null,
    placeholderData: keepPreviousData,
  });
}
