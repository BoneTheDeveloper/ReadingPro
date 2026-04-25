---
title: "Phase 05: Reading View Implementation"
description: "Build reading interface with CEFR level badge, word highlighting, vocabulary sidebar, and navigation controls"
status: pending
priority: P1
effort: 6h
branch: main
tags: [reading, ui, vocabulary, sidebar]
created: 2026-04-20
---

# Phase 05: Reading View Implementation

**Status:** pending
**Owner:** unassigned
**Dependencies:** Phase 04

---

## Overview

Build the main reading interface where users view processed content with level indicators, vocabulary highlights, sidebar word definitions, and navigation controls.

---

## Requirements

### Functional
- Display passage with original or simplified content toggle
- CEFR level badge with color coding
- Highlight challenging vocabulary (clickable)
- Sidebar/bottom sheet with word definitions
- Font size controls (small/medium/large)
- Reading time display
- Navigation to flashcard test
- Bookmark/save for later
- Responsive design (sidebar desktop, bottom sheet mobile)

### Non-Functional
- Smooth scrolling and animations
- Accessible keyboard navigation
- Touch-friendly on mobile
- Maintain reading position when toggling views
- Performance with long passages (pagination if needed)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Header Component                         │
│  [Back] [Title - truncates] [CEFR Badge] [Settings] [Test]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────┐  ┌─────────────────┐ │
│  │                                      │  │                 │ │
│  │         Reading Content              │  │   Word Card     │ │
│  │    (with highlighted words)          │  │                 │ │
│  │                                      │  │  "intelligence" │ │
│  │  The quick brown fox jumps...        │  │                 │ │
│  │                                      │  │  Definition...  │ │
│  │  Artificial [intelligence]...        │  │                 │ │
│  │                                      │  │  [Pronounce]    │ │
│  │                                      │  │  [Save Card]    │ │
│  │                                      │  │                 │ │
│  └──────────────────────────────────────┘  └─────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

Mobile Layout:
┌─────────────────────────────────────────────────────────────────┐
│  [Back] Title... [B2] [⋮]                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Reading Content (scrollable)                                   │
│                                                                  │
│  [Floating Action Button → Start Test]                          │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  ════════                                              │    │
│  │              Word Details (Bottom Sheet)                │    │
│  │  [Close]                                               │    │
│  │  Word | Definition | Example                          │    │
│  │  [Pronounce] [Save Card]                               │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Related Code Files

### Files to Create
- `src/app/(dashboard)/reading/[id]/page.tsx` - Reading view page
- `src/components/reading-content.tsx` - Passage display component
- `src/components/word-highlighter.tsx` - Word highlighting logic
- `src/components/vocabulary-sidebar.tsx` - Desktop sidebar
- `src/components/vocabulary-bottom-sheet.tsx` - Mobile bottom sheet
- `src/components/reading-header.tsx` - Header with controls

### Files to Modify
- `src/app/globals.css` - Reading-specific styles
- `src/lib/utils.ts` - Reading utilities

---

## Implementation Steps

### 1. Create Reading Utilities

**File:** `src/lib/reading-utils.ts`

```typescript
import { CEFRLevel } from '@prisma/client';

export interface WordDefinition {
  word: string;
  phonetic?: string;
  definition: string;
  example?: string;
  partOfSpeech?: string;
}

export interface HighlightedWord {
  word: string;
  startIndex: number;
  endIndex: number;
  definition?: WordDefinition;
}

/**
 * Identify challenging words based on CEFR level
 * Simple heuristic: words > 6 characters or less common
 */
export function identifyChallengingWords(
  text: string,
  level: CEFRLevel
): HighlightedWord[] {
  // Common words to never highlight
  const commonWords = new Set([
    'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'I',
    'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
    'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
    'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their',
  ]);

  const words: HighlightedWord[] = [];
  const threshold = {
    A1: 8,  // Only very long words
    A2: 7,
    B1: 6,
    B2: 5,
    C1: 4,
    C2: 0,  // No highlighting
  }[level];

  if (threshold === 0) return words;

  const regex = /\b[a-zA-Z]{4,}\b/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const word = match[0];
    const lowerWord = word.toLowerCase();

    if (!commonWords.has(lowerWord) && word.length >= threshold) {
      words.push({
        word: lowerWord,
        startIndex: match.index,
        endIndex: match.index + word.length,
      });
    }
  }

  return words;
}

/**
 * Parse passage into displayable chunks with highlights
 */
export interface ParsedPassage {
  paragraphs: Array<{
    lines: Array<{
      lineNumber: number;
      content: string;
      highlights: Array<{
        word: string;
        start: number;
        end: number;
      }>;
    }>;
  }>;
}

export function parsePassageForDisplay(text: string): ParsedPassage {
  const paragraphs = text.split(/\n\n+/);
  let globalLineNumber = 1;

  return {
    paragraphs: paragraphs.map(para => ({
      lines: para.split('\n').map(line => ({
        lineNumber: globalLineNumber++,
        content: line,
        highlights: [], // Populated by highlighter
      })),
    })),
  };
}

/**
 * Calculate reading time based on word count and CEFR level
 */
export function calculateReadingTime(wordCount: number, level: CEFRLevel): string {
  // WPM by level
  const wpm = {
    A1: 100,
    A2: 120,
    B1: 150,
    B2: 180,
    C1: 220,
    C2: 250,
  }[level];

  const minutes = Math.ceil(wordCount / wpm);
  return `~${minutes} min read`;
}
```

### 2. Create Word Highlighter Component

**File:** `src/components/word-highlighter.tsx`

```typescript
'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface WordHighlighterProps {
  text: string;
  highlights: Array<{
    word: string;
    startIndex: number;
    endIndex: number;
  }>;
  onWordClick?: (word: string) => void;
  selectedWord?: string;
  className?: string;
}

export function WordHighlighter({
  text,
  highlights,
  onWordClick,
  selectedWord,
  className,
}: WordHighlighterProps) {
  const [hoveredWord, setHoveredWord] = useState<string | null>(null);

  // Sort highlights by start index
  const sortedHighlights = [...highlights].sort((a, b) => a.startIndex - b.startIndex);

  // Build highlighted text segments
  const segments: Array<{
    text: string;
    isHighlight: boolean;
    word?: string;
    start: number;
    end: number;
  }> = [];

  let lastIndex = 0;

  for (const highlight of sortedHighlights) {
    // Add text before highlight
    if (highlight.startIndex > lastIndex) {
      segments.push({
        text: text.slice(lastIndex, highlight.startIndex),
        isHighlight: false,
        start: lastIndex,
        end: highlight.startIndex,
      });
    }

    // Add highlighted word
    segments.push({
      text: text.slice(highlight.startIndex, highlight.endIndex),
      isHighlight: true,
      word: highlight.word,
      start: highlight.startIndex,
      end: highlight.endIndex,
    });

    lastIndex = highlight.endIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({
      text: text.slice(lastIndex),
      isHighlight: false,
      start: lastIndex,
      end: text.length,
    });
  }

  const handleWordClick = useCallback(
    (word: string) => {
      onWordClick?.(word);
    },
    [onWordClick]
  );

  return (
    <span className={className}>
      {segments.map((segment, i) =>
        segment.isHighlight ? (
          <span
            key={i}
            onClick={() => handleWordClick(segment.word!)}
            onMouseEnter={() => setHoveredWord(segment.word!)}
            onMouseLeave={() => setHoveredWord(null)}
            className={cn(
              'inline cursor-pointer transition-all',
              'bg-gradient-to-t from-primary-200 to-transparent',
              'rounded px-0.5 -mx-0.5',
              'hover:from-primary-300',
              selectedWord === segment.word && 'from-primary-400 text-white'
            )}
          >
            {segment.text}
          </span>
        ) : (
          <span key={i}>{segment.text}</span>
        )
      )}
    </span>
  );
}
```

### 3. Create Vocabulary Sidebar Component

**File:** `src/components/vocabulary-sidebar.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Volume2, Bookmark, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WordDefinition {
  word: string;
  phonetic?: string;
  definition: string;
  example?: string;
  partOfSpeech?: string;
}

interface VocabularySidebarProps {
  word: string | null;
  definition: WordDefinition | null;
  isLoading?: boolean;
  onSaveCard?: (word: string) => void;
  onClose?: () => void;
  className?: string;
}

export function VocabularySidebar({
  word,
  definition,
  isLoading,
  onSaveCard,
  onClose,
  className,
}: VocabularySidebarProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handlePronounce = () => {
    if (!word) return;

    setIsSpeaking(true);
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.onend = () => setIsSpeaking(false);
    speechSynthesis.speak(utterance);
  };

  if (!word && !isLoading) {
    return (
      <div className={cn('flex flex-col', className)}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-neutral-900">Word Details</h2>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>
        <div className="flex-1 flex items-center justify-center text-neutral-400 text-sm">
          Click on any highlighted word to see its definition
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-semibold text-neutral-900">Word Details</h2>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
        </div>
      )}

      {/* Word Card */}
      {definition && (
        <>
          <div className="bg-primary-50 rounded-xl p-5 mb-4">
            <h3 className="text-2xl font-bold text-neutral-900 mb-1">
              {definition.word}
            </h3>
            {definition.phonetic && (
              <p className="text-neutral-500 text-sm italic mb-4">
                {definition.phonetic}
              </p>
            )}
            {definition.partOfSpeech && (
              <span className="inline-block px-2 py-0.5 bg-primary-200 text-primary-700 text-xs rounded-full mb-3">
                {definition.partOfSpeech}
              </span>
            )}
            <p className="text-neutral-700 leading-relaxed">
              {definition.definition}
            </p>
          </div>

          {definition.example && (
            <div className="bg-white border-l-3 border-primary-400 rounded-lg p-3 mb-4">
              <p className="text-sm text-neutral-600 italic">
                "{definition.example}"
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-auto">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handlePronounce}
              disabled={isSpeaking}
            >
              <Volume2 className="w-4 h-4 mr-2" />
              Pronounce
            </Button>
            <Button
              className="flex-1"
              onClick={() => onSaveCard?.(word)}
            >
              <Bookmark className="w-4 h-4 mr-2" />
              Save Card
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
```

### 4. Create Reading Header Component

**File:** `src/components/reading-header.tsx`

```typescript
'use client';

import { useState } from 'react';
import { ChevronLeft, Settings, Bookmark, ListTodo } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CEFRLevel, getCEFRColor, getCEFRLabel } from '@/lib/db-utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ReadingHeaderProps {
  title: string;
  level: CEFRLevel;
  isBookmarked?: boolean;
  onBack?: () => void;
  onStartTest?: () => void;
  onToggleBookmark?: () => void;
  onFontSizeChange?: (size: 'small' | 'medium' | 'large') => void;
}

export function ReadingHeader({
  title,
  level,
  isBookmarked = false,
  onBack,
  onStartTest,
  onToggleBookmark,
  onFontSizeChange,
}: ReadingHeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-neutral-200">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left */}
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
          )}
          <h1 className="font-semibold text-neutral-900 truncate max-w-[200px] sm:max-w-[400px]">
            {title}
          </h1>
        </div>

        {/* Center - Level Badge (desktop) */}
        <div className="hidden sm:block">
          <span className={cn('px-3 py-1 rounded-full text-sm font-semibold', getCEFRColor(level))}>
            Level {level}
          </span>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          {onToggleBookmark && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleBookmark}
              className={cn(isBookmarked && 'text-primary-600')}
            >
              <Bookmark className={cn('w-5 h-5', isBookmarked && 'fill-current')} />
            </Button>
          )}

          {onFontSizeChange && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Settings className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onFontSizeChange('small')}>
                  <span className="text-sm">A</span>
                  <span className="ml-2 text-xs text-neutral-500">Small</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onFontSizeChange('medium')}>
                  <span className="text-base">A</span>
                  <span className="ml-2 text-xs text-neutral-500">Medium</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onFontSizeChange('large')}>
                  <span className="text-lg">A</span>
                  <span className="ml-2 text-xs text-neutral-500">Large</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {onStartTest && (
            <Button onClick={onStartTest} className="hidden sm:flex">
              <ListTodo className="w-4 h-4 mr-2" />
              Start Test
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Level Badge */}
      <div className="sm:hidden px-4 pb-3">
        <span className={cn('px-3 py-1 rounded-full text-sm font-semibold', getCEFRColor(level))}>
          {getCEFRLabel(level)}
        </span>
      </div>
    </header>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
```

### 5. Create Reading Content Component

**File:** `src/components/reading-content.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Clock, FileText } from 'lucide-react';
import { WordHighlighter } from './word-highlighter';
import { cn, calculateReadingTime } from '@/lib/utils';
import { CEFRLevel } from '@prisma/client';

interface ReadingContentProps {
  title: string;
  content: string;
  simplifiedContent?: string;
  originalLevel: CEFRLevel;
  simplifiedLevel?: CEFRLevel | null;
  wordCount: number;
  highlights: Array<{
    word: string;
    startIndex: number;
    endIndex: number;
  }>;
  className?: string;
  onWordClick?: (word: string) => void;
  selectedWord?: string;
}

type FontSize = 'small' | 'medium' | 'large';
type ViewMode = 'original' | 'simplified';

const fontSizes = {
  small: 'text-base',
  medium: 'text-lg',
  large: 'text-xl',
};

export function ReadingContent({
  title,
  content,
  simplifiedContent,
  originalLevel,
  simplifiedLevel,
  wordCount,
  highlights,
  className,
  onWordClick,
  selectedWord,
}: ReadingContentProps) {
  const [fontSize, setFontSize] = useState<FontSize>('medium');
  const [viewMode, setViewMode] = useState<ViewMode>(
    simplifiedContent ? 'simplified' : 'original'
  );

  const currentContent = viewMode === 'simplified' && simplifiedContent
    ? simplifiedContent
    : content;

  const currentLevel = viewMode === 'simplified' ? simplifiedLevel : originalLevel;

  return (
    <div className={cn('max-w-3xl mx-auto', className)}>
      {/* Meta Info */}
      <div className="flex flex-wrap items-center gap-4 mb-6 pb-4 border-b border-neutral-200 text-sm text-neutral-500">
        <div className="flex items-center gap-1.5">
          <Clock className="w-4 h-4" />
          <span>{calculateReadingTime(wordCount, currentLevel || originalLevel)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <FileText className="w-4 h-4" />
          <span>{wordCount} words</span>
        </div>
      </div>

      {/* View Toggle */}
      {simplifiedContent && (
        <div className="flex items-center gap-2 mb-6 p-1 bg-neutral-100 rounded-lg self-start">
          <button
            onClick={() => setViewMode('original')}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              viewMode === 'original'
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-600 hover:text-neutral-900'
            )}
          >
            Original ({originalLevel})
          </button>
          <button
            onClick={() => setViewMode('simplified')}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              viewMode === 'simplified'
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-600 hover:text-neutral-900'
            )}
          >
            Simplified ({simplifiedLevel})
          </button>
        </div>
      )}

      {/* Content */}
      <div
        className={cn(
          'font-serif leading-loose text-neutral-800',
          fontSizes[fontSize]
        )}
      >
        {currentContent.split('\n\n').map((paragraph, i) => (
          <p key={i} className="mb-5">
            <WordHighlighter
              text={paragraph}
              highlights={highlights
                .filter(h => h.startIndex >= currentContent.indexOf(paragraph) &&
                             h.endIndex <= currentContent.indexOf(paragraph) + paragraph.length)
                .map(h => ({
                  ...h,
                  startIndex: h.startIndex - currentContent.indexOf(paragraph),
                  endIndex: h.endIndex - currentContent.indexOf(paragraph),
                }))}
              onWordClick={onWordClick}
              selectedWord={selectedWord}
            />
          </p>
        ))}
      </div>
    </div>
  );
}
```

### 6. Create Reading Page

**File:** `src/app/(dashboard)/reading/[id]/page.tsx`

```typescript
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { identifyChallengingWords, parsePassageForDisplay } from '@/lib/reading-utils';
import { ReadingHeader } from '@/components/reading-header';
import { ReadingContent } from '@/components/reading-content';
import { VocabularySidebar } from '@/components/vocabulary-sidebar';
import { VocabularyBottomSheet } from '@/components/vocabulary-bottom-sheet';

interface ReadingPageProps {
  params: { id: string };
}

export default async function ReadingPage({ params }: ReadingPageProps) {
  const passage = await db.passage.findUnique({
    where: { id: params.id },
    include: { questions: true },
  });

  if (!passage) {
    notFound();
  }

  const displayContent = passage.simplifiedContent || passage.content;
  const displayLevel = passage.simplifiedLevel || passage.originalLevel;

  // Identify challenging words
  const highlights = identifyChallengingWords(displayContent, displayLevel);

  return (
    <div className="min-h-screen bg-neutral-50">
      <ReadingHeader
        title={passage.title}
        level={displayLevel}
        onStartTest={() => {/* Navigate to test */}}
      />

      <div className="lg:grid lg:grid-cols-[1fr_320px]">
        {/* Main Content */}
        <main className="lg:pr-0">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
            <ReadingContent
              title={passage.title}
              content={passage.content}
              simplifiedContent={passage.simplifiedContent || undefined}
              originalLevel={passage.originalLevel}
              simplifiedLevel={passage.simplifiedLevel}
              wordCount={passage.wordCount}
              highlights={highlights}
            />
          </div>
        </main>

        {/* Sidebar - Desktop */}
        <aside className="hidden lg:block bg-white border-l border-neutral-200">
          <VocabularySidebarClientWrapper highlights={highlights} />
        </aside>
      </div>

      {/* Bottom Sheet - Mobile */}
      <VocabularyBottomSheetClientWrapper highlights={highlights} />
    </div>
  );
}

// Client components for interactivity
function VocabularySidebarClientWrapper({ highlights }: { highlights: any[] }) {
  'use client';
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  // ... sidebar state logic
  return <VocabularySidebar word={selectedWord} /* ... */ />;
}

function VocabularyBottomSheetClientWrapper({ highlights }: { highlights: any[] }) {
  'use client';
  // ... bottom sheet logic
  return <VocabularyBottomSheet /* ... */ />;
}
```

---

## Todo List

- [ ] Create reading utilities (word identification, parsing)
- [ ] Create word highlighter component
- [ ] Create vocabulary sidebar component
- [ ] Create reading header with controls
- [ ] Create reading content component
- [ ] Create mobile bottom sheet component
- [ ] Create reading page with layout
- [ ] Test responsive behavior
- [ ] Add bookmark functionality
- [ ] Add pronunciation (Web Speech API)

---

## Success Criteria

1. ✅ Passage displays with proper typography (Literata font)
2. ✅ Challenging words are highlighted and clickable
3. ✅ Sidebar shows word definitions on desktop
4. ✅ Bottom sheet shows on mobile for word definitions
5. ✅ Font size controls work (small/medium/large)
6. ✅ Original/simplified toggle works
7. ✅ Responsive layout matches wireframes
8. ✅ Navigation to test view works

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Too many highlighted words | Low | Adjust threshold based on CEFR level |
| Definition lookup failures | Medium | Show fallback message, allow retry |
| Mobile bottom sheet issues | Medium | Test on real devices, use proper z-index |
| Long content performance | Low | Implement virtual scrolling if needed |

---

## Next Steps

After completion:
- Proceed to [Phase 06: Flashcard Test](phase-06-flashcard-test.md)

---

## Context Links

- [Reading View Wireframe](../../docs/wireframe/study-view.html)
- [Design Guidelines](../../docs/design-guidelines.md)
- [Question Generation](phase-04-gemini-integration.md)
