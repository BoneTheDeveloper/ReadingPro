import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-neutral-900">English Reading Training</h1>
          <p className="text-neutral-500">AI-powered reading comprehension app</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="grid gap-6 md:grid-cols-2">
          <Link
            href="/upload"
            className="flex flex-col items-center justify-center p-12 bg-white border border-neutral-200 rounded-2xl hover:border-primary-400 hover:shadow-lg transition-all"
          >
            <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-neutral-900 mb-2">Upload Content</h2>
            <p className="text-neutral-500 text-center">Upload text or PDF files for AI analysis</p>
          </Link>

          <Link
            href="/progress"
            className="flex flex-col items-center justify-center p-12 bg-white border border-neutral-200 rounded-2xl hover:border-primary-400 hover:shadow-lg transition-all"
          >
            <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-neutral-900 mb-2">Progress</h2>
            <p className="text-neutral-500 text-center">Track your learning progress</p>
          </Link>
        </div>
      </main>
    </div>
  );
}