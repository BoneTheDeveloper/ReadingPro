"use client";

import { ChevronLeft } from "lucide-react";

interface TestHeaderProps {
  currentIndex: number;
  totalQuestions: number;
  progress: number;
  streak: number;
  onBack: () => void;
}

export function TestHeader({
  currentIndex,
  totalQuestions,
  progress,
  streak,
  onBack,
}: TestHeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-neutral-200">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-neutral-100 rounded-lg"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="w-48 bg-neutral-100 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-sm text-neutral-500">
            {currentIndex + 1} of {totalQuestions}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg">🔥</span>
          <span className="font-semibold">{streak}</span>
        </div>
      </div>
    </header>
  );
}
