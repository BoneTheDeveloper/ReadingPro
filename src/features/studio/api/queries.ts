import { queryOptions, skipToken } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api/fetch-json";
import {
  studioArtifactListItemSchema,
  studioArtifactSchema,
} from "@/features/studio/schema/artifact";
import { chatHistoryResponseSchema } from "@/features/studio/schema/ai-chat";

export const artifactQueries = {
  all: () => ["artifacts"] as const,

  list: (passageId: string | null) =>
    queryOptions({
      queryKey: [...artifactQueries.all(), "list", passageId ?? ""] as const,
      queryFn:
        passageId === null
          ? skipToken
          : ({ signal }) =>
              fetchJson(
                `/api/artifact?passageId=${passageId}`,
                studioArtifactListItemSchema.array(),
                { signal },
              ),
      // Poll only while work is in flight; COMPLETED and FAILED are terminal.
      refetchInterval: (query) =>
        (query.state.data ?? []).some((a) => a.status === "PENDING") ? 2000 : false,
    }),

  detail: (artifactId: string | null) =>
    queryOptions({
      queryKey: [...artifactQueries.all(), "detail", artifactId ?? ""] as const,
      queryFn:
        artifactId === null
          ? skipToken
          : ({ signal }) =>
              fetchJson(`/api/artifact/${artifactId}`, studioArtifactSchema, { signal }),
    }),
};

export const chatQueries = {
  all: () => ["chat"] as const,

  history: (passageId: string | null) =>
    queryOptions({
      queryKey: [...chatQueries.all(), "history", passageId ?? ""] as const,
      queryFn:
        passageId === null
          ? skipToken
          : async ({ signal }) => {
              const body = await fetchJson(
                `/api/ai-chat?passageId=${passageId}`,
                chatHistoryResponseSchema,
                { signal },
              );
              return body.messages;
            },
      // History grows whenever the user sends a new message; always refetch on
      // mount so reopening a passage reflects the latest persisted turns.
      staleTime: 0,
      refetchOnMount: "always",
    }),
};
