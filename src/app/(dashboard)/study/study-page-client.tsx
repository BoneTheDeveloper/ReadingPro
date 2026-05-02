'use client';

import { useState, useCallback } from 'react';
import { studyAnalyzeAction } from '@/app/actions/analyze';
import type { StudyState, PassageData, QuestionData } from './study-types';
import { StudyLeftPanel } from './study-left-panel';
import { StudyRightPanel } from './study-right-panel';
import { Plus } from 'lucide-react';

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
    <>
      {/* Sticky reading progress bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-surface-container z-50">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: '0%' }} />
      </div>

      {/* Page content */}
      <div className="pt-16 px-12 pb-12 max-w-[1440px] mx-auto">
        {/* Page header */}
        <header className="mb-6">
          <h2 className="text-[32px] font-bold text-primary tracking-[-0.02em] leading-[1.2]">
            Study Room
          </h2>
          <p className="text-[16px] text-on-surface-variant mt-2 leading-[1.6]">
            Improve your English reading comprehension through AI-powered analysis.
          </p>
        </header>

        {/* Bento grid: 7/5 split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left: Content panel (7 cols) */}
          <section className="lg:col-span-7 flex flex-col">
            <StudyLeftPanel
              status={state.status}
              passage={state.passage}
              error={state.error}
              onAnalyze={handleAnalyze}
            />
          </section>

          {/* Right: Test panel (5 cols) */}
          <section className="lg:col-span-5 flex flex-col">
            <StudyRightPanel
              key={state.passage?.id ?? 'empty'}
              status={state.status}
              questions={state.questions}
              passageTitle={state.passage?.title ?? ''}
              onReset={handleReset}
            />
          </section>
        </div>

        {/* Vocabulary chips section */}
        <section className="mt-12">
          <h3 className="text-[20px] font-semibold text-on-surface mb-6 tracking-[-0.01em]">
            Features
          </h3>
          <div className="flex flex-wrap gap-4">
            <span className="px-4 py-2 bg-surface-container-high text-primary text-[14px] font-semibold rounded-full flex items-center gap-2">
              Vocabulary Chips
            </span>
            <span className="px-4 py-2 bg-surface-container-high text-primary text-[14px] font-semibold rounded-full flex items-center gap-2">
              Reading Speed Track
            </span>
            <span className="px-4 py-2 bg-surface-container-high text-primary text-[14px] font-semibold rounded-full flex items-center gap-2">
              Contextual AI Analysis
            </span>
          </div>
        </section>
      </div>

      {/* FAB */}
      <button className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-on-primary rounded-full shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all group z-50">
        <Plus className="w-6 h-6" />
        <div className="absolute right-full mr-4 bg-on-surface text-surface px-3 py-1 rounded-lg text-[12px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          Quick Study
        </div>
      </button>
    </>
  );
}
