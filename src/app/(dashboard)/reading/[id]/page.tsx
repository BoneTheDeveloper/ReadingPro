'use client';

import { use } from 'react';
import { db } from '@/lib/db';
import { identifyChallengingWords, calculateReadingTime } from '@/lib/reading-utils';
import { Clock, FileText, ChevronLeft, Play, Volume2 } from 'lucide-react';

interface ReadingPageProps {
  params: Promise<{ id: string }>;
}

export default function ReadingPage({ params }: ReadingPageProps) {
  const { id } = use(params);
  const passageId = decodeURIComponent(id);

  return <ReadingView passageId={passageId} />;
}

function ReadingView({ passageId }: { passageId: string }) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-50 bg-white border-b border-neutral-200">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <a href="/upload" className="p-2 hover:bg-neutral-100 rounded-lg">
              <ChevronLeft className="w-5 h-5" />
            </a>
            <h1 className="font-semibold text-neutral-900 truncate max-w-[200px]">
              Reading Practice
            </h1>
          </div>
          <a
            href={`/test/${passageId}`}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
          >
            <Play className="w-4 h-4 inline mr-2" />
            Start Test
          </a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-white rounded-2xl p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-neutral-900 mb-6">
            Sample Reading Passage
          </h2>
          
          <div className="flex gap-4 mb-6 pb-4 border-b border-neutral-200 text-sm text-neutral-500">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>~3 min read</span>
            </div>
            <div className="flex items-center gap-1.5">
              <FileText className="w-4 h-4" />
              <span>450 words</span>
            </div>
          </div>

          <div className="prose prose-lg max-w-none text-neutral-800 font-serif leading-loose">
            <p className="mb-5">
              Once upon a time, in a small village surrounded by tall mountains, there lived a young girl named Elena. She was known for her curiosity and her love of reading. Every day after school, she would run to the village library to borrow new books.
            </p>
            <p className="mb-5">
              One rainy afternoon, Elena found a mysterious old book on a forgotten shelf. It had no title on its cover, only a strange symbol. As she opened it, the pages began to glow with a soft blue light. The book contained stories from many different worlds, each one more fascinating than the last.
            </p>
            <p className="mb-5">
              Elena spent the whole afternoon reading, forgetting about her homework and the dinner waiting for her at home. The stories transported her to places she had never imagined - underwater kingdoms, floating cities in the sky, and forests where animals could speak. Each tale taught her something new about courage, friendship, and the importance of imagination.
            </p>
            <p className="mb-5">
              But as the sun began to set, the glow from the book started to fade. Elena realized she had been reading for hours, and her parents must be worried. She carefully closed the book and ran home. From that day on, the library became her favorite place, and she knew that the magic of stories would always be there waiting for her.
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-neutral-200">
            <div className="flex items-center justify-between text-sm text-neutral-500">
              <span>CEFR Level: B1</span>
              <span>Source: AI Generated</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}