"use client";

import { CheckCircle, XCircle, RotateCcw } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import { cn } from "@/client/lib/utils";
import type { QuestionContent } from "@/shared/studio/artifact";

interface QuestionResultsProps {
  questions: QuestionContent["questions"];
  answers: (number | null)[];
  onReset: () => void;
  onClose: () => void;
}

const letter = (i: number) => String.fromCharCode(65 + i);

export function QuestionResults({ questions, answers, onReset, onClose }: QuestionResultsProps) {
  const total = questions.length;
  const correct = questions.filter((q, i) => answers[i] === q.correctIndex).length;
  const percent = total ? Math.round((correct / total) * 100) : 0;

  return (
    <div className="flex flex-col min-h-full">
      <div className="px-5 pt-6 pb-5 border-b border-border">
        <p className="text-xs uppercase tracking-[0.11em] text-muted-foreground font-medium">Kết quả</p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-4xl font-bold text-foreground tabular-nums">{correct}/{total}</span>
          <span className="text-sm text-muted-foreground">câu đúng · {percent}%</span>
        </div>
        <div
          className="mt-3 h-2 rounded-full bg-danger-soft overflow-hidden"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={correct}
          aria-label="Tỉ lệ đúng"
        >
          <div className="h-full bg-success rounded-full transition-[width] duration-300" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <ol className="flex-1 divide-y divide-border">
        {questions.map((q, i) => {
          const a = answers[i];
          const ok = a === q.correctIndex;
          return (
            <li key={i} className="px-5 py-3.5 flex gap-3">
              {ok ? (
                <CheckCircle className="w-4.5 h-4.5 text-success shrink-0 mt-0.5" aria-label="Đúng" />
              ) : (
                <XCircle className="w-4.5 h-4.5 text-danger shrink-0 mt-0.5" aria-label="Sai" />
              )}
              <div className="min-w-0 text-sm">
                <p className="font-medium text-foreground leading-snug">
                  {i + 1}. {q.text}
                </p>
                {!ok && a !== null && a !== undefined && (
                  <p className="mt-1 text-danger line-through decoration-danger/50">
                    {letter(a)}. {q.options[a]}
                  </p>
                )}
                <p className={cn("mt-1", ok ? "text-muted-foreground" : "text-success")}>
                  {letter(q.correctIndex)}. {q.options[q.correctIndex]}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="sticky bottom-0 border-t border-border bg-panel px-5 py-3 flex gap-2">
        <Button variant="outline" onClick={onReset} className="flex-1">
          <RotateCcw className="w-4 h-4" /> Làm lại
        </Button>
        <Button onClick={onClose} className="flex-1">
          Quay lại
        </Button>
      </div>
    </div>
  );
}
