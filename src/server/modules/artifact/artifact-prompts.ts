import { z } from "zod";
import type { CEFRLevel } from "@/shared/enums";
import {
  QuestionFormat,
  type Difficulty,
  type FlashcardGenerationOptions,
  type QuestionFocus,
  type QuestionGenerationOptions,
} from "@/shared/studio/generation-options";

/**
 * Prompt building for Studio artifacts. Each generation option maps to one
 * explicit instruction, so a change in the UI is a change in one line here.
 */

export const TRUE_FALSE_NOT_GIVEN_OPTIONS = ["True", "False", "Not Given"] as const;

// ─── Output schemas sent to the model ──────────────────────────────
// Every field is required: structured-output models handle optional fields poorly.

export const questionOutputSchema = z.object({
  questions: z.array(
    z.object({
      format: z.enum(QuestionFormat),
      text: z.string().describe("The question, or for FILL_BLANK a sentence containing exactly one ____ gap."),
      options: z.array(z.string()).describe("4 options for MULTIPLE_CHOICE and FILL_BLANK; True, False, Not Given for TRUE_FALSE_NOT_GIVEN."),
      correctIndex: z.number().int().describe("0-based index of the correct option."),
      sourceText: z.string().describe("The exact sentence from the passage that supports the answer."),
      explanation: z.string().describe("Why the correct answer is right, in 1-2 sentences."),
    }),
  ),
});

export const flashcardOutputSchema = z.object({
  cards: z.array(
    z.object({
      front: z.string(),
      back: z.string(),
      example: z.string().describe("An example sentence using the front, or an empty string when examples are off."),
    }),
  ),
});

// ─── Shared fragments ──────────────────────────────────────────────

const DIFFICULTY_QUESTIONS: Record<Difficulty, string> = {
  EASY: "EASY: answers are stated directly in one sentence; distractors are clearly wrong; plain wording.",
  MEDIUM: "MEDIUM: mix direct and lightly paraphrased answers; distractors are plausible.",
  HARD: "HARD: answers need paraphrase recognition or combining sentences; distractors are close and tempting but still provably wrong.",
};

const DIFFICULTY_CARDS: Record<Difficulty, string> = {
  EASY: "EASY: pick common, high-frequency items a learner meets often.",
  MEDIUM: "MEDIUM: pick useful items around the passage's own level.",
  HARD: "HARD: pick less common, advanced or nuanced items above the passage's level.",
};

const FOCUS: Record<QuestionFocus, string> = {
  MAIN_IDEA: "main idea and purpose of paragraphs or the whole passage",
  DETAIL: "specific facts and details",
  INFERENCE: "inference: what the text implies but does not state",
  VOCABULARY: "meaning of a word or phrase in its context",
};

const FORMAT_RULES: Record<QuestionFormat, string> = {
  MULTIPLE_CHOICE: "MULTIPLE_CHOICE: a question with exactly 4 options, one correct.",
  TRUE_FALSE_NOT_GIVEN:
    'TRUE_FALSE_NOT_GIVEN: a statement about the passage; options are exactly ["True", "False", "Not Given"]. Use "Not Given" only when the passage truly says nothing about it.',
  FILL_BLANK:
    "FILL_BLANK: a sentence taken or adapted from the passage with one key word replaced by ____; exactly 4 single-word or short-phrase options of the same part of speech, one correct.",
};

function levelLine(cefrLevel: CEFRLevel | null) {
  return cefrLevel ? `The passage is CEFR ${cefrLevel}; keep question language at or below that level.` : "";
}

// ─── Questions ─────────────────────────────────────────────────────

export function buildQuestionPrompt(passage: string, options: QuestionGenerationOptions, cefrLevel: CEFRLevel | null) {
  const instructions = [
    "You are an expert English reading teacher writing comprehension questions for language learners.",
    "Questions test understanding, not memory, and must be answerable from the passage alone.",
    "Spread questions across different parts of the passage. Never repeat a question.",
    "",
    "Formats to use (distribute roughly evenly across these, in any order):",
    ...options.formats.map((f) => `- ${FORMAT_RULES[f]}`),
    "",
    `Difficulty — ${DIFFICULTY_QUESTIONS[options.difficulty]}`,
    options.focus.length
      ? `Focus the questions on: ${options.focus.map((f) => FOCUS[f]).join("; ")}.`
      : "Cover a balanced mix of main idea, detail and inference.",
    options.explanationLanguage === "VI"
      ? "Write every explanation in Vietnamese. Questions and options stay in English."
      : "Write every explanation in English.",
    levelLine(cefrLevel),
  ]
    .filter((line) => line !== null)
    .join("\n");

  const prompt = `Write exactly ${options.count} questions for this passage:\n\n${passage}`;
  return { instructions, prompt };
}

/** Repairs what the model commonly gets wrong, then trims to the requested count. */
export function normalizeQuestions(
  output: z.infer<typeof questionOutputSchema>,
  options: QuestionGenerationOptions,
) {
  return output.questions
    .filter((q) => options.formats.includes(q.format))
    .map((q) =>
      q.format === QuestionFormat.TRUE_FALSE_NOT_GIVEN ? { ...q, options: [...TRUE_FALSE_NOT_GIVEN_OPTIONS] } : q,
    )
    .filter((q) => q.options.length >= 2 && q.options.length <= 4 && q.correctIndex >= 0 && q.correctIndex < q.options.length)
    .slice(0, options.count);
}

// ─── Flashcards ────────────────────────────────────────────────────

const CONTENT_TYPE: Record<FlashcardGenerationOptions["contentType"], string> = {
  VOCABULARY: "single words from the passage worth learning. Front: the word in its base form.",
  PHRASE: "multi-word phrases, collocations, phrasal verbs or idioms from the passage. Front: the phrase.",
  CONCEPT: "key ideas, facts or terms the passage explains. Front: a short question or term.",
};

const BACK: Record<FlashcardGenerationOptions["back"], string> = {
  VI_MEANING: "Back: the Vietnamese meaning as used in this passage, short (max ~12 words).",
  EN_DEFINITION: "Back: a simple English definition or answer a learner can understand, short (max ~20 words).",
};

export function buildFlashcardPrompt(passage: string, options: FlashcardGenerationOptions, cefrLevel: CEFRLevel | null) {
  const instructions = [
    "You are an expert English teacher making flashcards for language learners.",
    `Cards cover ${CONTENT_TYPE[options.contentType]}`,
    BACK[options.back],
    options.withExample
      ? 'example: one natural English sentence using the front; prefer the sentence from the passage.'
      : 'example: always an empty string "".',
    `Difficulty — ${DIFFICULTY_CARDS[options.difficulty]}`,
    "Every card is distinct; never repeat the same item.",
    levelLine(cefrLevel),
  ].join("\n");

  const prompt = `Make exactly ${options.count} flashcards from this passage:\n\n${passage}`;
  return { instructions, prompt };
}

export function normalizeFlashcards(
  output: z.infer<typeof flashcardOutputSchema>,
  options: FlashcardGenerationOptions,
) {
  const seen = new Set<string>();
  return output.cards
    .filter((c) => {
      const key = c.front.trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((c) => ({ front: c.front, back: c.back, example: options.withExample && c.example.trim() ? c.example : null }))
    .slice(0, options.count);
}
