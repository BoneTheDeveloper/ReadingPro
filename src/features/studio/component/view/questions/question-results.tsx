"use client";

import { Trophy } from "lucide-react";
import { Button } from "@/component/ui/button";
import { Card, CardContent } from "@/component/ui/card";

interface QuestionResultsProps {
  correctCount: number;
  totalQuestions: number;
  passageTitle: string;
  onReset: () => void;
  onNewPassage: () => void;
}

export function QuestionResults({
  correctCount,
  totalQuestions,
  passageTitle,
  onReset,
  onNewPassage,
}: QuestionResultsProps) {
  return (
    <div className="bg-surface rounded-xl shadow-sm border border-border flex items-center justify-center flex-1 min-h-75 relative overflow-hidden">
      <div className="text-center max-w-sm p-6 pt-12 pb-6">
        <div className="w-16 h-16 bg-gold-soft rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Trophy className="w-8 h-8 text-gold" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground mb-1">Hoàn thành bài kiểm tra</h2>
        <p className="text-sm text-muted-foreground mb-8">{passageTitle}</p>

        <div className="flex justify-center gap-4 mb-8">
          <Card>
            <CardContent className="p-5">
              <div className="text-[28px] font-bold text-success">{correctCount}</div>
              <div className="text-xs text-muted-foreground font-medium">Đúng</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="text-[28px] font-bold text-danger">{totalQuestions - correctCount}</div>
              <div className="text-xs text-muted-foreground font-medium">Sai</div>
            </CardContent>
          </Card>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" onClick={onReset} className="flex-1">
            Làm lại
          </Button>
          <Button onClick={onNewPassage} className="flex-1">
            Quay lại
          </Button>
        </div>
      </div>
    </div>
  );
}
