"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getProgressStats } from "./api/progress-client"
import {
  TrendingUp,
  Clock,
  ChevronLeft,
  Loader2,
  Flame,
  Calendar,
} from "lucide-react"
import { cn } from "@/shared/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { ProgressStatsDto } from "@/shared/study/study-response-schema"

export function ProgressDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<ProgressStatsDto | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const data = await getProgressStats()
        setStats(data)
      } catch (error) {
        console.error("Error fetching stats:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="min-h-dvh bg-muted flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  const formatTime = (seconds?: number) => {
    if (seconds == null) return "0m";
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hrs}h ${remainingMins}m`;
  };

  const statCards = [
    {
      icon: <Flame className="w-5 h-5" />,
      label: "Current Streak",
      value: `${stats?.streakDays ?? 0} days`,
      color: "bg-gold-soft text-gold",
      highlight: (stats?.streakDays ?? 0) > 0
    },
    {
      icon: <Clock className="w-5 h-5" />,
      label: "Today's Study",
      value: formatTime(stats?.timeStudiedTodaySeconds),
      color: "bg-primary/10 text-primary"
    },
    {
      icon: <TrendingUp className="w-5 h-5" />,
      label: "Weekly Study",
      value: formatTime(stats?.timeStudiedWeekSeconds),
      color: "bg-success-soft text-success"
    },
    {
      icon: <Calendar className="w-5 h-5" />,
      label: "Active Days",
      value: `${stats?.activeDaysThisWeek ?? 0}/7`,
      color: "bg-primary/10 text-primary"
    },
  ]

  return (
    <div className="min-h-dvh bg-muted">
      <header className="bg-surface border-b border-border">
        <div className="flex items-center gap-3 px-6 py-4 max-w-4xl mx-auto">
          <Button variant="ghost" size="icon" aria-label="Back to home" onClick={() => router.push("/")}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Your Progress</h1>
            <p className="text-muted-foreground">Track your learning journey and study habits</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {statCards.map((card) => (
            <Card key={card.label} className={cn(card.highlight && "border-2 border-gold/40")}>
              <CardContent className="p-5">
                <div className={cn("flex items-center gap-2 mb-3", card.color)}>
                  {card.icon}
                  <span className="text-sm font-medium opacity-80">{card.label}</span>
                </div>
                <div className={cn("text-3xl font-bold", card.color)}>{card.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="hover:border-primary hover:shadow-md transition-all cursor-pointer" onClick={() => router.push("/study")}>
            <CardContent className="p-8 flex flex-col items-center justify-center gap-3">
              <Clock className="w-8 h-8 text-primary" />
              <span className="font-semibold text-foreground">Start Studying</span>
              <span className="text-sm text-muted-foreground">Upload new content</span>
            </CardContent>
          </Card>
          <Card className="hover:border-primary hover:shadow-md transition-all cursor-pointer" onClick={() => router.push("/")}>
            <CardContent className="p-8 flex flex-col items-center justify-center gap-3">
              <TrendingUp className="w-8 h-8 text-success" />
              <span className="font-semibold text-foreground">Back to Home</span>
              <span className="text-sm text-muted-foreground">View all passages</span>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
