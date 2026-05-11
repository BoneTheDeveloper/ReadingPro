"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  Group,
  Panel,
  Separator,
  useDefaultLayout,
} from "react-resizable-panels";
import { studySimplifyAction } from "@/app/actions/study-simplify-action";
import { studyGenerateQuestionsAction } from "@/app/actions/study-generate-questions-action";
import { studyDeletePassageAction } from "@/app/actions/study-delete-passage-action";
import type {
  StudyState,
  PassageData,
  DocumentItem,
  ResultItem,
  ResultItemType,
  StudioCardId,
} from "./study-types";
import { StudySourcesPanel } from "./study-left-panel";
import { StudyContentPanel } from "./study-content-panel";
import { StudyStudioPanel } from "./study-right-panel";
import { StudyUploadModal } from "./study-upload-modal";

const noopStorage = { getItem: () => null, setItem: () => {} };

export function StudyPageClient({
  initialPassages,
}: {
  initialPassages: PassageData[];
}) {
  const [state, setState] = useState<StudyState>(() => ({
    passages: initialPassages,
    activePassageId: null,
    questions: [],
    status: "idle",
    error: null,
    simplifying: false,
    generatingQuestions: false,
    uploadModalOpen: false,
  }));
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingFileName, setUploadingFileName] = useState<string>("");
  const [results, setResults] = useState<ResultItem[]>([]);
  const [mounted, setMounted] = useState(false);

  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: "study-panels",
    storage: mounted ? sessionStorage : noopStorage,
  });
  useEffect(() => {
    setMounted(true);
  }, []);
  const activePassage = useMemo(
    () => state.passages.find((p) => p.id === state.activePassageId) ?? null,
    [state.passages, state.activePassageId],
  );

  const documents: DocumentItem[] = useMemo(
    () =>
      [...state.passages]
        .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
        .map((p) => ({
          id: p.id,
          title: p.title,
          date: new Date(p.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          level: p.originalLevel,
          wordCount: p.wordCount,
        })),
    [state.passages],
  );

  const handleUploadStart = useCallback((fileName: string) => {
    setIsUploading(true);
    setUploadingFileName(fileName);
  }, []);

  const handleUploadComplete = useCallback((passage: PassageData) => {
    setState((prev) => ({
      ...prev,
      passages: [...prev.passages, passage],
      activePassageId: passage.id,
      uploadModalOpen: false,
      status: "ready",
      questions: [],
      error: null,
    }));
    setIsUploading(false);
    setUploadingFileName("");
  }, []);

  const handleUploadError = useCallback((error: string) => {
    setState((prev) => ({ ...prev, error }));
    setIsUploading(false);
    setUploadingFileName("");
  }, []);

  const handleSimplify = useCallback(async () => {
    const passageId = state.activePassageId;
    if (!passageId) return;
    setState((prev) => ({ ...prev, simplifying: true, error: null }));
    try {
      const result = await studySimplifyAction({ passageId });
      if ("error" in result) {
        setState((prev) => ({
          ...prev,
          simplifying: false,
          error: result.error,
        }));
        return;
      }
      if ("skipped" in result) {
        setState((prev) => ({ ...prev, simplifying: false }));
        return;
      }
      setState((prev) => ({
        ...prev,
        simplifying: false,
        passages: prev.passages.map((p) =>
          p.id === prev.activePassageId
            ? {
                ...p,
                simplifiedContent: result.simplifiedContent,
                simplifiedLevel: result.simplifiedLevel,
              }
            : p,
        ),
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        simplifying: false,
        error: err instanceof Error ? err.message : "Simplification failed",
      }));
    }
  }, [state.activePassageId]);

  const handleSelectDocument = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      activePassageId: id,
      questions: [],
      status: "ready",
    }));
  }, []);

  const handleReset = useCallback(() => {
    setState({
      passages: initialPassages,
      activePassageId: null,
      questions: [],
      status: "idle",
      error: null,
      simplifying: false,
      generatingQuestions: false,
      uploadModalOpen: false,
    });
    setResults([]);
  }, [initialPassages]);

  const handleActionClick = useCallback(
    async (cardId: StudioCardId) => {
      const passageId = state.activePassageId;
      if (!passageId) return;
      const passage = state.passages.find((p) => p.id === passageId);
      if (!passage) return;

      const resultId = crypto.randomUUID();
      const resultType: ResultItemType = cardId === "quiz" ? "quiz" : "summary";

      setResults((prev) => [
        {
          id: resultId,
          type: resultType,
          passageId,
          passageTitle: passage.title,
          status: "running",
          startedAt: Date.now(),
        },
        ...prev,
      ]);

      if (cardId === "quiz") {
        try {
          const result = await studyGenerateQuestionsAction({ passageId });
          // Guard: discard if user switched passage during generation
          if (state.activePassageId !== passageId) {
            setResults((prev) =>
              prev.map((r) =>
                r.id === resultId ? { ...r, status: "error" as const } : r,
              ),
            );
            return;
          }
          if ("error" in result) {
            setState((prev) => ({ ...prev, error: result.error }));
            setResults((prev) =>
              prev.map((r) =>
                r.id === resultId ? { ...r, status: "error" as const } : r,
              ),
            );
            return;
          }
          setState((prev) => ({ ...prev, questions: result.questions }));
          setResults((prev) =>
            prev.map((r) =>
              r.id === resultId
                ? {
                    ...r,
                    status: "completed" as const,
                    completedAt: Date.now(),
                    data: { questions: result.questions },
                  }
                : r,
            ),
          );
        } catch (err) {
          setState((prev) => ({
            ...prev,
            error: err instanceof Error ? err.message : "Generation failed",
          }));
          setResults((prev) =>
            prev.map((r) =>
              r.id === resultId ? { ...r, status: "error" as const } : r,
            ),
          );
        }
      } else if (cardId === "summary") {
        setState((prev) => ({ ...prev, simplifying: true, error: null }));
        try {
          const result = await studySimplifyAction({ passageId });
          if (state.activePassageId !== passageId) {
            setResults((prev) =>
              prev.map((r) =>
                r.id === resultId ? { ...r, status: "error" as const } : r,
              ),
            );
            setState((prev) => ({ ...prev, simplifying: false }));
            return;
          }
          if ("error" in result) {
            setState((prev) => ({
              ...prev,
              simplifying: false,
              error: result.error,
            }));
            setResults((prev) =>
              prev.map((r) =>
                r.id === resultId ? { ...r, status: "error" as const } : r,
              ),
            );
            return;
          }
          if ("skipped" in result) {
            setState((prev) => ({ ...prev, simplifying: false }));
            setResults((prev) =>
              prev.map((r) =>
                r.id === resultId
                  ? {
                      ...r,
                      status: "completed" as const,
                      completedAt: Date.now(),
                      data: {
                        simplifiedContent: passage.simplifiedContent,
                        simplifiedLevel: passage.simplifiedLevel,
                      },
                    }
                  : r,
              ),
            );
            return;
          }
          setState((prev) => ({
            ...prev,
            simplifying: false,
            passages: prev.passages.map((p) =>
              p.id === passageId
                ? {
                    ...p,
                    simplifiedContent: result.simplifiedContent,
                    simplifiedLevel: result.simplifiedLevel,
                  }
                : p,
            ),
          }));
          setResults((prev) =>
            prev.map((r) =>
              r.id === resultId
                ? {
                    ...r,
                    status: "completed" as const,
                    completedAt: Date.now(),
                    data: {
                      simplifiedContent: result.simplifiedContent,
                      simplifiedLevel: result.simplifiedLevel,
                    },
                  }
                : r,
            ),
          );
        } catch (err) {
          setState((prev) => ({
            ...prev,
            simplifying: false,
            error: err instanceof Error ? err.message : "Simplification failed",
          }));
          setResults((prev) =>
            prev.map((r) =>
              r.id === resultId ? { ...r, status: "error" as const } : r,
            ),
          );
        }
      }
    },
    [state.activePassageId, state.passages],
  );

  const handleOpenUploadModal = useCallback(() => {
    setState((prev) => ({ ...prev, uploadModalOpen: true }));
  }, []);

  const handleCloseUploadModal = useCallback(() => {
    setState((prev) => ({ ...prev, uploadModalOpen: false }));
  }, []);

  const handleDeletePassage = useCallback(async (passageId: string) => {
    const result = await studyDeletePassageAction({ passageId });
    if ("error" in result) {
      setState((prev) => ({ ...prev, error: result.error }));
      return;
    }
    setState((prev) => ({
      ...prev,
      passages: prev.passages.filter((p) => p.id !== passageId),
      activePassageId: prev.activePassageId === passageId ? null : prev.activePassageId,
      questions: prev.activePassageId === passageId ? [] : prev.questions,
      status: prev.activePassageId === passageId ? "idle" : prev.status,
    }));
  }, []);

  return (
    <>
      {/* Sticky reading progress bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-surface-container z-50">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: "0%" }}
        />
      </div>

      {/* Three-panel workspace */}
      <div
        className="flex-1 min-h-0 overflow-hidden"
        style={{ background: "#f5f5f5", padding: "4rem 8px 8px 8px" }}
      >
        <Group
          id="study-panels"
          orientation="horizontal"
          defaultLayout={defaultLayout}
          onLayoutChanged={onLayoutChanged}
          className="flex flex-1 h-full"
        >
          <Panel id="sources" defaultSize="22%" minSize={220} maxSize="70%">
            <StudySourcesPanel
              documents={documents}
              activeId={state.activePassageId}
              onSelect={handleSelectDocument}
              onOpenUploadModal={handleOpenUploadModal}
              isUploading={isUploading}
              uploadingFileName={uploadingFileName}
              onDelete={handleDeletePassage}
            />
          </Panel>

          <Separator className="w-4 cursor-col-resize" />

          <Panel id="content" minSize={220}>
            <div className="h-full bg-white flex flex-col overflow-hidden rounded-xl border border-[#e5e7eb]">
              <div className="p-4 border-b" style={{ borderColor: "#e5e7eb" }}>
                <h2 className="text-[12px] font-semibold text-on-surface-variant uppercase tracking-wider">
                  Content
                </h2>
              </div>
              <StudyContentPanel
                passage={activePassage}
                error={state.error}
                simplifying={state.simplifying}
                onSimplify={handleSimplify}
              />
            </div>
          </Panel>

          <Separator className="w-4 cursor-col-resize" />

          <Panel id="studio" defaultSize="26%" minSize={240} maxSize="70%">
            <StudyStudioPanel
              results={results}
              hasActivePassage={!!state.activePassageId}
              simplifying={state.simplifying}
              onActionClick={handleActionClick}
            />
          </Panel>
        </Group>
      </div>

      {/* Upload modal */}
      <StudyUploadModal
        isOpen={state.uploadModalOpen}
        onClose={handleCloseUploadModal}
        onUploadStart={handleUploadStart}
        onUploadComplete={handleUploadComplete}
        onUploadError={handleUploadError}
      />
    </>
  );
}
