"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { passageKeys } from "@/features/passage/api/query-keys";
import {  type CreatePassageInput, type Passage, type PassageListItem } from "@/features/passage/schema";

/* ─── Create ───────────────────────────────────────────────────────── */

export function useCreatePassage() {
  return useMutation({
    mutationKey: ["createPassage"],
    mutationFn: async (input: CreatePassageInput): Promise<Passage> => {
      const res = await fetch("/api/passage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message || "Tạo thất bại");
      }
      return await res.json();
    },
  });
}

/* ─── Delete ───────────────────────────────────────────────────────── */

export function useDeletePassage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (passageId: string) =>
      fetch(`/api/passage/${passageId}`, { method: "DELETE" }).then((res) => {
        if (!res.ok) throw new Error("Xóa thất bại");
      }),

    onMutate: async (passageId) => {
      await queryClient.cancelQueries({ queryKey: passageKeys.list() });
      const previous = queryClient.getQueryData<PassageListItem[]>(passageKeys.list());

      queryClient.setQueryData<PassageListItem[]>(
        passageKeys.list(),
        (prev = []) => prev.filter((p) => p.id !== passageId),
      );

      return { previous };
    },

    onError: (_err, _passageId, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(passageKeys.list(), ctx.previous);
      }
    },

    onSuccess: (_data, passageId) => {
      queryClient.removeQueries({ queryKey: passageKeys.detail(passageId) });
    },
  });
}
