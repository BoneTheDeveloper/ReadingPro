"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { fetchJson } from "@/lib/api/fetch-json";
import { passageQueries } from "@/features/passage/api/queries";
import {
  passageSchema,
  type CreatePassageInput,
  type PassageListItem,
} from "@/features/passage/schema";

/* ─── Create ───────────────────────────────────────────────────────── */

export function useCreatePassageMutation() {
  const queryClient = useQueryClient();
  const listKey = passageQueries.list().queryKey;

  return useMutation({
    mutationKey: ["createPassage"],
    mutationFn: (input: CreatePassageInput) =>
      fetchJson("/api/passage", passageSchema, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),

    // The row lands in the list immediately (status PENDING); the list's
    // polling loop then drives it to COMPLETED. Deliberately no detail-cache
    // write — the response body is the unprocessed passage, and AI processing
    // rewrites content/title/cefrLevel server-side afterwards.
    onSuccess: ({ id, title, sourceType, status, createdAt }) => {
      queryClient.setQueryData(listKey, (prev: PassageListItem[] = []) => [
        { id, title, sourceType, status, createdAt },
        ...prev,
      ]);
    },
  });
}

/* ─── Delete ───────────────────────────────────────────────────────── */

export function useDeletePassageMutation() {
  const queryClient = useQueryClient();
  const listKey = passageQueries.list().queryKey;

  return useMutation({
    mutationFn: (passageId: string) =>
      fetchJson(`/api/passage/${passageId}`, z.void(), { method: "DELETE" }),

    onMutate: async (passageId) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData(listKey);

      queryClient.setQueryData(listKey, (prev: PassageListItem[] = []) =>
        prev.filter((p) => p.id !== passageId),
      );

      return { previous };
    },

    onError: (_err, _passageId, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(listKey, ctx.previous);
      }
    },

    onSuccess: (_data, passageId) => {
      queryClient.removeQueries({
        queryKey: passageQueries.detail(passageId).queryKey,
      });
    },
  });
}
