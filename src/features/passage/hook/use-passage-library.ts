"use client";

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useDeletePassage } from "@/features/passage/mutations";
import { usePassages, passageKeys } from "@/features/passage/queries";
import type { Passage, PassageListItem } from "@/features/passage/schema";

function getMostRecentPassageId(passages: PassageListItem[]): string | null {
  return (
    passages.reduce<PassageListItem | null>((latest, passage) => {
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
    setSelectedId(id);
    setError(null);
  }, []);

  const upsert = useCallback(
    (passage: Passage) => {
      queryClient.setQueryData(passageKeys.detail(passage.id), passage);
      const { id, title, sourceType, createdAt } = passage;
      const item: PassageListItem = { id, title, sourceType, createdAt };
      queryClient.setQueryData<PassageListItem[]>(
        passageKeys.list(),
        (prev = []) =>
          prev.some((p) => p.id === item.id)
            ? prev.map((p) => (p.id === item.id ? item : p))
            : [item, ...prev],
      );
      setSelectedId(item.id);
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
