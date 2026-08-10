"use client";

import { useCallback, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useDeletePassageMutation } from "@/features/passage/api/mutations";
import { passageQueries } from "@/features/passage/api/queries";
import type { PassageListItem } from "@/features/passage/schema";

const PASSAGE_PARAM = "passageId";

function getMostRecentPassageId(passages: PassageListItem[]): string | null {
  const completed = passages.filter((p) => p.status === "COMPLETED");
  return (
    completed.reduce<PassageListItem | null>((latest, passage) => {
      if (!latest) return passage;
      return passage.createdAt > latest.createdAt ? passage : latest;
    }, null)?.id ?? null
  );
}

/**
 * Owns which passage the workspace is reading. The id lives in the URL
 * (`?passageId=`) so a refresh, a bookmark, or a shared link all reopen the
 * same passage.
 */
export function usePassageLibrary() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: passages = [] } = useQuery(passageQueries.list());
  const deleteMutation = useDeletePassageMutation();

  // Resolving the param against the list is the single COMPLETED guard: a
  // stale, deleted, or hand-edited id reads as "nothing selected", so callers
  // never have to re-check the status themselves.
  const paramId = searchParams.get(PASSAGE_PARAM);
  const activeId = passages.some((p) => p.id === paramId && p.status === "COMPLETED")
    ? paramId
    : null;

  const setActiveId = useCallback(
    (id: string | null) => {
      const next = new URLSearchParams(searchParams);
      if (id) next.set(PASSAGE_PARAM, id);
      else next.delete(PASSAGE_PARAM);

      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  // Opens the most recent passage when nothing is selected yet. Self-limiting:
  // once the param resolves this returns early, so a passage finishing in the
  // background can never pull the reader away from what they are reading.
  useEffect(() => {
    if (activeId) return;

    const fallback = getMostRecentPassageId(passages);
    if (fallback) setActiveId(fallback);
  }, [activeId, passages, setActiveId]);

  const select = useCallback(
    (id: string) => {
      const target = passages.find((p) => p.id === id);
      if (target?.status !== "COMPLETED") return;
      setActiveId(id);
    },
    [passages, setActiveId],
  );

  const remove = useCallback(
    (id: string) => {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          if (id === activeId) setActiveId(null);
        },
      });
    },
    [deleteMutation, activeId, setActiveId],
  );

  return {
    activeId,
    isDeleting: deleteMutation.isPending,
    select,
    remove,
  };
}
