'use client';

import { useState, useCallback, useEffect } from 'react';
import { BookOpen, CheckCircle, XCircle, ArrowRight, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StudyStatus, QuestionData } from './study-types';

interface StudyRightPanelProps {
  status: StudyStatus;
  questions: QuestionData[];
  passageContent: string;
  passageTitle: string;
  onReset: () => void;
}

export function StudyRightPanel({ status, questions, passageContent, passageTitle, onReset }: StudyRightPanelProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [isComplete, setIsComplete] = useState(false);
  const [streak, setStreak] = useState(0);

  const resetTest = useCallback(() => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowFeedback(false);
    setAnswers({});
    setIsComplete(false);
    setStreak(0);
  }, []);

  // Reset test when new questions arrive
  useEffect(() => {
    if (questions.length > 0) resetTest();
  }, [questions.length, resetTest]);

  const currentQuestion = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  const handleSelectAnswer = useCallback((optionId: string) => {
    if (!showFeedback) setSelectedAnswer(optionId);
  }, [showFeedback]);

  const handleCheckAnswer = useCallback(() => {
    if (!selectedAnswer || !currentQuestion) return;
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: isCorrect }));
    setShowFeedback(true);
    setStreak(s => isCorrect ? s + 1 : 0);
  }, [selectedAnswer, currentQuestion]);

  const handleNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
    } else {
      setIsComplete(true);
    }
  }, [currentIndex, questions.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (status !== 'ready' || !currentQuestion) return;
      if (e.key >= '1' && e.key <= '4' && !showFeedback) {
        const idx = parseInt(e.key) - 1;
        if (currentQuestion.options[idx]) handleSelectAnswer(currentQuestion.options[idx].id);
      } else if (e.key === 'Enter') {
        if (showFeedback) handleNext();
        else if (selectedAnswer) handleCheckAnswer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, currentQuestion, showFeedback, selectedAnswer, handleSelectAnswer, handleCheckAnswer, handleNext]);

  // Empty state
  if (status !== 'ready' || questions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px]">
        <div className="text-center">
          <BookOpen className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-400 text-lg font-medium">No test yet</p>
          <p className="text-neutral-300 text-sm mt-1">Upload content to start testing</p>
        </div>
      </div>
    );
  }

  // Complete state
  if (isComplete) {
    const correctCount = Object.values(answers).filter(Boolean).length;
    const accuracy = Math.round((correctCount / questions.length) * 100);

    return (
      <div className="flex items-center justify-center h-full min-h-[300px] p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-8 h-8 text-primary-600" />
          </div>
          <h2 className="text-xl font-bold text-neutral-900 mb-1">Test Complete!</h2>
          <p className="text-neutral-500 text-sm mb-6">{passageTitle}</p>

          <div className="flex justify-center gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-2xl font-bold text-green-600">{correctCount}</div>
              <div className="text-xs text-neutral-500">Correct</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-2xl font-bold text-red-500">{questions.length - correctCount}</div>
              <div className="text-xs text-neutral-500">Wrong</div>
            </div>
          </div>

          <p className="text-neutral-700 mb-6">
            {accuracy >= 80 ? 'Excellent!' : accuracy >= 60 ? 'Good job!' : 'Keep practicing!'} {accuracy}%
          </p>

          <div className="flex gap-3">
            <button
              onClick={resetTest}
              className="flex-1 px-4 py-2.5 bg-white border border-neutral-200 rounded-lg text-sm font-medium hover:bg-neutral-50"
            >
              Try Again
            </button>
            <button
              onClick={onReset}
              className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
            >
              New Passage
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Test state
  return (
    <div className="p-6">
      {/* Progress header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-32 bg-neutral-100 rounded-full h-1.5">
            <div className="bg-primary-600 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-xs text-neutral-500">{currentIndex + 1} of {questions.length}</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <span>🔥</span>
          <span className="font-semibold">{streak}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 p-5">
        {/* Question header */}
        <div className="flex items-center gap-2 mb-3">
          <span className="flex items-center justify-center w-6 h-6 bg-primary-100 text-primary-700 rounded-full text-xs font-semibold">
            {currentQuestion.number}
          </span>
          <span className="text-xs text-neutral-500 uppercase tracking-wide font-medium">Multiple Choice</span>
        </div>

        <h3 className="text-base font-semibold text-neutral-900 mb-4 leading-relaxed">
          {currentQuestion.questionText}
        </h3>

        {/* Answer options */}
        <div className="space-y-2.5 mb-4">
          {currentQuestion.options.map((option) => {
            const isSelected = selectedAnswer === option.id;
            const isCorrect = option.id === currentQuestion.correctAnswer;

            return (
              <button
                key={option.id}
                onClick={() => handleSelectAnswer(option.id)}
                disabled={showFeedback}
                className={cn(
                  'w-full p-3.5 rounded-xl text-left transition-all border-2 flex items-center gap-3',
                  !showFeedback && 'border-neutral-200 hover:border-primary-300 hover:bg-primary-50',
                  !showFeedback && isSelected && 'border-primary-500 bg-primary-50',
                  showFeedback && isCorrect && 'border-green-500 bg-green-50',
                  showFeedback && isSelected && !isCorrect && 'border-red-500 bg-red-50',
                  showFeedback && !isSelected && !isCorrect && 'border-neutral-200 opacity-50'
                )}
              >
                <span className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 text-xs font-semibold',
                  !showFeedback && !isSelected && 'border-neutral-300',
                  !showFeedback && isSelected && 'border-primary-500 bg-primary-500 text-white',
                  showFeedback && isCorrect && 'border-green-500 bg-green-500 text-white',
                  showFeedback && isSelected && !isCorrect && 'border-red-500 bg-red-500 text-white'
                )}>
                  {option.id}
                </span>
                <span className="flex-1 text-sm text-neutral-700">{option.text}</span>
                {showFeedback && isCorrect && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />}
                {showFeedback && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Submit / Feedback */}
        {!showFeedback ? (
          <button
            onClick={handleCheckAnswer}
            disabled={!selectedAnswer}
            className={cn(
              'w-full py-2.5 rounded-lg text-sm font-medium transition-all',
              selectedAnswer ? 'bg-primary-600 text-white hover:bg-primary-700' : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
            )}
          >
            Check Answer
          </button>
        ) : (
          <div className="space-y-3">
            <div className={cn(
              'p-3 rounded-xl text-sm',
              answers[currentQuestion.id] ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            )}>
              <div className={cn(
                'flex items-center gap-1.5 mb-1 font-semibold',
                answers[currentQuestion.id] ? 'text-green-700' : 'text-red-700'
              )}>
                {answers[currentQuestion.id] ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                <span>{answers[currentQuestion.id] ? 'Correct!' : 'Not quite right'}</span>
              </div>
              <p className="text-neutral-700">{currentQuestion.explanation}</p>
            </div>

            <div className="bg-white border border-neutral-200 rounded-lg p-2.5">
              <p className="text-xs text-neutral-500 mb-0.5 font-medium">
                Source (Line {currentQuestion.sourceLine}):
              </p>
              <p className="text-sm text-neutral-600 italic font-serif">
                &ldquo;{currentQuestion.sourceText}&rdquo;
              </p>
            </div>

            <button
              onClick={handleNext}
              className="w-full py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 flex items-center justify-center gap-1.5"
            >
              {currentIndex < questions.length - 1 ? (
                <>Next Question <ArrowRight className="w-3.5 h-3.5" /></>
              ) : (
                'View Results'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
