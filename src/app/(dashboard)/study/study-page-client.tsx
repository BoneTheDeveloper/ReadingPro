'use client';

import { useState, useCallback, useMemo } from 'react';
import { studyAnalyzeAction } from '@/app/actions/analyze';
import type { StudyState, PassageData, QuestionData, DocumentItem } from './study-types';
import { StudySourcesPanel } from './study-left-panel';
import { StudyContentPanel } from './study-content-panel';
import { StudyStudioPanel } from './study-right-panel';

const initialState: StudyState = {
  passages: [],
  activePassageId: null,
  questions: [],
  status: 'idle',
  error: null,
};

export function StudyPageClient() {
  const [state, setState] = useState<StudyState>(initialState);

  const activePassage = useMemo(
    () => state.passages.find((p) => p.id === state.activePassageId) ?? null,
    [state.passages, state.activePassageId],
  );

  const documents: DocumentItem[] = useMemo(
    () =>
      state.passages.map((p) => ({
        id: p.id,
        title: p.title,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        level: p.originalLevel,
        wordCount: p.wordCount,
      })),
    [state.passages],
  );

  const handleAnalyze = useCallback(async (text: string, title: string) => {
    setState((prev) => ({ ...prev, status: 'analyzing', error: null }));
    try {
      const result = await studyAnalyzeAction({ text, title });
      if (result.error) {
        setState((prev) => ({ ...prev, status: 'error', error: result.error }));
        return;
      }
      const passage = result.passage as PassageData;
      const questions = result.questions as QuestionData[];
      setState({
        passages: [...(state.passages ?? []), passage],
        activePassageId: passage.id,
        questions,
        status: 'ready',
        error: null,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: err instanceof Error ? err.message : 'Analysis failed',
      }));
    }
  }, [state.passages]);

  const handleSelectDocument = useCallback((id: string) => {
    setState((prev) => ({ ...prev, activePassageId: id }));
  }, []);

  const handleReset = useCallback(() => {
    setState(initialState);
  }, []);

  return (
    <>
      {/* Sticky reading progress bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-surface-container z-50">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: '0%' }} />
      </div>

      {/* Three-panel workspace */}
      <div className="pt-16 flex flex-1 h-[calc(100dvh-4rem)] overflow-hidden">
        {/* Left panel: Sources */}
        <StudySourcesPanel
          documents={documents}
          activeId={state.activePassageId}
          onSelect={handleSelectDocument}
          onAddNew={() => setState((prev) => ({ ...prev, activePassageId: null }))}
        />

        {/* Center panel: Content */}
        <main className="flex-1 bg-surface-container-lowest flex flex-col min-w-0">
          {/* Content header */}
          <div className="p-4 border-b border-outline-variant/30 bg-surface-container-lowest">
            <h2 className="text-[12px] font-semibold text-on-surface-variant uppercase tracking-[0.05em]">
              Content
            </h2>
          </div>
          <StudyContentPanel
            status={activePassage ? state.status : state.status === 'ready' ? 'idle' : state.status}
            passage={activePassage}
            error={state.error}
            onAnalyze={handleAnalyze}
          />
        </main>

        {/* Right panel: Studio */}
        <StudyStudioPanel
          status={activePassage ? state.status : 'idle'}
          questions={activePassage && state.activePassageId ? state.questions : []}
          passageTitle={activePassage?.title ?? ''}
          onReset={handleReset}
        />
      </div>
    </>
  );
}
