"use client";

import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDeletePassageMutation } from "@/features/passage/api/mutations";
import { passageQueries } from "@/features/passage/api/queries";
import type { Passage, PassageListItem } from "@/features/passage/schema";

function getMostRecentPassageId(passages: PassageListItem[]): string | null {

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
  const passagesQuery = useQuery(passageQueries.list());
  const deleteMutation = useDeletePassageMutation();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const activeId = selectedId ?? getMostRecentPassageId(passagesQuery.data ?? []);

  const [error, setError] = useState<string | null>(null);

  const select = useCallback((id: string) => {
    const target = (passagesQuery.data ?? []).find((p) => p.id === id);
    if (target && target.status !== "COMPLETED") return;
    setSelectedId(id);
    setError(null);
  }, [passagesQuery.data]);

  const upsert = useCallback(
    (passage: Passage) => {
      queryClient.setQueryData(passageQueries.detail(passage.id).queryKey, passage);
      const { id, title, sourceType, status, createdAt } = passage;
      const item: PassageListItem = { id, title, sourceType, status, createdAt };
      queryClient.setQueryData(
        passageQueries.list().queryKey,
        (prev: PassageListItem[] = []) =>
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
