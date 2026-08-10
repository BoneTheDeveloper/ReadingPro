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
  return useMutation({
    mutationKey: ["createPassage"],
    mutationFn: (input: CreatePassageInput) =>
      fetchJson("/api/passage", passageSchema, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
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
