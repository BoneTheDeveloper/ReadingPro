"use client";

import { useCallback, useState } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { useTranslations } from "next-intl";
import * as Sentry from "@sentry/nextjs";
import { clampTranslationContext, isTranslateTextWithinLimit } from "@/lib/translation/translation-limits";
import type { PassageData, TranslationSelection, QuickTranslationData } from "./study-types";
import { StudySourcesPanel } from "./study-left-panel";
import { StudyContentPanel } from "./study-content-panel";
import { StudyStudioPanel } from "./study-right-panel";
import { StudyTranslationPopup } from "./study-translation-popup";
import { StudyUploadModal } from "./study-upload-modal";
import { useStudyActions } from "./use-study-actions";
import { useStudyPanelLayout } from "./use-study-panel-layout";
import { useStudyWorkspaceState } from "./use-study-workspace-state";

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
  const t = useTranslations("Study");
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
  const { results, handleSimplify, handleActionClick } = useStudyActions({ state, setState });
  const layout = useStudyPanelLayout();

  // Translation state (lifted from StudyContentPanel)
  const [contentViewMode, setContentViewMode] = useState<"original" | "simplified">("simplified");
  const [selection, setSelection] = useState<TranslationSelection | null>(null);
  const [quickTranslationState, setQuickTranslationState] = useState<QuickTranslationState>({
    requestId: 0,
    data: null,
    status: "idle",
  });
  const [savedVocabularyIds, setSavedVocabularyIds] = useState<Set<string>>(new Set());
  const [viewingTranslate, setViewingTranslate] = useState(false);

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
      message: "study-translation-quick-request",
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
        mode: "quick",
      }),
    })
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok || !json.success) throw new Error("Quick translation failed");
        return json;
      })
      .then((json) => {
        setQuickTranslationState((prev) => {
          if (prev.requestId !== requestId) return prev;
          Sentry.addBreadcrumb({
            category: "study-translation",
            level: "info",
            message: "study-translation-quick-success",
            data: { provider: json.data.provider },
          });
          return { requestId, data: json.data, status: "success" };
        });
      })
      .catch(() => {
        setQuickTranslationState((prev) => {
          if (prev.requestId !== requestId) return prev;
          Sentry.addBreadcrumb({
            category: "study-translation",
            level: "error",
            message: "study-translation-quick-error",
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
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error("Vocabulary save failed");
      if (json.success && json.data?.id) {
        setSavedVocabularyIds((prev) =>
          new Set(prev).add(buildTranslationSelectionKey(selection)),
        );
        Sentry.addBreadcrumb({
          category: "study-vocabulary",
          level: "info",
          message: "study-vocabulary-save-success",
          data: { vocabularyItemId: json.data.id },
        });
      }
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

  return (
    <>
      {/* Sticky reading progress bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-muted z-50">
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
          defaultLayout={layout.defaultLayout}
          onLayoutChanged={layout.onLayoutChanged}
          className="flex flex-1 h-full"
        >
          <Panel
            panelRef={layout.leftPanelRef}
            id="source"
            collapsible={layout.leftCollapsible}
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
              collapsed={layout.leftPanelCollapsed}
              onToggleCollapse={layout.toggleLeft}
            />
          </Panel>

          <Separator
            disabled={layout.leftPanelCollapsed}
            className={`w-4 ${layout.leftPanelCollapsed ? "cursor-default! pointer-events-auto" : ""}`}
          />
          <Panel id="content" minSize={220}>
            <div className="h-full bg-background flex flex-col overflow-hidden rounded-xl border border-border">
              <div className="p-4 border-b border-border">
                <h2 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("content")}
                </h2>
              </div>
              <StudyContentPanel
                passage={activePassage}
                error={state.error}
                simplifying={state.simplifying}
                onSimplify={handleSimplify}
                viewMode={contentViewMode}
                onViewModeChange={setContentViewMode}
                onSelectionChange={handleSelectionChange}
              />
              {selection && activePassage && (
                <StudyTranslationPopup
                  selection={selection}
                  translation={quickTranslationState.data}
                  status={quickTranslationState.status}
                  onTranslate={handleQuickTranslate}
                  onOpenDetails={() => {
                    setViewingTranslate(true);
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

          <Separator
            disabled={layout.rightPanelCollapsed}
            className={`w-4 ${layout.rightPanelCollapsed ? "cursor-default! pointer-events-auto" : ""}`}
          />

          <Panel
            panelRef={layout.rightPanelRef}
            id="studio"
            collapsible={layout.rightCollapsible}
            collapsedSize="60px"
            defaultSize="280px"
            minSize="200px"
          >
            <StudyStudioPanel
              results={results}
              activePassage={activePassage}
              hasActivePassage={!!state.activePassageId}
              simplifying={state.simplifying}
              onActionClick={handleActionClick}
              collapsed={layout.rightPanelCollapsed}
              onToggleCollapse={layout.toggleRight}
              translationSelection={selection}
              quickTranslation={quickTranslationState.data}
              viewingTranslate={viewingTranslate}
              onSetViewingTranslate={setViewingTranslate}
              onSaveVocabulary={handleSaveVocabulary}
              vocabularySaved={isVocabularySaved}
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
