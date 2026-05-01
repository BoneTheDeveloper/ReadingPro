"use client";

import {
  CheckCircle,
  XCircle,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/shared/utils";
import type { TestQuestion } from "./test-types";

interface TestQuestionCardProps {
  question: TestQuestion;
  selectedAnswer: string | null;
  showFeedback: boolean;
  isCorrect: boolean;
  isLastQuestion: boolean;
  onSelectAnswer: (optionId: string) => void;
  onCheckAnswer: () => void;
  onNext: () => void;
}

export function TestQuestionCard({
  question,
  selectedAnswer,
  showFeedback,
  isCorrect,
  isLastQuestion,
  onSelectAnswer,
  onCheckAnswer,
  onNext,
}: TestQuestionCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="flex items-center justify-center w-7 h-7 bg-primary-100 text-primary-700 rounded-full text-sm font-semibold">
          {question.number}
        </span>
        <span className="text-xs text-neutral-500 uppercase tracking-wide font-medium">
          Multiple Choice
        </span>
      </div>

      <h3 className="text-lg font-semibold text-neutral-900 mb-5 leading-relaxed">
        {question.questionText}
      </h3>

      <div className="space-y-3 mb-5">
        {question.options.map((option) => (
          <OptionButton
            key={option.id}
            optionId={option.id}
            optionText={option.text}
            isSelected={selectedAnswer === option.id}
            isCorrectOption={option.id === question.correctAnswer}
            showFeedback={showFeedback}
            onSelect={onSelectAnswer}
          />
        ))}
      </div>

      {!showFeedback ? (
        <button
          onClick={onCheckAnswer}
          disabled={!selectedAnswer}
          className={cn(
            "w-full py-3 rounded-lg font-medium transition-all",
            selectedAnswer
              ? "bg-primary-600 text-white hover:bg-primary-700"
              : "bg-neutral-200 text-neutral-400 cursor-not-allowed",
          )}
        >
          Check Answer
        </button>
      ) : (
        <div className="space-y-4">
          <AnswerFeedback
            isCorrect={isCorrect}
            explanation={question.explanation}
          />
          <SourceReference
            sourceLine={question.sourceLine}
            sourceText={question.sourceText}
          />
          <button
            onClick={onNext}
            className="w-full py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 flex items-center justify-center gap-2"
          >
            {isLastQuestion ? "View Results" : (
              <>
                Next Question
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function OptionButton({
  optionId,
  optionText,
  isSelected,
  isCorrectOption,
  showFeedback,
  onSelect,
}: {
  optionId: string;
  optionText: string;
  isSelected: boolean;
  isCorrectOption: boolean;
  showFeedback: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      onClick={() => onSelect(optionId)}
      disabled={showFeedback}
      className={cn(
        "w-full p-4 rounded-xl text-left transition-all border-2 flex items-center gap-3",
        !showFeedback && "border-neutral-200 hover:border-primary-300 hover:bg-primary-50",
        !showFeedback && isSelected && "border-primary-500 bg-primary-50",
        showFeedback && isCorrectOption && "border-green-500 bg-green-50",
        showFeedback && isSelected && !isCorrectOption && "border-red-500 bg-red-50",
        showFeedback && !isSelected && !isCorrectOption && "border-neutral-200 opacity-50",
      )}
    >
      <span
        className={cn(
          "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 text-xs font-semibold",
          !showFeedback && !isSelected && "border-neutral-300",
          !showFeedback && isSelected && "border-primary-500 bg-primary-500 text-white",
          showFeedback && isCorrectOption && "border-green-500 bg-green-500 text-white",
          showFeedback && isSelected && !isCorrectOption && "border-red-500 bg-red-500 text-white",
        )}
      >
        {optionId}
      </span>
      <span className="flex-1 text-neutral-700">{optionText}</span>
      {showFeedback && isCorrectOption && (
        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
      )}
      {showFeedback && isSelected && !isCorrectOption && (
        <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
      )}
    </button>
  );
}

function AnswerFeedback({
  isCorrect,
  explanation,
}: {
  isCorrect: boolean;
  explanation: string;
}) {
  const Icon = isCorrect ? CheckCircle : XCircle;

  return (
    <div
      className={cn(
        "p-4 rounded-xl",
        isCorrect
          ? "bg-green-50 border border-green-200"
          : "bg-red-50 border border-red-200",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 mb-2 font-semibold",
          isCorrect ? "text-green-700" : "text-red-700",
        )}
      >
        <Icon className="w-4 h-4" />
        <span>{isCorrect ? "Correct!" : "Not quite right"}</span>
      </div>
      <p className="text-sm text-neutral-700">{explanation}</p>
    </div>
  );
}

function SourceReference({
  sourceLine,
  sourceText,
}: {
  sourceLine: number;
  sourceText: string;
}) {
  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-3">
      <p className="text-xs text-neutral-500 mb-1 font-medium">
        From the passage (Line {sourceLine}):
      </p>
      <p className="text-sm text-neutral-600 italic font-serif">
        &ldquo;{sourceText}&rdquo;
      </p>
    </div>
  );
}
