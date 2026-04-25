'use client';

import { use } from 'react';
import { useState } from 'react';
import { ChevronLeft, CheckCircle, XCircle, ArrowRight, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TestPageProps {
  params: Promise<{ id: string }>;
}

export default function TestPage({ params }: TestPageProps) {
  const { id } = use(params);
  const passageId = decodeURIComponent(id);

  return <FlashcardTest passageId={passageId} />;
}

const sampleQuestions = [
  {
    id: '1',
    question: 'What was Elena known for?',
    options: [
      { id: 'A', text: 'Her beautiful singing voice' },
      { id: 'B', text: 'Her curiosity and love of reading' },
      { id: 'C', text: 'Her athletic abilities' },
      { id: 'D', text: 'Her cooking skills' },
    ],
    correct: 'B',
    explanation: 'The passage states that "She was known for her curiosity and her love of reading."',
    sourceLine: 1,
  },
  {
    id: '2',
    question: 'Where did Elena find the mysterious book?',
    options: [
      { id: 'A', text: 'On her desk at home' },
      { id: 'B', text: 'On a forgotten shelf in the library' },
      { id: 'C', text: 'In her teacher\'s office' },
      { id: 'D', text: 'In the school cafeteria' },
    ],
    correct: 'B',
    explanation: 'According to the passage, Elena "found a mysterious old book on a forgotten shelf."',
    sourceLine: 2,
  },
  {
    id: '3',
    question: 'What happened when Elena opened the book?',
    options: [
      { id: 'A', text: 'It started to burn' },
      { id: 'B', text: 'The pages glowed with blue light' },
      { id: 'C', text: 'A spider jumped out' },
      { id: 'D', text: 'It turned into a bird' },
    ],
    correct: 'B',
    explanation: 'The passage describes that "As she opened it, the pages began to glow with a soft blue light."',
    sourceLine: 2,
  },
  {
    id: '4',
    question: 'What did the stories teach Elena?',
    options: [
      { id: 'A', text: 'About courage, friendship, and imagination' },
      { id: 'B', text: 'How to fly' },
      { id: 'C', text: 'Math and science' },
      { id: 'D', text: 'How to cook' },
    ],
    correct: 'A',
    explanation: 'Each tale taught her "something new about courage, friendship, and the importance of imagination."',
    sourceLine: 3,
  },
  {
    id: '5',
    question: 'What happened when the sun began to set?',
    options: [
      { id: 'A', text: 'The book started to glow brighter' },
      { id: 'B', text: 'The glow from the book started to fade' },
      { id: 'C', text: 'A new chapter appeared' },
      { id: 'D', text: 'Elena fell asleep' },
    ],
    correct: 'B',
    explanation: 'The passage states that "as the sun began to set, the glow from the book started to fade."',
    sourceLine: 4,
  },
];

function FlashcardTest({ passageId }: { passageId: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [isComplete, setIsComplete] = useState(false);
  const [streak, setStreak] = useState(0);

  const currentQuestion = sampleQuestions[currentIndex];
  const progress = ((currentIndex + 1) / sampleQuestions.length) * 100;

  const handleSelectAnswer = (optionId: string) => {
    if (!showFeedback) {
      setSelectedAnswer(optionId);
    }
  };

  const handleCheckAnswer = () => {
    if (!selectedAnswer) return;
    
    const isCorrect = selectedAnswer === currentQuestion.correct;
    setAnswers({ ...answers, [currentQuestion.id]: isCorrect });
    setShowFeedback(true);
    
    if (isCorrect) {
      setStreak(streak + 1);
    } else {
      setStreak(0);
    }
  };

  const handleNext = () => {
    if (currentIndex < sampleQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
    } else {
      setIsComplete(true);
    }
  };

  if (isComplete) {
    const correctCount = Object.values(answers).filter(Boolean).length;
    const totalQuestions = sampleQuestions.length;
    const accuracy = Math.round((correctCount / totalQuestions) * 100);

    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Trophy className="w-10 h-10 text-primary-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">Reading Complete!</h2>
          <p className="text-neutral-500 mb-8">You've answered all questions for this passage.</p>
          
          <div className="flex justify-center gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="text-3xl font-bold text-primary-600">{correctCount}</div>
              <div className="text-sm text-neutral-500">Correct</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="text-3xl font-bold text-neutral-900">{totalQuestions - correctCount}</div>
              <div className="text-sm text-neutral-500">To Review</div>
            </div>
          </div>
          
          <p className="text-lg text-neutral-700 mb-8">Accuracy: {accuracy}%</p>
          
          <div className="flex gap-4">
            <a
              href={`/reading/${passageId}`}
              className="flex-1 px-6 py-3 bg-white border border-neutral-200 rounded-lg font-medium hover:bg-neutral-50"
            >
              Review Reading
            </a>
            <a
              href="/upload"
              className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
            >
              New Passage
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-50 bg-white border-b border-neutral-200">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <a href={`/reading/${passageId}`} className="p-2 hover:bg-neutral-100 rounded-lg">
              <ChevronLeft className="w-5 h-5" />
            </a>
            <div className="w-48 bg-neutral-100 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-sm text-neutral-500">
              {currentIndex + 1} of {sampleQuestions.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">🔥</span>
            <span className="font-semibold">{streak}</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="mb-2 text-sm text-neutral-500">Question {currentIndex + 1}</div>
          <h2 className="text-xl font-semibold text-neutral-900 mb-6">
            {currentQuestion.question}
          </h2>

          <div className="space-y-3">
            {currentQuestion.options.map((option) => (
              <button
                key={option.id}
                onClick={() => handleSelectAnswer(option.id)}
                disabled={showFeedback}
                className={cn(
                  'w-full p-4 rounded-xl text-left transition-all',
                  'border-2 flex items-center gap-3',
                  selectedAnswer === option.id
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-neutral-200 hover:border-primary-300',
                  showFeedback && option.id === currentQuestion.correct && 'border-green-500 bg-green-50',
                  showFeedback && selectedAnswer === option.id && option.id !== currentQuestion.correct && 'border-red-500 bg-red-50'
                )}
              >
                <span className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center font-semibold">
                  {option.id}
                </span>
                <span className="flex-1">{option.text}</span>
                {showFeedback && option.id === currentQuestion.correct && (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                )}
                {showFeedback && selectedAnswer === option.id && option.id !== currentQuestion.correct && (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
              </button>
            ))}
          </div>

          {showFeedback ? (
            <div className="mt-6 p-4 bg-neutral-50 rounded-xl">
              <div className={cn(
                'font-medium mb-2',
                answers[currentQuestion.id] ? 'text-green-600' : 'text-red-600'
              )}>
                {answers[currentQuestion.id] ? '✓ Correct!' : '✗ Incorrect'}
              </div>
              <p className="text-sm text-neutral-600 mb-2">
                {currentQuestion.explanation}
              </p>
              <p className="text-xs text-neutral-400">
                Source: Line {currentQuestion.sourceLine}
              </p>
            </div>
          ) : (
            <button
              onClick={handleCheckAnswer}
              disabled={!selectedAnswer}
              className={cn(
                'w-full mt-6 py-3 rounded-lg font-medium transition-all',
                selectedAnswer
                  ? 'bg-primary-600 text-white hover:bg-primary-700'
                  : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
              )}
            >
              Check Answer
            </button>
          )}

          {showFeedback && (
            <button
              onClick={handleNext}
              className="w-full mt-4 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 flex items-center justify-center gap-2"
            >
              {currentIndex < sampleQuestions.length - 1 ? (
                <>
                  Next Question
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                'View Results'
              )}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}