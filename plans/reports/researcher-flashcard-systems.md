# Research: Flashcard & Spaced Repetition Systems

## 1. Proven Algorithms

### SM-2 (SuperMemo 2)
- **Created by**: Piotr Woźniak (1980s)
- **Core principle**: Exponential spaced intervals based on performance
- **Rating system**: 0-5 scale (0=complete failure, 5=perfect recall)
- **Key metrics**: Ease factor, interval modifier, repetition count
- **Research impact**: Foundation for Anki and most modern SR systems

### Anki Algorithm (SM-2 variant)
- **Modifications**: Simpler implementation for broader user base
- **Intervals**: Starting at 1 day, growing exponentially (1, 3, 7, 14, 30 days)
- **Ease factor**: 1.3-2.5 range (default 2.5)
- **Lapses**: Reset to base interval when failed
- **Evidence**: Field-tested with millions of users showing 90%+ retention rates

### Research-backed alternatives
- **Leitner System**: 5-box physical system (pre-digital)
- **Free Recall Testing**: Active retrieval > passive review
- **Retrieval Difficulty Theory**: Harder retrieval = stronger memory

## 2. Effective Flashcard Formats

### Text-based formats
- **Cloze deletion**: "The quick brown {{c1:fox}} jumps over the lazy dog"
- **Sentence completion**: "Yesterday I _____ (go) to the store" → went
- **Definition → term**: "Process of acquiring new knowledge" → Learning
- **Translation**: "Hello" → "Hola"

### Multimedia formats
- **Image → text**: [photo] → "Eiffel Tower"
- **Audio → transcript**: [audio] → "Hello, how are you?"
- **Video → summary**: [clip] → Main idea + key vocabulary

### Advanced formats
- **Socratic questioning**: "Why do we use past perfect?"
- **Contextual examples**: "I have been studying since 9 AM" (use case)
- **Error correction**: "He no likes coffee" → "He doesn't like coffee"

## 3. Explanation & Citation Patterns

### Source-based retention
- **Direct quotes**: "Language is the dress of thought" (Samuel Johnson)
- **Contextual embedding**: Quote + original paragraph + page number
- **Author attribution**: "According to Krashen's input hypothesis..."
- **Connection building**: "This relates to vocabulary acquisition theory"

### Progressive disclosure
- **Beginner**: Simple translation + audio
- **Intermediate**: Sentence with target structure
- **Advanced**: Academic usage + collocations
- **Expert**: Debate points + counterarguments

## 4. User Progress Tracking

### Core metrics
- **Retention rate**: % cards recalled correctly
- **Mature card count**: Cards > 21 days interval
- **Review streak**: Consecutive days of review
- **Time efficiency**: Cards studied per minute

### Analytics
- **Memory strength**: Combined ease factor × interval length
- **Learning efficiency**: Cards gained per hour studied
- **Optimal review times**: Personalized peak recall hours
- **Cognitive load**: New vs review card ratios

### Gamification
- **Level progression**: Mastery thresholds
- **Achievement badges**: Milestone rewards
- **Visual graphs**: Progress over time
- **Competitive elements**: Optional social features

## 5. Mobile/Web Patterns

### Responsive design
- **Mobile-first**: Touch-friendly interfaces
- **Offline capability**: Sync when online
- **Micro-interactions**: Swipe gestures, tap to reveal
- **Notifications**: Smart review reminders

### Web optimization
- **Progressive loading**: Async card rendering
- **Keyboard shortcuts**: Power user efficiency
- **Bulk operations**: Mass editing, export/import
- **Real-time sync**: Cross-device consistency

### Accessibility
- **Screen reader support**: Semantic HTML, ARIA labels
- **High contrast**: Visual accessibility options
- **Font customization**: Dyslexia-friendly fonts
- **Voice input**: Audio recording for pronunciation

## Trade-off Matrix

| Feature | Complexity | Effectiveness | Implementation |
|---------|------------|--------------|----------------|
| SM-2 Algorithm | Medium | High | Medium |
| Cloze Cards | Low | High | Low |
| Multi-choice | Low | Medium | Low |
| Audio/Video | High | Medium-High | High |
| Analytics | Medium | Medium | Medium |
| Gamification | Low | Medium | Medium |

## Recommendation

**Simple effective stack**: SM-2 algorithm + cloze/sentence cards + basic analytics

**Advanced option**: SM-2 + multimedia + detailed analytics + gamification

**Mobile priority**: Touch interactions, offline sync, micro-learnings

**Unresolved questions**: 
1. Integration difficulty with AI content generation
2. Optimal card density per text passage
3. Personalization algorithm parameters