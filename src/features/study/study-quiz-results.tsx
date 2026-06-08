"use client"

import { useEffect } from "react"
import { useTranslations } from "next-intl"
import { Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

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

  useEffect(() => {
    if (!attemptId) return
    const controller = new AbortController()
    fetch('/api/quiz-attempt', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attemptId,
        correctCount,
        incorrectCount: totalQuestions - correctCount,
        totalQuestions,
      }),
      signal: controller.signal,
    }).catch(() => {})
    return () => controller.abort()
  }, [attemptId]) // eslint-disable-line react-hooks/exhaustive-deps

  const accuracy = Math.round((correctCount / totalQuestions) * 100)
  const message =
    accuracy >= 80
      ? t("excellent")
      : accuracy >= 60
        ? t("goodJob")
        : t("keepPracticing")

  return (
    <div className="bg-surface rounded-xl shadow-sm border border-border p-6 flex items-center justify-center flex-1 min-h-75">
      <div className="text-center max-w-sm">
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
