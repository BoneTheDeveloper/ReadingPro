"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  Group,
  Panel,
  Separator,
  useDefaultLayout,
} from "react-resizable-panels";
import type { PanelImperativeHandle } from "react-resizable-panels";
import { studySimplifyAction } from "@/features/study/actions/study-simplify-action";
import { studyGenerateQuestionsAction } from "@/features/study/actions/study-generate-questions-action";
import { studyDeletePassageAction } from "@/features/study/actions/study-delete-passage-action";
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
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [leftCollapsible, setLeftCollapsible] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [rightCollapsible, setRightCollapsible] = useState(false);

  const leftPanelRef = useRef<PanelImperativeHandle>(null);
  const rightPanelRef = useRef<PanelImperativeHandle>(null);

  const toggleLeft = useCallback(() => {
    const panel = leftPanelRef.current;
    if (!panel) return;

    if (!panel.isCollapsed()) {
      // Enable collapsible BEFORE calling collapse()
      setLeftCollapsible(true);
      // Wait for React to re-render collapsible=true
      setTimeout(() => {
        panel.collapse();
        setLeftPanelCollapsed(true);
      }, 0);
    } else {
      panel.expand();
      setLeftPanelCollapsed(false);
      // Disable collapsible after expand finishes
      setTimeout(() => setLeftCollapsible(false), 150);
    }
  }, []);

  const toggleRight = useCallback(() => {
    const panel = rightPanelRef.current;
    if (!panel) return;

    if (!panel.isCollapsed()) {
      // Enable collapsible BEFORE calling collapse()
      setRightCollapsible(true);
      // Wait for React to re-render collapsible=true
      setTimeout(() => {
        panel.collapse();
        setRightPanelCollapsed(true);
      }, 0);
    } else {
      panel.expand();
      setRightPanelCollapsed(false);
      // Disable collapsible after expand finishes
      setTimeout(() => setRightCollapsible(false), 150);
    }
  }, []);

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
          sourceType: p.sourceType,
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
      activePassageId:
        prev.activePassageId === passageId ? null : prev.activePassageId,
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
      <div className="flex-1 min-h-0 overflow-hidden bg-muted px-2 pb-2 pt-16">
        <Group
          id="study-panels"
          orientation="horizontal"
          defaultLayout={defaultLayout}
          onLayoutChanged={onLayoutChanged}
          className="flex flex-1 h-full"
        >
          <Panel
            panelRef={leftPanelRef}
            id="source"
            collapsible={leftCollapsible}
            collapsedSize="60px"
            defaultSize="280px"
            minSize="200px"
            maxSize="800px"
          >
            <StudySourcesPanel
              documents={documents}
              activeId={state.activePassageId}
              onSelect={handleSelectDocument}
              onOpenUploadModal={handleOpenUploadModal}
              isUploading={isUploading}
              uploadingFileName={uploadingFileName}
              onDelete={handleDeletePassage}
              collapsed={leftPanelCollapsed}
              onToggleCollapse={toggleLeft}
            />
          </Panel>

          <Separator
            disabled={leftPanelCollapsed}
            className={`w-4 ${leftPanelCollapsed ? "cursor-default! pointer-events-auto" : ""}`}
          />
          <Panel id="content" minSize={220}>
            <div className="h-full bg-background flex flex-col overflow-hidden rounded-xl border border-border">
              <div className="p-4 border-b border-border">
                <h2 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">
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

          <Separator
            disabled={rightPanelCollapsed}
            className={`w-4 ${rightPanelCollapsed ? "cursor-default! pointer-events-auto" : ""}`}
          />

          <Panel
            panelRef={rightPanelRef}
            id="studio"
            collapsible={rightCollapsible}
            collapsedSize="60px"
            defaultSize="280px"
            minSize="200px"
          >
            <StudyStudioPanel
              results={results}
              hasActivePassage={!!state.activePassageId}
              simplifying={state.simplifying}
              onActionClick={handleActionClick}
              collapsed={rightPanelCollapsed}
              onToggleCollapse={toggleRight}
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
