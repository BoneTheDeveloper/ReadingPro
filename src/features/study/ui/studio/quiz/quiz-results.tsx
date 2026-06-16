"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useTranslations } from "next-intl"
import { Trophy, AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { completeQuizAttempt } from "@/features/study/api/quiz-attempt-client"

interface QuizResultsProps {
  correctCount: number
  totalQuestions: number
  passageTitle: string
  attemptId: string | null
  onReset: () => void
  onNewPassage: () => void
}

export function QuizResults({
  correctCount,
  totalQuestions,
  passageTitle,
  attemptId,
  onReset,
  onNewPassage,
}: QuizResultsProps) {
  const t = useTranslations("Study")
  const [attemptError, setAttemptError] = useState<string | null>(null)
  const isCompletingRef = useRef(false)

  const completeAttempt = useCallback(async () => {
    if (!attemptId || isCompletingRef.current) return
    isCompletingRef.current = true;
    
    try {
      const result = await completeQuizAttempt({
        attemptId,
        correctCount,
        incorrectCount: totalQuestions - correctCount,
        totalQuestions,
      })
      if ("error" in result) {
         if (!result.error.toLowerCase().includes("already completed")) {
           setAttemptError(result.error)
         }
      } else {
        setAttemptError(null)
      }
    } catch (err) {
      setAttemptError(err instanceof Error ? err.message : t("attemptSaveFailed"));
    } finally {
      isCompletingRef.current = false;
    }
  }, [attemptId, correctCount, totalQuestions, t])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    completeAttempt();
  }, [completeAttempt])

  const accuracy = Math.round((correctCount / totalQuestions) * 100)
  const message =
    accuracy >= 80
      ? t("excellent")
      : accuracy >= 60
        ? t("goodJob")
        : t("keepPracticing")

  return (
    <div className="bg-surface rounded-xl shadow-sm border border-border flex items-center justify-center flex-1 min-h-75 relative overflow-hidden">
       {attemptError && (
        <div className="absolute top-0 left-0 right-0 bg-danger-soft/90 border-b border-danger/20 p-2.5 px-4 flex items-center justify-between z-10 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-danger text-sm font-medium">
            <AlertCircle className="w-4 h-4" />
            <span>{t("attemptSaveFailed")}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={completeAttempt} className="h-7 px-2.5 text-xs text-danger hover:bg-danger/10 hover:text-danger">
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            {t("retry")}
          </Button>
        </div>
      )}
      <div className="text-center max-w-sm p-6 pt-12 pb-6">
        <div className="w-16 h-16 bg-gold-soft rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Trophy className="w-8 h-8 text-gold" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground mb-1">{t("testComplete")}</h2>
        <p className="text-sm text-muted-foreground mb-8">{passageTitle}</p>

        <div className="flex justify-center gap-4 mb-8">
          <Card>
            <CardContent className="p-5">
              <div className="text-[28px] font-bold text-success">{correctCount}</div>
              <div className="text-xs text-muted-foreground font-medium">{t("correct")}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="text-[28px] font-bold text-danger">{totalQuestions - correctCount}</div>
              <div className="text-xs text-muted-foreground font-medium">{t("wrong")}</div>
            </CardContent>
          </Card>
        </div>

        <p className="text-base text-foreground mb-8">
          {message} {accuracy}%
        </p>

        <div className="flex gap-4">
          <Button variant="outline" onClick={onReset} className="flex-1">{t("tryAgain")}</Button>
          <Button onClick={onNewPassage} className="flex-1">{t("newPassage")}</Button>
        </div>
      </div>
    </div>
  )
}
