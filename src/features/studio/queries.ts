import { useQuery } from "@tanstack/react-query";
import {
  studioArtifactListItemSchema,
  type StudioArtifactListItem,
} from "@/features/studio/schema/artifact";
import { chatHistoryResponseSchema, type ChatHistoryMessage } from "@/features/studio/schema/ai-chat";
import { artifactKeys, chatKeys } from "./query-keys";

export { chatKeys };

/* ─── Fetchers ─────────────────────────────────────────────────────── */

async function fetchArtifactList(
  passageId: string,
  signal?: AbortSignal,
): Promise<StudioArtifactListItem[]> {
  const res = await fetch(`/api/artifact?passageId=${passageId}`, { signal });
  if (!res.ok) throw new Error("Không tải được danh sách artifact");
  return studioArtifactListItemSchema.array().parse(await res.json());
}

async function fetchArtifact(artifactId: string, signal?: AbortSignal) {
  const res = await fetch(`/api/artifact/${artifactId}`, { signal });
  if (res.status === 404) throw new Error("Artifact không tồn tại hoặc đã bị xóa");
  if (!res.ok) throw new Error("Không tải được nội dung artifact");
  return res.json();
}

async function fetchChatHistory(
  passageId: string,
  signal?: AbortSignal,
): Promise<ChatHistoryMessage[]> {
  const res = await fetch(`/api/ai-chat?passageId=${passageId}`, { signal });
  if (!res.ok) throw new Error("Không tải được lịch sử trò chuyện");
  return chatHistoryResponseSchema.parse(await res.json()).messages;
}

/* ─── Query hooks ──────────────────────────────────────────────────── */

export function useArtifactList(passageId: string | null) {
  return useQuery({
    queryKey: artifactKeys.list(passageId ?? ""),
    queryFn: ({ signal }) => fetchArtifactList(passageId!, signal),
    enabled: Boolean(passageId),
    // Poll while any artifact is non-terminal; stop once all reach terminal.
    refetchInterval: (query) => {
      const artifacts = query.state.data ?? [];
      const hasPending = artifacts.some((a) => a.status !== "COMPLETED");
      return hasPending ? 2000 : false;
    },
  });
}

export function useArtifact(artifactId: string | null) {
  return useQuery({
    queryKey: artifactKeys.detail(artifactId ?? ""),
    queryFn: ({ signal }) => fetchArtifact(artifactId!, signal),
    enabled: Boolean(artifactId),
  });
}

export function useChatHistory(passageId: string | null) {
  return useQuery({
    queryKey: chatKeys.history(passageId ?? ""),
    queryFn: ({ signal }) => fetchChatHistory(passageId!, signal),
    enabled: Boolean(passageId),
    // History grows whenever the user sends a new message; always refetch on
    // mount so reopening a passage reflects the latest persisted turns.
    staleTime: 0,
    refetchOnMount: "always",
  });
}
