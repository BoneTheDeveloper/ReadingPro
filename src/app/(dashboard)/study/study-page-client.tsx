'use client';

import { useState, useCallback, useMemo } from 'react';
import { Group, Panel, Separator, useDefaultLayout } from 'react-resizable-panels';
import { studySimplifyAction } from '@/app/actions/study-simplify-action';
import type { SimplifyResult } from '@/app/actions/study-simplify-action';
import { studyGenerateQuestionsAction } from '@/app/actions/study-generate-questions-action';
import type { StudyState, PassageData, QuestionData, DocumentItem } from './study-types';
import { StudySourcesPanel } from './study-left-panel';
import { StudyContentPanel } from './study-content-panel';
import { StudyStudioPanel } from './study-right-panel';
import { StudyUploadModal } from './study-upload-modal';

const initialState: StudyState = {
  passages: [],
  activePassageId: null,
  questions: [],
  status: 'idle',
  error: null,
  simplifying: false,
  generatingQuestions: false,
  uploadModalOpen: false,
};

export function StudyPageClient() {
  const [state, setState] = useState<StudyState>(initialState);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingFileName, setUploadingFileName] = useState<string>("");
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: "study-panels",
    storage: typeof window !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {} },
  });

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
          date: new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
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
      status: 'ready',
      questions: [],
      error: null,
    }));
    setIsUploading(false);
    setUploadingFileName("");
  }, []);

  const handleSimplify = useCallback(async () => {
    const passageId = state.activePassageId;
    if (!passageId) return;
    setState((prev) => ({ ...prev, simplifying: true, error: null }));
    try {
      const result = await studySimplifyAction({ passageId });
      if ('error' in result) {
        setState((prev) => ({ ...prev, simplifying: false, error: result.error }));
        return;
      }
      if ('skipped' in result) return;
      setState((prev) => ({
        ...prev,
        simplifying: false,
        passages: prev.passages.map((p) =>
          p.id === prev.activePassageId
            ? { ...p, simplifiedContent: result.simplifiedContent, simplifiedLevel: result.simplifiedLevel }
            : p,
        ),
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        simplifying: false,
        error: err instanceof Error ? err.message : 'Simplification failed',
      }));
    }
  }, [state.activePassageId]);

  const handleGenerateQuestions = useCallback(async () => {
    const passageId = state.activePassageId;
    if (!passageId) return;
    if (state.questions.length > 0) {
      const confirmed = window.confirm('Regenerating will replace existing questions and reset quiz progress. Continue?');
      if (!confirmed) return;
    }
    setState((prev) => ({ ...prev, generatingQuestions: true, error: null }));
    try {
      const result = await studyGenerateQuestionsAction({ passageId });
      if ('error' in result) {
        setState((prev) => ({ ...prev, generatingQuestions: false, error: result.error }));
        return;
      }
      setState((prev) => ({ ...prev, generatingQuestions: false, questions: result.questions }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        generatingQuestions: false,
        error: err instanceof Error ? err.message : 'Question generation failed',
      }));
    }
  }, [state.activePassageId, state.questions.length]);

  const handleSelectDocument = useCallback((id: string) => {
    setState((prev) => ({ ...prev, activePassageId: id, questions: [], status: 'ready' }));
  }, []);

  const handleReset = useCallback(() => {
    setState(initialState);
  }, []);

  const handleOpenUploadModal = useCallback(() => {
    setState((prev) => ({ ...prev, uploadModalOpen: true }));
  }, []);

  const handleCloseUploadModal = useCallback(() => {
    setState((prev) => ({ ...prev, uploadModalOpen: false }));
  }, []);

  return (
    <>
      {/* Sticky reading progress bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-surface-container z-50">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: '0%' }} />
      </div>

      {/* Three-panel workspace */}
      <div className="pt-16 flex flex-1 h-[calc(100dvh-4rem)] overflow-hidden" style={{ background: '#f5f5f5', padding: '4rem 8px 8px 8px' }}>
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
            />
          </Panel>

          <Separator className="w-[16px] cursor-col-resize" />

          <Panel id="content" minSize={220}>
            <div className="h-full bg-white flex flex-col overflow-hidden rounded-xl border border-[#e5e7eb]">
              <div className="p-4 border-b" style={{ borderColor: '#e5e7eb' }}>
                <h2 className="text-[12px] font-semibold text-on-surface-variant uppercase tracking-[0.05em]">
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

          <Separator className="w-[16px] cursor-col-resize" />

          <Panel id="studio" defaultSize="26%" minSize={220} maxSize="70%">
            <StudyStudioPanel
              questions={state.activePassageId ? state.questions : []}
              passageTitle={activePassage?.title ?? ''}
              hasActivePassage={!!state.activePassageId}
              generatingQuestions={state.generatingQuestions}
              onGenerateQuestions={handleGenerateQuestions}
              onReset={handleReset}
              onSimplify={handleSimplify}
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
      />
    </>
  );
}
