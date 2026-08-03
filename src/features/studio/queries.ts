import { useQuery } from "@tanstack/react-query";
import {
  studioArtifactListItemSchema,
  type StudioArtifactListItem,
} from "@/features/studio/schema/artifact";
import { artifactKeys } from "./query-keys";

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

/* ─── Query hooks ──────────────────────────────────────────────────── */

export function useArtifactList(passageId: string | null) {
  return useQuery({
    queryKey: artifactKeys.list(passageId ?? ""),
    queryFn: ({ signal }) => fetchArtifactList(passageId!, signal),
    enabled: Boolean(passageId),
    // Poll while any artifact is non-terminal; stop once all reach terminal.
    refetchInterval: (query) => {
      const artifacts = query.state.data ?? [];
      const hasPending = artifacts.some(
        (a) => a.status !== "COMPLETED" && a.status !== "FAILED",
      );
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
