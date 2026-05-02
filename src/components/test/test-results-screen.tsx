"use client";

import { Trophy } from "lucide-react";

interface TestResultsScreenProps {
  correctCount: number;
  totalQuestions: number;
  onReviewReading: () => void;
  onNewPassage: () => void;
}

export function TestResultsScreen({
  correctCount,
  totalQuestions,
  onReviewReading,
  onNewPassage,
}: TestResultsScreenProps) {
  const accuracy = Math.round((correctCount / totalQuestions) * 100);

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Trophy className="w-10 h-10 text-primary-600" />
        </div>

        <h2 className="text-2xl font-bold text-neutral-900 mb-2">
          Reading Complete!
        </h2>
        <p className="text-neutral-500 mb-8">
          You&apos;ve answered all questions for this passage.
        </p>

        <div className="flex justify-center gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="text-3xl font-bold text-green-600">
              {correctCount}
            </div>
            <div className="text-sm text-neutral-500">Correct</div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="text-3xl font-bold text-red-500">
              {totalQuestions - correctCount}
            </div>
            <div className="text-sm text-neutral-500">To Review</div>
          </div>
        </div>

        <p className="text-lg text-neutral-700 mb-8">
          {accuracy >= 80
            ? "Excellent!"
            : accuracy >= 60
              ? "Good job!"
              : "Keep practicing!"}{" "}
          {accuracy}% accuracy
        </p>

        <div className="flex gap-4">
          <button
            onClick={onReviewReading}
            className="flex-1 px-6 py-3 bg-white border border-neutral-200 rounded-lg font-medium hover:bg-neutral-50"
          >
            Review Reading
          </button>
          <button
            onClick={onNewPassage}
            className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
          >
            New Passage
          </button>
        </div>
      </div>
    </div>
  );
}
