"use client";

import { useCallback, useState } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { useTranslations } from "next-intl";
import * as Sentry from "@sentry/nextjs";
import type { PassageData, TranslationSelection, QuickTranslationData } from "./study-types";
import { StudySourcesPanel } from "./study-left-panel";
import { StudyContentPanel } from "./study-content-panel";
import { StudyStudioPanel } from "./study-right-panel";
import { StudyTranslationPopup } from "./study-translation-popup";
import { StudyUploadModal } from "./study-upload-modal";
import { useStudyActions } from "./use-study-actions";
import { useStudyPanelLayout } from "./use-study-panel-layout";
import { useStudyWorkspaceState } from "./use-study-workspace-state";

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
  const [quickTranslation, setQuickTranslation] = useState<QuickTranslationData | null>(null);
  const [translationLoading, setTranslationLoading] = useState(false);
  const [savedVocabularyIds, setSavedVocabularyIds] = useState<Set<string>>(new Set());
  const [viewingTranslate, setViewingTranslate] = useState(false);

  // Clear stale selection on passage/mode change (adjust during rendering, not in effect)
  const [prevPassageId, setPrevPassageId] = useState(state.activePassageId);
  const [prevViewMode, setPrevViewMode] = useState(contentViewMode);
  if (state.activePassageId !== prevPassageId || contentViewMode !== prevViewMode) {
    setPrevPassageId(state.activePassageId);
    setPrevViewMode(contentViewMode);
    setSelection(null);
    setQuickTranslation(null);
  }

  const handleSelectionChange = useCallback((sel: TranslationSelection | null) => {
    setSelection(sel);
    setQuickTranslation(null);

    if (!sel) return;

    Sentry.addBreadcrumb({
      category: "study-translation",
      level: "info",
      message: "study-translation-selection-captured",
      data: { sourceId: sel.sourceId, selectedTextLength: sel.selectedText.length },
    });

    setTranslationLoading(true);
    Sentry.addBreadcrumb({
      category: "study-translation",
      level: "info",
      message: "study-translation-quick-request",
      data: { sourceId: sel.sourceId, selectedTextLength: sel.selectedText.length },
    });

    fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: sel.selectedText,
        context: sel.contextSentence,
        sourceId: sel.sourceId,
        sourceLanguage: "en",
        targetLanguage: "vi",
        mode: "quick",
      }),
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setQuickTranslation(json.data);
          Sentry.addBreadcrumb({
            category: "study-translation",
            level: "info",
            message: "study-translation-quick-success",
            data: { provider: json.data.provider },
          });
        }
      })
      .catch(() => {
        Sentry.addBreadcrumb({
          category: "study-translation",
          level: "error",
          message: "study-translation-quick-error",
        });
      })
      .finally(() => setTranslationLoading(false));
  }, []);

  const handleSaveVocabulary = useCallback(async () => {
    if (!selection || !quickTranslation) return;

    Sentry.addBreadcrumb({
      category: "study-vocabulary",
      level: "info",
      message: "study-vocabulary-save-click",
      data: { sourceId: selection.sourceId, selectedTextLength: selection.selectedText.length },
    });

    try {
      const res = await fetch("/api/vocabulary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceId: selection.sourceId,
          selectedText: selection.selectedText,
          translation: quickTranslation.translation,
          contextSentence: selection.contextSentence,
          sourceLanguage: "en",
          targetLanguage: "vi",
          type: quickTranslation.type,
        }),
      });
      const json = await res.json();
      if (json.success && json.data?.id) {
        setSavedVocabularyIds((prev) => new Set(prev).add(json.data.id));
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
  }, [selection, quickTranslation]);

  const vocabularySaveKey = selection
    ? `${selection.sourceId}:${selection.selectedText}`
    : null;
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
                  translation={quickTranslation}
                  loading={translationLoading}
                  error={null}
                  saved={isVocabularySaved}
                  onOpenDetails={() => {
                    setViewingTranslate(true);
                    Sentry.addBreadcrumb({
                      category: "study-translation",
                      level: "info",
                      message: "study-translation-details-opened",
                      data: { sourceId: selection.sourceId },
                    });
                  }}
                  onSave={handleSaveVocabulary}
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
              quickTranslation={quickTranslation}
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
