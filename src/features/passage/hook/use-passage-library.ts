"use client";

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useDeletePassage } from "@/features/passage/mutations";
import { usePassages } from "@/features/passage/queries";
import { passageKeys } from "@/features/passage/query-keys";
import type { Passage, PassageListItem } from "@/features/passage/schema";

function getMostRecentPassageId(passages: PassageListItem[]): string | null {
  // Only auto-select COMPLETED passages. PENDING/FAILED rows are not clickable
  // in the source list and have no detail to render; landing on one would
  // mount an empty ContentPanel with no usable data.
  const completed = passages.filter((p) => p.status === "COMPLETED");
  return (
    completed.reduce<PassageListItem | null>((latest, passage) => {
      if (!latest) return passage;
      return passage.createdAt > latest.createdAt ? passage : latest;
    }, null)?.id ?? null
  );
}

export function usePassageLibrary() {
  const queryClient = useQueryClient();
  const passagesQuery = usePassages();
  const deleteMutation = useDeletePassage();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const activeId = selectedId ?? getMostRecentPassageId(passagesQuery.data ?? []);

  const [error, setError] = useState<string | null>(null);

  const select = useCallback((id: string) => {
    // Non-COMPLETED rows have no detail to render. Refuse selection so the
    // workspace stays on a usable state.
    const target = (passagesQuery.data ?? []).find((p) => p.id === id);
    if (target && target.status !== "COMPLETED") return;
    setSelectedId(id);
    setError(null);
  }, [passagesQuery.data]);

  const upsert = useCallback(
    (passage: Passage) => {
      queryClient.setQueryData(passageKeys.detail(passage.id), passage);
      const { id, title, sourceType, status, statusError, createdAt } = passage;
      const item: PassageListItem = { id, title, sourceType, status, statusError, createdAt };
      queryClient.setQueryData<PassageListItem[]>(
        passageKeys.list(),
        (prev = []) =>
          prev.some((p) => p.id === item.id)
            ? prev.map((p) => (p.id === item.id ? item : p))
            : [item, ...prev],
      );
      setError(null);
    },
    [queryClient],
  );

  const remove = useCallback(
    (id: string) => {
      deleteMutation.mutate(id, {
        onSuccess: () => setSelectedId((current) => (current === id ? null : current)),
        onError: (err) => setError(err.message || "Xóa thất bại"),
      });
    },
    [deleteMutation],
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    passages: passagesQuery.data ?? [],
    activeId,
    error,
    isDeleting: deleteMutation.isPending,
    select,
    upsert,
    remove,
    clearError,
  };
}
