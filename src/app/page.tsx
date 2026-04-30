import Link from 'next/link';
import { BookOpen, BarChart3, Upload } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <h1 className="text-3xl font-bold text-neutral-900">English Reading Training</h1>
          <p className="text-neutral-500 mt-1">AI-powered reading comprehension app</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="grid gap-6 md:grid-cols-3">
          <Link
            href="/study"
            className="flex flex-col items-center justify-center p-10 bg-white border border-neutral-200 rounded-2xl hover:border-primary-400 hover:shadow-lg transition-all group"
          >
            <div className="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Upload className="w-7 h-7 text-primary-600" />
            </div>
            <h2 className="text-lg font-semibold text-neutral-900 mb-1">Upload Content</h2>
            <p className="text-neutral-500 text-center text-sm">Upload text or PDF files for AI analysis</p>
          </Link>

          <Link
            href="/progress"
            className="flex flex-col items-center justify-center p-10 bg-white border border-neutral-200 rounded-2xl hover:border-primary-400 hover:shadow-lg transition-all group"
          >
            <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <BarChart3 className="w-7 h-7 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold text-neutral-900 mb-1">Progress</h2>
            <p className="text-neutral-500 text-center text-sm">Track your learning progress</p>
          </Link>

          <Link
            href="/progress"
            className="flex flex-col items-center justify-center p-10 bg-white border border-neutral-200 rounded-2xl hover:border-primary-400 hover:shadow-lg transition-all group"
          >
            <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <BookOpen className="w-7 h-7 text-orange-600" />
            </div>
            <h2 className="text-lg font-semibold text-neutral-900 mb-1">Study Cards</h2>
            <p className="text-neutral-500 text-center text-sm">Review due flashcards</p>
          </Link>
        </div>
      </main>
    </div>
  );
}
