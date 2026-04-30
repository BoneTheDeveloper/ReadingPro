'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Target, TrendingUp, Clock, ChevronLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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
        const response = await fetch('/api/progress/stats');
        const result = await response.json();
        if (result.success) {
          setStats(result.data);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  const statCards = [
    {
      icon: <BookOpen className="w-5 h-5" />,
      label: 'Total Cards',
      value: stats?.totalCards ?? 0,
      color: 'bg-primary-50 text-primary-700',
    },
    {
      icon: <Target className="w-5 h-5" />,
      label: 'Due for Review',
      value: stats?.dueCards ?? 0,
      color: 'bg-orange-50 text-orange-700',
      highlight: (stats?.dueCards ?? 0) > 0,
    },
    {
      icon: <TrendingUp className="w-5 h-5" />,
      label: 'Mature Cards',
      value: stats?.matureCards ?? 0,
      color: 'bg-green-50 text-green-700',
    },
    {
      icon: <Clock className="w-5 h-5" />,
      label: "Today's Reviews",
      value: stats?.todayReviews ?? 0,
      color: 'bg-blue-50 text-blue-700',
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-white border-b border-neutral-200">
        <div className="flex items-center gap-3 px-6 py-4 max-w-4xl mx-auto">
          <button onClick={() => router.push('/')} className="p-2 hover:bg-neutral-100 rounded-lg">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Your Progress</h1>
            <p className="text-neutral-500">Track your learning journey and review due cards</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((card) => (
            <div
              key={card.label}
              className={cn(
                'bg-white rounded-2xl border-2 p-5',
                card.highlight ? 'border-orange-300' : 'border-neutral-200'
              )}
            >
              <div className={cn('flex items-center gap-2 mb-3', card.color)}>
                {card.icon}
                <span className="text-sm font-medium opacity-80">{card.label}</span>
              </div>
              <div className={cn('text-3xl font-bold', card.color)}>{card.value}</div>
            </div>
          ))}
        </div>

        {(stats?.dueCards ?? 0) > 0 ? (
          <div className="bg-white rounded-2xl border-2 border-orange-200 p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">🔥</span>
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900">
                    {stats?.dueCards} cards due for review
                  </h3>
                  <p className="text-sm text-neutral-600">Keep your streak alive!</p>
                </div>
              </div>
              <button
                onClick={() => router.push('/upload')}
                className="px-5 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
              >
                Start Review
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border-2 border-green-200 p-6 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🎉</span>
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900">All caught up!</h3>
                <p className="text-sm text-neutral-600">
                  No cards due right now. Upload new content to continue learning.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => router.push('/upload')}
            className="bg-white border border-neutral-200 rounded-2xl p-8 hover:border-primary-400 hover:shadow-md transition-all flex flex-col items-center justify-center gap-3"
          >
            <BookOpen className="w-8 h-8 text-primary-600" />
            <span className="font-semibold text-neutral-900">Add New Content</span>
            <span className="text-sm text-neutral-500">Upload text or PDF</span>
          </button>
          <button
            onClick={() => router.push('/')}
            className="bg-white border border-neutral-200 rounded-2xl p-8 hover:border-primary-400 hover:shadow-md transition-all flex flex-col items-center justify-center gap-3"
          >
            <TrendingUp className="w-8 h-8 text-green-600" />
            <span className="font-semibold text-neutral-900">Back to Home</span>
            <span className="text-sm text-neutral-500">View all passages</span>
          </button>
        </div>
      </main>
    </div>
  );
}
