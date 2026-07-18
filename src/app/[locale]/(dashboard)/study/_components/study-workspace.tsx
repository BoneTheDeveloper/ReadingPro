"use client";

import { useCallback, useState } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import type { TranslationDto, TranslationSelection } from "@/features/reading/schemas/translation";
import { saveVocabularyAction } from "@/features/vocabulary/server/actions/vocabulary"
import {
  clampTranslationContext,
  isTranslateTextWithinLimit,
} from "@/features/reading/lib/translation-limits";
import type { PassageData } from "@/types/passage";
import { SourcesPanel } from "@/features/upload/components/panel/sources-panel";
import { ContentPanel } from "@/features/reading/components/content-panel";
import { StudioPanel } from "@/features/studio-panel/components/studio-panel";
import { TranslationPopup } from "@/features/reading/components/translation-popup";
import { UploadModal } from "@/features/upload/components/model/upload-modal";
import { useStudioPanel } from "@/features/studio-panel/hooks/use-studio-panel";
import { useStudyPanelLayout } from "../_hooks/use-study-panel-layout";
import { useStudyWorkspaceState } from "../_hooks/use-study-workspace-state";
import { useStudioArtifacts } from "@/features/studio-panel/hooks/use-studio-artifacts";

let quickTranslationRequestCounter = 0;

type QuickTranslationStatus =
  "idle" | "ready" | "loading" | "success" | "error";

interface QuickTranslationState {
  requestId: number;
  data: TranslationDto | null;
  status: QuickTranslationStatus;
}

export function StudyWorkspace({
  initialPassages,
}: {
  initialPassages: PassageData[];
}) {
  const {
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
  } = useStudyWorkspaceState(initialPassages);
  const {
    handleActionClick,
    handleViewArtifact,
    handleRecordQuizResult,
    handleResetQuizResult,
    retryQuizArtifact,
  } = useStudioPanel({ state, setState, passages });
  const layout = useStudyPanelLayout();
  // Presence heartbeat is mounted app-wide in DashboardSidebar; the study page is
  // wrapped by it, so no per-page heartbeat is needed here.

  // Translation state (lifted from ContentPanel)
  const [contentViewMode, setContentViewMode] = useState<
    "passage" | "pdf" | "video"
  >("passage");
  const [selection, setSelection] = useState<TranslationSelection | null>(null);
  const [quickTranslationState, setQuickTranslationState] =
    useState<QuickTranslationState>({
      requestId: 0,
      data: null,
      status: "idle",
    });
  const [savedVocabularyIds, setSavedVocabularyIds] = useState<Set<string>>(
    new Set(),
  );

  // Clear stale selection on passage/mode change (adjust during rendering, not in effect)
  const [prevPassageId, setPrevPassageId] = useState(state.activePassageId);
  const [prevViewMode, setPrevViewMode] = useState(contentViewMode);
  if (
    state.activePassageId !== prevPassageId ||
    contentViewMode !== prevViewMode
  ) {
    setPrevPassageId(state.activePassageId);
    setPrevViewMode(contentViewMode);
    setSelection(null);
    setQuickTranslationState((prev) => ({
      requestId: prev.requestId + 1,
      data: null,
      status: "idle",
    }));
  }

  const handleSelectionChange = useCallback(
    (sel: TranslationSelection | null) => {
      if (!sel) {
        setSelection(null);
        setQuickTranslationState((prev) => ({
          requestId: prev.requestId + 1,
          data: null,
          status: "idle",
        }));
        return;
      }

      const wordCount = sel.selectedText.trim().split(/\s+/).length;
      if (wordCount > 1) return;

      setSelection(sel);

      if (!isTranslateTextWithinLimit(sel.selectedText)) {
        setSelection(null);
        setQuickTranslationState((prev) => ({
          requestId: prev.requestId + 1,
          data: null,
          status: "idle",
        }));
        return;
      }

      setQuickTranslationState((prev) => ({
        requestId: prev.requestId + 1,
        data: null,
        status: "ready",
      }));
    },
    [],
  );

  const handleQuickTranslate = useCallback(() => {
    if (
      !selection ||
      quickTranslationState.status === "loading" ||
      !isTranslateTextWithinLimit(selection.selectedText)
    ) {
      return;
    }

    const requestId = ++quickTranslationRequestCounter;
    setQuickTranslationState((prev) => ({
      ...prev,
      requestId,
      status: "loading",
    }));

    fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: selection.selectedText,
        context: clampTranslationContext(
          selection.contextSentence,
          selection.selectedText,
        ),
        sourceId: selection.sourceId,
        sourceLanguage: "en",
        targetLanguage: "vi",
        clientMetrics: selection.clientMetrics,
      }),
    })
      .then(async (r) => {
        const json: unknown = await r.json();
        if (!r.ok || !json || typeof json !== "object") {
          throw new Error("Quick translation failed");
        }
        const data = json as { translation?: string; provider?: string };
        if (!data.translation) {
          throw new Error("Quick translation failed");
        }
        return data as TranslationDto;
      })
      .then((data) => {
        setQuickTranslationState((prev) => {
          if (prev.requestId !== requestId) return prev;
          return { requestId, data, status: "success" };
        });
      })
      .catch(() => {
        setQuickTranslationState((prev) => {
          if (prev.requestId !== requestId) return prev;
          return { requestId, data: null, status: "error" };
        });
      });
  }, [selection, quickTranslationState.status]);

  const handleSaveVocabulary = useCallback(async () => {
    const quickTranslation = quickTranslationState.data;
    if (!selection || !quickTranslation) return;

    try {
      await saveVocabularyAction({
        source: "TRANSLATE",
        sourceId: selection.sourceId,
        selectedText: selection.selectedText,
        translation: quickTranslation.translation,
        contextSentence: selection.contextSentence,
        sourceLanguage: "en",
        targetLanguage: "vi",
      });
      setSavedVocabularyIds((prev) =>
        new Set(prev).add(buildTranslationSelectionKey(selection)),
      );
    } catch {
      // Swallow: save failure surfaces via unsaved state, no error UI needed here.
    }
  }, [selection, quickTranslationState.data]);

  const vocabularySaveKey = selection
    ? buildTranslationSelectionKey(selection)
    : null;
  const isVocabularySaved = vocabularySaveKey
    ? savedVocabularyIds.has(vocabularySaveKey)
    : false;

  // Fetch artifacts when switching passages
  useStudioArtifacts({
    activePassageId: state.activePassageId,
    artifactsByPassageId: state.artifactsByPassageId,
    setState,
  });

  return (
    <>
      {/* Three-panel workspace */}
      <div className="flex-1 min-h-0 overflow-hidden">
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
            <SourcesPanel
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

          <Separator className="w-0.25" />
          <Panel id="content" minSize={550}>
            <div className="h-full bg-surface flex flex-col overflow-hidden">
              <ContentPanel
                key={activePassage?.id ?? "empty"}
                passage={activePassage}
                error={state.error}
                viewMode={contentViewMode}
                onViewModeChange={setContentViewMode}
                onSelectionChange={handleSelectionChange}
                onOpenUploadModal={handleOpenUploadModal}
              />
              {selection && activePassage && (
                <TranslationPopup
                  selection={selection}
                  translation={quickTranslationState.data}
                  status={quickTranslationState.status}
                  onTranslate={handleQuickTranslate}
                  onSave={handleSaveVocabulary}
                  saved={isVocabularySaved}
                  onDismiss={() => setSelection(null)}
                />
              )}
            </div>
          </Panel>

          <Separator className="w-0.25" />

          <Panel
            panelRef={layout.rightPanelRef}
            id="studio"
            collapsible={true}
            collapsedSize="60px"
            defaultSize="280px"
            minSize="200px"
            onResize={layout.handleRightResize}
          >
            <StudioPanel
              artifactsCache={
                state.artifactsByPassageId[state.activePassageId ?? ""] ?? {
                  status: "idle",
                  data: [],
                }
              }
              activePassage={activePassage}
              hasActivePassage={!!state.activePassageId}
              viewingArtifactRef={
                state.activePassageId
                  ? (state.viewingArtifactByPassageId[state.activePassageId] ??
                    null)
                  : null
              }
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
              onRecordQuizResult={(artifactId, stats) => {
                if (state.activePassageId)
                  handleRecordQuizResult(
                    state.activePassageId,
                    artifactId,
                    stats,
                  );
              }}
              onResetQuizResult={(artifactId) => {
                if (state.activePassageId)
                  handleResetQuizResult(state.activePassageId, artifactId);
              }}
              onRetryArtifact={retryQuizArtifact}
            />
          </Panel>
        </Group>
      </div>

      {/* Upload modal */}
      <UploadModal
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
