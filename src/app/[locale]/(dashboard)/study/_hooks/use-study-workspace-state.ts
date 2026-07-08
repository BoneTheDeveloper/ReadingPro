"use client";

import {
  useCallback,
  useMemo,
  useOptimistic,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { deletePassageAction } from "../_components/actions";
import type { PassageData } from "@/features/passage/schemas/passage.schema";
import type { DocumentItem } from "@/features/upload/ui/sources-panel";

export type StudyStatus =
  "idle" | "uploading" | "analyzing" | "ready" | "error";

export interface StudyState {
  passages: PassageData[];
  activePassageId: string | null;
  status: StudyStatus;
  error: string | null;
  simplifying: boolean;
  uploadModalOpen: boolean;
  artifactsByPassageId: Record<
    string,
    import("@/features/studio-panel/actions").ArtifactsCacheEntry
  >;
  viewingArtifactByPassageId: Record<
    string,
    import("@/features/studio-panel/actions").ArtifactRef | null
  >;
  artifactDetailById: Record<
    string,
    import("@/features/studio-panel/actions").ArtifactDetailCacheEntry
  >;
}

type PassagesAction =
  { type: "add"; passage: PassageData } | { type: "remove"; id: string };

function passagesReducer(
  passages: PassageData[],
  action: PassagesAction,
): PassageData[] {
  switch (action.type) {
    case "add":
      return [...passages, action.passage];
    case "remove":
      return passages.filter((p) => p.id !== action.id);
  }
}

function getMostRecentPassageId(passages: PassageData[]): string | null {
  return (
    passages.reduce<PassageData | null>((latest, passage) => {
      if (!latest) return passage;
      // Strict > preserves first-seen order on ties
      return passage.createdAt > latest.createdAt ? passage : latest;
    }, null)?.id ?? null
  );
}

export function useStudyWorkspaceState(initialPassages: PassageData[]) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  // Server-authoritative list: `initialPassages` (RSC) is the source of truth;
  // this overlay only exists so add/remove feel instant before revalidation lands.
  const [passages, applyPassagesAction] = useOptimistic(
    initialPassages,
    passagesReducer,
  );

  const [state, setState] = useState<StudyState>(() => {
    const initialId = getMostRecentPassageId(initialPassages);
    return {
      passages: initialPassages,
      activePassageId: initialId,
      status: initialId ? "ready" : "idle",
      error: null,
      simplifying: false,
      uploadModalOpen: false,
      artifactsByPassageId: {},
      viewingArtifactByPassageId: {},
      artifactDetailById: {},
    };
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingFileName, setUploadingFileName] = useState("");

  const activePassage = useMemo(
    () =>
      passages.find((passage) => passage.id === state.activePassageId) ?? null,
    [passages, state.activePassageId],
  );

  const documents: DocumentItem[] = useMemo(
    () =>
      [...passages]
        .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
        .map((passage) => ({
          id: passage.id,
          title: passage.title,
          date: new Date(passage.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          level: passage.originalLevel,
          wordCount: passage.wordCount,
          sourceType: passage.sourceType,
        })),
    [passages],
  );

  const handleSelectDocument = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      activePassageId: id,
      status: "ready",
    }));
  }, []);

  const handleOpenUploadModal = useCallback(() => {
    setState((prev) => ({ ...prev, uploadModalOpen: true }));
  }, []);

  const handleCloseUploadModal = useCallback(() => {
    setState((prev) => ({ ...prev, uploadModalOpen: false }));
  }, []);

  const handleUploadStart = useCallback((fileName: string) => {
    setIsUploading(true);
    setUploadingFileName(fileName);
  }, []);

  const handleUploadComplete = useCallback(
    (passage: PassageData) => {
      startTransition(() => {
        applyPassagesAction({ type: "add", passage });
      });
      setState((prev) => ({
        ...prev,
        activePassageId: passage.id,
        uploadModalOpen: false,
        status: "ready",
        error: null,
      }));
      setIsUploading(false);
      setUploadingFileName("");
      // Kicks off a fresh RSC fetch so the client-synthesized passage above is
      // replaced by the server-authoritative row (full content, real levels).
      router.refresh();
    },
    [applyPassagesAction, router],
  );

  const handleUploadError = useCallback((error: string) => {
    setState((prev) => ({ ...prev, error }));
    setIsUploading(false);
    setUploadingFileName("");
  }, []);

  const handleDeletePassage = useCallback(
    (passageId: string) => {
      startTransition(async () => {
        applyPassagesAction({ type: "remove", id: passageId });
        setState((prev) => {
          const restArtifactsByPassageId = { ...prev.artifactsByPassageId };
          const restViewingByPassageId = { ...prev.viewingArtifactByPassageId };
          delete restArtifactsByPassageId[passageId];
          delete restViewingByPassageId[passageId];
          if (prev.activePassageId === passageId) {
            const remaining = passages.filter((p) => p.id !== passageId);
            const replacementId = getMostRecentPassageId(remaining);
            return {
              ...prev,
              activePassageId: replacementId,
              artifactsByPassageId: restArtifactsByPassageId,
              viewingArtifactByPassageId: restViewingByPassageId,
              status: replacementId ? "ready" : "idle",
              error: null,
            };
          }
          return {
            ...prev,
            artifactsByPassageId: restArtifactsByPassageId,
            viewingArtifactByPassageId: restViewingByPassageId,
            error: null,
          };
        });
        try {
          await deletePassageAction(passageId);
        } catch (err) {
          setState((prev) => ({
            ...prev,
            error:
              err instanceof Error ? err.message : "Failed to delete passage",
          }));
        }
      });
    },
    [applyPassagesAction, passages],
  );

  return {
    state,
    setState,
    passages,
    activePassage,
    documents,
    isUploading,
    uploadingFileName,
    handleSelectDocument,
    handleOpenUploadModal,
    handleCloseUploadModal,
    handleUploadStart,
    handleUploadComplete,
    handleUploadError,
    handleDeletePassage,
  };
}
