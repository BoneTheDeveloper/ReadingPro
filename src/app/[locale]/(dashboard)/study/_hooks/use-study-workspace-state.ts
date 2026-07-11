"use client";

import {
  useCallback,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { deletePassageAction } from "../_components/actions";
import type { PassageData } from "@/types/passage";
import type { DocumentItem } from "@/features/upload/ui/sources-panel";

export type StudyStatus =
  "idle" | "uploading" | "analyzing" | "ready" | "error";

export interface StudyState {
  passages: PassageData[];
  activePassageId: string | null;
  status: StudyStatus;
  error: string | null;
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

  // Replace useOptimistic with regular state
  const [passages, setPassages] = useState<PassageData[]>(initialPassages);

  const [state, setState] = useState<StudyState>(() => {
    const initialId = getMostRecentPassageId(initialPassages);
    return {
      passages: initialPassages,
      activePassageId: initialId,
      status: initialId ? "ready" : "idle",
      error: null,
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
          date: passage.status === "processing"
            ? ""
            : new Date(passage.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              }),
          level: passage.cefrLevel,
          wordCount: passage.wordCount,
          sourceType: passage.sourceType,
          status: passage.status,
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
    if (isUploading) return; // Prevent opening during upload
    setState((prev) => ({ ...prev, uploadModalOpen: true }));
  }, [isUploading]);

  const handleCloseUploadModal = useCallback(() => {
    setState((prev) => ({ ...prev, uploadModalOpen: false }));
  }, []);

  const handleUploadStart = useCallback(
    (fileName: string, jobId: string, passageId: string) => {
      // Create temp passage with processing status
      const tempPassage: PassageData = {
        id: passageId,
        title: fileName,
        content: "",
        cefrLevel: null,
        wordCount: 0,
        createdAt: Date.now(),
        sourceType: "TEXT",
        status: "processing",
      };
      setPassages((prev) => [tempPassage, ...prev]);
      setIsUploading(true);
      setUploadingFileName(fileName);
    },
    [],
  );

  const handleUploadComplete = useCallback(
    (data: { passage: PassageData; jobId: string }) => {
      const { passage } = data;

      // In-place replace: same ID, status becomes ready
      setPassages((prev) =>
        prev.map((p) => (p.id === passage.id ? passage : p)),
      );

      // Only switch if no active passage (preserve user's reading)
      setState((prev) => ({
        ...prev,
        activePassageId: prev.activePassageId ?? passage.id,
        uploadModalOpen: false,
        status: "ready",
        error: null,
      }));

      setIsUploading(false);
      setUploadingFileName("");

      // Background sync from RSC
      startTransition(() => {
        router.refresh();
      });
    },
    [router],
  );

  const handleUploadError = useCallback(
    (error: string, _jobId?: string, passageId?: string) => {
      // Remove temporary passage if exists
      if (passageId) {
        setPassages((prev) => prev.filter((p) => p.id !== passageId));
      }
      setState((prev) => ({ ...prev, error }));
      setIsUploading(false);
      setUploadingFileName("");
    },
    [],
  );

  const handleDeletePassage = useCallback(
    (passageId: string) => {
      startTransition(async () => {
        // Remove from local state
        setPassages((prev) => prev.filter((p) => p.id !== passageId));

        setState((prev) => {
          const restArtifactsByPassageId = { ...prev.artifactsByPassageId };
          const restViewingByPassageId = { ...prev.viewingArtifactByPassageId };
          delete restArtifactsByPassageId[passageId];
          delete restViewingByPassageId[passageId];
          if (prev.activePassageId === passageId) {
            // Re-read from current passages state (already updated above)
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
    [passages],
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
