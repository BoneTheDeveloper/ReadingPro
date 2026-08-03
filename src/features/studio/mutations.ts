import { useMutation, useQueryClient } from "@tanstack/react-query";
import { artifactKeys } from "./query-keys";
import type { StudioArtifactListItem } from "@/features/studio/schema/artifact";
import { StudioArtifactType } from "@/generated/prisma/enums";


export function useGenerateQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["artifact", "generate", StudioArtifactType.QUESTION],
    mutationFn: async (passageId: string) => {
      const res = await fetch("/api/artifact/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passageId: passageId,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error?.message ?? "Tạo câu hỏi thất bại");
      }
      return res.json() as Promise<{ artifact: StudioArtifactListItem }>;
    },

    // Seed the list cache so the new PENDING row appears immediately;
    // useArtifactList's poll picks up the COMPLETED transition on the next
    // tick. No second polling loop here.
    onSuccess: ({ artifact }, passageId) => {
      const key = artifactKeys.list(passageId);
      queryClient.setQueryData<StudioArtifactListItem[]>(key, (prev) =>
        prev ? [artifact, ...prev] : [artifact],
      );
      queryClient.invalidateQueries({ queryKey: artifactKeys.list(passageId) });
    },
  });
}


export function useRecordProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      artifactId,
      progress,
    }: {
      artifactId: string;
      passageId: string;
      progress: unknown;
    }) => {
      const res = await fetch(`/api/artifact/${artifactId}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progress }),
      });
      if (!res.ok) throw new Error("Cập nhật tiến độ thất bại");
      return res.json();
    },

    onSuccess: (_data, { artifactId, passageId, progress }) => {
      const key = artifactKeys.list(passageId);
      queryClient.setQueryData(key, (old: StudioArtifactListItem[] | undefined) => {
        if (!old) return old;
        return old.map((a) =>
          a.id === artifactId ? { ...a, progress } : a,
        );
      });
    },
  });
}


export function useDeleteArtifact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      artifactId,
      passageId,
    }: {
      artifactId: string;
      passageId: string;
    }) => {
      const res = await fetch(`/api/artifact/${artifactId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Xóa artifact thất bại");
      return { artifactId, passageId };
    },

    onSuccess: ({ artifactId, passageId }) => {
      queryClient.setQueryData<StudioArtifactListItem[]>(
        artifactKeys.list(passageId),
        (old) => old?.filter((a) => a.id !== artifactId),
      );
      queryClient.removeQueries({ queryKey: artifactKeys.detail(artifactId) });
    },
  });
}
