"use client";

import { useCallback, useEffect, useState } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import * as Sentry from "@sentry/nextjs";
import {
  translateResponseSchema,
  vocabularyResponseSchema,
} from "@/contracts/translation/translation-response-schema";
import { clampTranslationContext, isTranslateTextWithinLimit } from "@/contracts/translation/translation-limits";
import type { PassageData, TranslationSelection, QuickTranslationData, StudioArtifact } from "@/features/study/model/types";
import { ARTIFACT_STALE_TIME } from "@/features/study/model/types";
import { StudySourcesPanel } from "./sources-panel";
import { StudyContentPanel } from "./studio/content/content-panel";
import { StudyStudioPanel } from "./studio/studio-panel";
import { StudyTranslationPopup } from "./studio/translate/translation-popup";
import { StudyUploadModal } from "./upload-modal";
import { useStudyActions } from "@/features/study/hooks/use-study-actions";
import { STUDY_API_ROUTES } from "@/features/study/api-client/api-utils";
import { useStudyPanelLayout } from "@/features/study/hooks/use-study-panel-layout";
import { useStudyWorkspaceState } from "@/features/study/hooks/use-study-workspace-state";

let quickTranslationRequestCounter = 0;

type QuickTranslationStatus = "idle" | "ready" | "loading" | "success" | "error";

interface QuickTranslationState {
  requestId: number;
  data: QuickTranslationData | null;
  status: QuickTranslationStatus;
}

export function StudyPageClient({
  initialPassages,
}: {
  initialPassages: PassageData[];
}) {
  const {
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
  } = useStudyWorkspaceState(initialPassages);
  const { handleSimplify, handleActionClick, handleViewArtifact, handleRecordQuizResult, handleResetQuizResult, retryQuizArtifact } = useStudyActions({ state, setState });
  const layout = useStudyPanelLayout();
  // Presence heartbeat is mounted app-wide in DashboardSidebar; the study page is
  // wrapped by it, so no per-page heartbeat is needed here.

  // Translation state (lifted from StudyContentPanel)
  const [contentViewMode, setContentViewMode] = useState<"original" | "simplified">("simplified");
  const [selection, setSelection] = useState<TranslationSelection | null>(null);
  const [quickTranslationState, setQuickTranslationState] = useState<QuickTranslationState>({
    requestId: 0,
    data: null,
    status: "idle",
  });
  const [savedVocabularyIds, setSavedVocabularyIds] = useState<Set<string>>(new Set());
  const [viewingLookup, setViewingLookup] = useState(false);

  // Clear stale selection on passage/mode change (adjust during rendering, not in effect)
  const [prevPassageId, setPrevPassageId] = useState(state.activePassageId);
  const [prevViewMode, setPrevViewMode] = useState(contentViewMode);
  if (state.activePassageId !== prevPassageId || contentViewMode !== prevViewMode) {
    setPrevPassageId(state.activePassageId);
    setPrevViewMode(contentViewMode);
    setSelection(null);
    setQuickTranslationState((prev) => ({
      requestId: prev.requestId + 1,
      data: null,
      status: "idle",
    }));
  }

  const handleSelectionChange = useCallback((sel: TranslationSelection | null) => {
    setSelection(sel);

    if (!sel) {
      setQuickTranslationState((prev) => ({
        requestId: prev.requestId + 1,
        data: null,
        status: "idle",
      }));
      return;
    }

    if (!isTranslateTextWithinLimit(sel.selectedText)) {
      setSelection(null);
      setQuickTranslationState((prev) => ({
        requestId: prev.requestId + 1,
        data: null,
        status: "idle",
      }));
      Sentry.addBreadcrumb({
        category: "study-translation",
        level: "info",
        message: "study-translation-selection-too-long",
        data: { sourceId: sel.sourceId, selectedTextLength: sel.selectedText.length },
      });
      return;
    }

    setQuickTranslationState((prev) => ({
      requestId: prev.requestId + 1,
      data: null,
      status: "ready",
    }));

    Sentry.addBreadcrumb({
      category: "study-translation",
      level: "info",
      message: "study-translation-selection-captured",
      data: { sourceId: sel.sourceId, selectedTextLength: sel.selectedText.length },
    });
  }, []);

  const handleQuickTranslate = useCallback(() => {
    if (
      !selection ||
      quickTranslationState.status === "loading" ||
      !isTranslateTextWithinLimit(selection.selectedText)
    ) {
      return;
    }

    const requestId = ++quickTranslationRequestCounter;
    setQuickTranslationState((prev) => ({ ...prev, requestId, status: "loading" }));

    Sentry.addBreadcrumb({
      category: "study-translation",
      level: "info",
      message: "study-translation-request",
      data: { sourceId: selection.sourceId, selectedTextLength: selection.selectedText.length },
    });

    fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: selection.selectedText,
        context: clampTranslationContext(selection.contextSentence, selection.selectedText),
        sourceId: selection.sourceId,
        sourceLanguage: "en",
        targetLanguage: "vi",
        clientMetrics: selection.clientMetrics,
      }),
    })
      .then(async (r) => {
        const json: unknown = await r.json();
        const parsed = translateResponseSchema.safeParse(json);
        if (!parsed.success) {
          Sentry.addBreadcrumb({
            category: "study-translation",
            level: "error",
            message: "study-translation-schema-error",
            data: { route: "/api/translate" },
          });
          throw new Error("Quick translation failed");
        }
        if (!r.ok || "error" in parsed.data) throw new Error("Quick translation failed");
        return parsed.data.data;
      })
      .then((data) => {
        setQuickTranslationState((prev) => {
          if (prev.requestId !== requestId) return prev;
          Sentry.addBreadcrumb({
            category: "study-translation",
            level: "info",
            message: "study-translation-success",
            data: { provider: data.provider },
          });
          return { requestId, data, status: "success" };
        });
      })
      .catch(() => {
        setQuickTranslationState((prev) => {
          if (prev.requestId !== requestId) return prev;
          Sentry.addBreadcrumb({
            category: "study-translation",
            level: "error",
            message: "study-translation-error",
          });
          return { requestId, data: null, status: "error" };
        });
      });
  }, [selection, quickTranslationState.status]);

  const handleSaveVocabulary = useCallback(async () => {
    const quickTranslation = quickTranslationState.data;
    if (!selection || !quickTranslation) return;

    Sentry.addBreadcrumb({
      category: "study-vocabulary",
      level: "info",
      message: "study-vocabulary-save-click",
      data: { sourceId: selection.sourceId, selectedTextLength: selection.selectedText.length },
    });

    try {
      const vocabularyPayload: {
        sourceId: string;
        selectedText: string;
        translation: string;
        contextSentence: string;
        sourceLanguage: "en";
        targetLanguage: "vi";
        type?: string;
      } = {
        sourceId: selection.sourceId,
        selectedText: selection.selectedText,
        translation: quickTranslation.translation,
        contextSentence: selection.contextSentence,
        sourceLanguage: "en",
        targetLanguage: "vi",
      };
      if (quickTranslation.type) {
        vocabularyPayload.type = quickTranslation.type;
      }

      const res = await fetch("/api/vocabulary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vocabularyPayload),
      });
      const json: unknown = await res.json();
      const parsed = vocabularyResponseSchema.safeParse(json);
      if (!parsed.success) {
        Sentry.addBreadcrumb({
          category: "study-vocabulary",
          level: "error",
          message: "study-vocabulary-schema-error",
          data: { route: "/api/vocabulary" },
        });
        throw new Error("Vocabulary save failed");
      }
      if (!res.ok || "error" in parsed.data) throw new Error("Vocabulary save failed");
      setSavedVocabularyIds((prev) =>
        new Set(prev).add(buildTranslationSelectionKey(selection)),
      );
      Sentry.addBreadcrumb({
        category: "study-vocabulary",
        level: "info",
        message: "study-vocabulary-save-success",
        data: { vocabularyItemId: parsed.data.data.id },
      });
    } catch {
      Sentry.addBreadcrumb({
        category: "study-vocabulary",
        level: "error",
        message: "study-vocabulary-save-error",
      });
    }
  }, [selection, quickTranslationState.data]);

  const vocabularySaveKey = selection ? buildTranslationSelectionKey(selection) : null;
  const isVocabularySaved = vocabularySaveKey
    ? savedVocabularyIds.has(vocabularySaveKey)
    : false;

  // Fetch passage results from API when switching passages
  useEffect(() => {
    if (!state.activePassageId) return;
    const passageId = state.activePassageId;
    const cached = state.artifactsByPassageId[passageId];
    if (cached?.status === "success" && cached.fetchedAt && Date.now() - cached.fetchedAt < ARTIFACT_STALE_TIME) return;

    const controller = new AbortController();
    setState((prev) => ({
      ...prev,
      artifactsByPassageId: {
        ...prev.artifactsByPassageId,
        [passageId]: { status: "loading", data: cached?.data ?? [] },
      },
    }));

    fetch(`${STUDY_API_ROUTES.artifacts}?passageId=${passageId}`, { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) {
          throw new Error(`Failed to fetch study artifacts (${r.status})`);
        }
        return (await r.json()) as { data?: { artifacts?: StudioArtifact[] } };
      })
      .then((json) => {
        setState((prev) => {
          if (prev.activePassageId !== passageId) return prev;
          return {
            ...prev,
            artifactsByPassageId: {
              ...prev.artifactsByPassageId,
              [passageId]: { status: "success", data: json.data?.artifacts ?? [], fetchedAt: Date.now() },
            },
          };
        });
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        Sentry.captureException(err, {
          tags: { feature: "study", action: "fetch-artifacts" },
          extra: { passageId },
        });
        setState((prev) => {
          if (prev.activePassageId !== passageId) return prev;
          return {
            ...prev,
            artifactsByPassageId: {
              ...prev.artifactsByPassageId,
              [passageId]: { status: "error", data: cached?.data ?? [], error: err instanceof Error ? err.message : "Failed to fetch artifacts" },
            },
          };
        });
      });

    return () => controller.abort();
  }, [state.activePassageId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {/* Three-panel workspace */}
      <div className="flex-1 min-h-0 overflow-hidden bg-muted px-2 pb-2 pt-2">
        <Group
          id="study-panels"
          orientation="horizontal"
          defaultLayout={layout.defaultLayout}
          onLayoutChanged={layout.onLayoutChanged}
          className="flex flex-1 h-full"
        >
          <Panel
            panelRef={layout.leftPanelRef}
            id="source"
            collapsible={true}
            collapsedSize="60px"
            defaultSize="280px"
            minSize="200px"
            maxSize="800px"
            onResize={layout.handleLeftResize}
          >
            <StudySourcesPanel
              documents={documents}
              activeId={state.activePassageId}
              onSelect={handleSelectDocument}
              onOpenUploadModal={handleOpenUploadModal}
              isUploading={isUploading}
              uploadingFileName={uploadingFileName}
              onDelete={handleDeletePassage}
              collapsed={layout.leftPanelCollapsed}
              onToggleCollapse={layout.toggleLeft}
            />
          </Panel>

          <Separator className="w-4" />
          <Panel id="content" minSize={360}>
            <div className="h-full bg-surface flex flex-col overflow-hidden rounded-xl border border-border">
              <StudyContentPanel
                passage={activePassage}
                error={state.error}
                simplifying={state.simplifying}
                onSimplify={handleSimplify}
                viewMode={contentViewMode}
                onViewModeChange={setContentViewMode}
                onSelectionChange={handleSelectionChange}
                onOpenUploadModal={handleOpenUploadModal}
              />
              {selection && activePassage && (
                <StudyTranslationPopup
                  selection={selection}
                  translation={quickTranslationState.data}
                  status={quickTranslationState.status}
                  onTranslate={handleQuickTranslate}
                  onOpenDetails={() => {
                    setViewingLookup(true);
                    Sentry.addBreadcrumb({
                      category: "study-translation",
                      level: "info",
                      message: "study-translation-details-opened",
                      data: { sourceId: selection.sourceId },
                    });
                  }}
                  onDismiss={() => setSelection(null)}
                />
              )}
            </div>
          </Panel>

          <Separator className="w-4" />

          <Panel
            panelRef={layout.rightPanelRef}
            id="studio"
            collapsible={true}
            collapsedSize="60px"
            defaultSize="280px"
            minSize="200px"
            onResize={layout.handleRightResize}
          >
            <StudyStudioPanel
              artifactsCache={state.artifactsByPassageId[state.activePassageId ?? ""] ?? { status: "idle", data: [] }}
              activePassage={activePassage}
              hasActivePassage={!!state.activePassageId}
              viewingArtifactRef={state.activePassageId ? state.viewingArtifactByPassageId[state.activePassageId] ?? null : null}
              onSetViewingArtifact={(ref) => {
                if (!state.activePassageId) return;
                // Routes through the hook so opening a persisted artifact lazy-loads
                // its detail (e.g. quiz questions) when it isn't already in memory —
                // without this, a card opened after a page reload has no questions.
                void handleViewArtifact(ref, state.activePassageId);
              }}
              artifactDetailById={state.artifactDetailById}
              onActionClick={handleActionClick}
              collapsed={layout.rightPanelCollapsed}
              onToggleCollapse={layout.toggleRight}
              translationSelection={selection}
              quickTranslation={quickTranslationState.data}
              viewingLookup={viewingLookup}
              onSetViewingLookup={setViewingLookup}
              onSaveVocabulary={handleSaveVocabulary}
              vocabularySaved={isVocabularySaved}
              onRecordQuizResult={(artifactId, stats) => {
                if (state.activePassageId) handleRecordQuizResult(state.activePassageId, artifactId, stats);
              }}
              onResetQuizResult={(artifactId) => {
                if (state.activePassageId) handleResetQuizResult(state.activePassageId, artifactId);
              }}
              onRetryArtifact={retryQuizArtifact}
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

function buildTranslationSelectionKey(selection: TranslationSelection) {
  return JSON.stringify({
    sourceId: selection.sourceId,
    selectedText: selection.selectedText,
    contextSentence: selection.contextSentence,
    targetLanguage: selection.targetLanguage,
  });
}
