# Project Overview PDR

## Product

English Reading Training App is an AI-assisted reading trainer for English learners. A learner uploads or pastes English content, studies the passage in a guided workspace, translates selected text, asks passage-grounded study questions, and reviews generated cards through spaced repetition.

## Users

The product targets a single user: the **independent learner**.

| User | Need |
|------|------|
| Independent learner | Read self-chosen English content to learn new English (vocabulary, language, usage) and to understand the given passage more deeply, with level-appropriate support and retention tracking. |


## Problem

Reading apps and vocabulary-learning apps exist separately and do not reinforce each other. Reading tools help a learner get through a passage but drop the new words once the page is closed. Flashcard apps drill words in isolation, stripped of the context where the learner first met them.

So the learner has no single flow that connects the two. New words stay tied to nothing, which makes them hard to remember. The learner needs each new word to keep the context of the passage it came from, so it can be reinforced twice — once while reading, and again through a spaced-repetition card-set loop — instead of being memorized as a context-free entry.

## Solution

The app joins reading and vocabulary learning into one flow, so a word the learner meets while reading carries its passage context all the way into spaced-repetition review.

**1. Bring any passage.** The learner starts from a variety of sources — pasted text, a PDF, a YouTube link, a web link or even a paper passaege through the OCR — and turns it into a study passage.

**2. Check understanding.** The app generates comprehension questions and flashcards so the learner can quickly confirm how well they understood the passage.

**3. Go deeper through chat.** A passage-grounded chat lets the learner dig into the content — not only to study, but to research and pull more information about what the passage covers.

**4. Capture words.** Inline translation and an in-app dictionary — available both inside the study page and on a dedicated standalone page — let the learner get the meaning of any word efficiently and store chosen words, with their passage context, into a word bank.

**5. Memorize them.** From the word bank the learner builds word sets, manually or automatically, and memorizes them through spaced repetition.

The loop closes when saved words keep the context of the passage they came from, reinforcing them once in the reading and again in the card-set review.

## Goal

Connect reading and vocabulary learning so that words learned in context are retained measurably better than context-free flashcard drilling.

## Success Metrics

| ID | Metric | Target |
|----|--------|--------|
| M1 | Word retention — reviewed words recalled correctly at a 7-day interval | ≥ X% |
| M2 | Engagement — learner returns to review on at least X days per week | ≥ X days/week |
| M3 | Flow completion — studied passages that produce at least one saved word set | ≥ X% |

Targets (X) are placeholders to be set once a baseline is measured.

## References

- Use cases: [../Requirements/use-cases.md](../Requirements/use-cases.md)
- Feature scope: [feature-scope.md](feature-scope.md)
- System architecture: [../Architecture/system-architecture.md](../Architecture/system-architecture.md)
- Roadmap: [roadmap.md](roadmap.md)

**Status:** Active
**Last Updated:** 2026-06-06
