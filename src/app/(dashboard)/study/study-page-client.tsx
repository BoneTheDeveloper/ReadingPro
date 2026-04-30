'use client';

import { useState, useCallback } from 'react';
import { studyAnalyzeAction } from '@/app/actions/analyze';
import type { StudyState, PassageData, QuestionData } from './study-types';
import { StudyLeftPanel } from './study-left-panel';
import { StudyRightPanel } from './study-right-panel';

const initialState: StudyState = {
  passage: null,
  questions: [],
  status: 'idle',
  error: null,
};

export function StudyPageClient() {
  const [state, setState] = useState<StudyState>(initialState);

  const handleAnalyze = useCallback(async (text: string, title: string) => {
    setState(prev => ({ ...prev, status: 'analyzing', error: null }));
    try {
      const result = await studyAnalyzeAction({ text, title });
      if (result.error) {
        setState(prev => ({ ...prev, status: 'error', error: result.error }));
        return;
      }
      setState({
        passage: result.passage as PassageData,
        questions: result.questions as QuestionData[],
        status: 'ready',
        error: null,
      });
    } catch (err) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: err instanceof Error ? err.message : 'Analysis failed',
      }));
    }
  }, []);

  const handleReset = useCallback(() => {
    setState(initialState);
  }, []);

  return (
    <div className="h-screen flex flex-col">
      <header className="flex-shrink-0 bg-white border-b border-neutral-200 px-4 py-3">
        <h1 className="text-lg font-semibold text-neutral-900">Study</h1>
        <p className="text-sm text-neutral-500">Upload content and test your comprehension</p>
      </header>

      <div className="flex-1 min-h-0 lg:grid lg:grid-cols-[45%_1fr] flex flex-col">
        <div className="border-r border-neutral-200 overflow-y-auto">
          <StudyLeftPanel
            status={state.status}
            passage={state.passage}
            error={state.error}
            onAnalyze={handleAnalyze}
          />
        </div>

        <div className="overflow-y-auto">
          <StudyRightPanel
            status={state.status}
            questions={state.questions}
            passageContent={state.passage?.content ?? ''}
            passageTitle={state.passage?.title ?? ''}
            onReset={handleReset}
          />
        </div>
      </div>
    </div>
  );
}
