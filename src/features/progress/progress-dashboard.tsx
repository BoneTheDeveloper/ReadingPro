"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Target,
  TrendingUp,
  Clock,
  ChevronLeft,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/shared/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ProgressStats {
  totalCards: number;
  matureCards: number;
  dueCards: number;
  todayReviews: number;
}

export function ProgressDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch("/api/progress/stats");
        const result = await response.json();
        if (result.success) setStats(result.data);
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const statCards = [
    { icon: <BookOpen className="w-5 h-5" />, label: "Total Cards", value: stats?.totalCards ?? 0, color: "bg-primary/10 text-primary" },
    { icon: <Target className="w-5 h-5" />, label: "Due for Review", value: stats?.dueCards ?? 0, color: "bg-orange-50 text-orange-700", highlight: (stats?.dueCards ?? 0) > 0 },
    { icon: <TrendingUp className="w-5 h-5" />, label: "Mature Cards", value: stats?.matureCards ?? 0, color: "bg-green-50 text-green-700" },
    { icon: <Clock className="w-5 h-5" />, label: "Today's Reviews", value: stats?.todayReviews ?? 0, color: "bg-blue-50 text-blue-700" },
  ];

  return (
    <div className="min-h-screen bg-muted">
      <header className="bg-background border-b border-border">
        <div className="flex items-center gap-3 px-6 py-4 max-w-4xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Your Progress</h1>
            <p className="text-muted-foreground">Track your learning journey and review due cards</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((card) => (
            <Card key={card.label} className={cn(card.highlight && "border-2 border-orange-300")}>
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

        {(stats?.dueCards ?? 0) > 0 ? (
          <Card className="border-2 border-orange-200 mb-6">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">🔥</span>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{stats?.dueCards} cards due for review</h3>
                  <p className="text-sm text-muted-foreground">Keep your streak alive!</p>
                </div>
              </div>
              <Button onClick={() => router.push("/upload")}>Start Review</Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-2 border-green-200 mb-6">
            <CardContent className="p-6 flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🎉</span>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">All caught up!</h3>
                <p className="text-sm text-muted-foreground">No cards due right now. Upload new content to continue learning.</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="hover:border-primary hover:shadow-md transition-all cursor-pointer" onClick={() => router.push("/upload")}>
            <CardContent className="p-8 flex flex-col items-center justify-center gap-3">
              <BookOpen className="w-8 h-8 text-primary" />
              <span className="font-semibold text-foreground">Add New Content</span>
              <span className="text-sm text-muted-foreground">Upload text or PDF</span>
            </CardContent>
          </Card>
          <Card className="hover:border-primary hover:shadow-md transition-all cursor-pointer" onClick={() => router.push("/")}>
            <CardContent className="p-8 flex flex-col items-center justify-center gap-3">
              <TrendingUp className="w-8 h-8 text-green-600" />
              <span className="font-semibold text-foreground">Back to Home</span>
              <span className="text-sm text-muted-foreground">View all passages</span>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
