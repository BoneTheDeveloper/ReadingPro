"use client";

import {
  useCallback,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { deletePassageAction } from "@/features/passage-crud/server/actions/passage";
import type { PassageData } from "@/types/passage";
import type { DocumentItem } from "@/features/upload/components/panel/sources-panel";

type StudyStatus = "idle" | "uploading" | "analyzing" | "ready" | "error";

export interface StudyState {
  passages: PassageData[];
  activePassageId: string | null;
  status: StudyStatus;
  error: string | null;
  uploadModalOpen: boolean;
  uploadError: string | null;
}

function getMostRecentPassageId(passages: PassageData[]): string | null {
  return (
    passages.reduce<PassageData | null>((latest, passage) => {
      if (!latest) return passage;
      return passage.createdAt > latest.createdAt ? passage : latest;
    }, null)?.id ?? null
  );
}

export function useStudyWorkspaceState(initialPassages: PassageData[]) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [state, setState] = useState<StudyState>(() => {
    const initialId = getMostRecentPassageId(initialPassages);
    return {
      passages: initialPassages,
      activePassageId: initialId,
      status: initialId ? "ready" : "idle",
      error: null,
      uploadModalOpen: false,
      uploadError: null,
    };
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingFileName, setUploadingFileName] = useState("");

  const activePassage = useMemo(
    () =>
      state.passages.find((passage) => passage.id === state.activePassageId) ?? null,
    [state.passages, state.activePassageId],
  );

  const documents: DocumentItem[] = useMemo(
    () =>
      [...state.passages]
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
    [state.passages],
  );

  const handleSelectDocument = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      activePassageId: id,
      status: "ready",
      uploadError: null,
    }));
  }, []);

  const handleOpenUploadModal = useCallback(() => {
    if (isUploading) return;
    setState((prev) => ({ ...prev, uploadModalOpen: true, uploadError: null }));
  }, [isUploading]);

  const handleCloseUploadModal = useCallback(() => {
    setState((prev) => ({ ...prev, uploadModalOpen: false }));
  }, []);

  const handleUploadStart = useCallback(
    (fileName: string, _jobId: string, passageId: string) => {
      const tempPassage: PassageData = {
        id: passageId,
        title: fileName,
        content: "",
        cefrLevel: null,
        wordCount: 0,
        createdAt: Date.now(),
        sourceType: "TEXT",
        filePath: null,
        youtubeUrl: null,
        status: "processing",
      };
      setState((prev) => ({
        ...prev,
        passages: [tempPassage, ...prev.passages],
        error: null,
      }));
      setIsUploading(true);
      setUploadingFileName(fileName);
    },
    [],
  );

  const handleUploadComplete = useCallback(
    (data: { passage: PassageData; jobId: string }) => {
      const { passage } = data;

      setState((prev) => ({
        ...prev,
        passages: prev.passages.map((p) => (p.id === passage.id ? passage : p)),
        activePassageId: prev.activePassageId ?? passage.id,
        uploadModalOpen: false,
        status: "ready",
        error: null,
      }));

      setIsUploading(false);
      setUploadingFileName("");

      startTransition(() => {
        router.refresh();
      });
    },
    [router],
  );

  const handleUploadError = useCallback(
    (error: string, _jobId?: string, passageId?: string) => {
      if (passageId) {
        setState((prev) => ({
          ...prev,
          passages: prev.passages.filter((p) => p.id !== passageId),
        }));
      }
      setState((prev) => ({ ...prev, uploadError: error }));
      setIsUploading(false);
      setUploadingFileName("");
    },
    [],
  );

  const handleDeletePassage = useCallback(
    (passageId: string) => {
      startTransition(async () => {
        setState((prev) => {
          const remaining = prev.passages.filter((p) => p.id !== passageId);
          if (prev.activePassageId === passageId) {
            const replacementId = getMostRecentPassageId(remaining);
            return {
              ...prev,
              passages: remaining,
              activePassageId: replacementId,
              status: replacementId ? "ready" : "idle",
              error: null,
              uploadError: null,
            };
          }
          return {
            ...prev,
            passages: remaining,
            error: null,
            uploadError: null,
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
    [],
  );

  const handleClearUploadError = useCallback(() => {
    setState((prev) => ({ ...prev, uploadError: null }));
  }, []);

  return {
    state,
    setState,
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
    handleClearUploadError,
  };
}
