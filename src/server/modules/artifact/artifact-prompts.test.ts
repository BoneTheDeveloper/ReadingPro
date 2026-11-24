import { describe, expect, it } from "vitest";
import { flashcardContentSchema, questionContentSchema } from "@/shared/studio/artifact";
import {
  flashcardGenerationOptionsSchema,
  questionGenerationOptionsSchema,
} from "@/shared/studio/generation-options";
import {
  buildFlashcardPrompt,
  buildQuestionPrompt,
  normalizeFlashcards,
  normalizeQuestions,
} from "./artifact-prompts";

const q = (over: Partial<Parameters<typeof normalizeQuestions>[0]["questions"][number]> = {}) => ({
  format: "MULTIPLE_CHOICE" as const,
  text: "Q?",
  options: ["a", "b", "c", "d"],
  correctIndex: 0,
  sourceText: "s",
  explanation: "e",
  ...over,
});

describe("question generation", () => {
  it("defaults reproduce the original fixed set: 5 multiple-choice questions", () => {
    const options = questionGenerationOptionsSchema.parse({});
    expect(options).toMatchObject({ count: 5, formats: ["MULTIPLE_CHOICE"], difficulty: "MEDIUM" });
    expect(buildQuestionPrompt("text", options, null).prompt).toContain("exactly 5 questions");
  });

  it("turns each option into an instruction", () => {
    const options = questionGenerationOptionsSchema.parse({
      count: 10,
      difficulty: "HARD",
      formats: ["FILL_BLANK", "TRUE_FALSE_NOT_GIVEN"],
      focus: ["VOCABULARY"],
      explanationLanguage: "VI",
    });
    const { instructions, prompt } = buildQuestionPrompt("text", options, "B1");
    expect(prompt).toContain("exactly 10 questions");
    expect(instructions).toContain("FILL_BLANK:");
    expect(instructions).toContain("TRUE_FALSE_NOT_GIVEN:");
    expect(instructions).not.toContain("MULTIPLE_CHOICE:");
    expect(instructions).toContain("HARD:");
    expect(instructions).toContain("meaning of a word or phrase");
    expect(instructions).toContain("in Vietnamese");
    expect(instructions).toContain("CEFR B1");
  });

  it("fixes True/False/Not Given options, drops broken and unrequested items, trims to count", () => {
    const options = questionGenerationOptionsSchema.parse({ count: 2, formats: ["MULTIPLE_CHOICE", "TRUE_FALSE_NOT_GIVEN"] });
    const out = normalizeQuestions(
      {
        questions: [
          q({ format: "TRUE_FALSE_NOT_GIVEN", options: ["yes", "no"], correctIndex: 2 }),
          q({ correctIndex: 7 }),
          q({ format: "FILL_BLANK" }),
          q(),
          q(),
        ],
      },
      options,
    );
    expect(out).toHaveLength(2);
    expect(out[0].options).toEqual(["True", "False", "Not Given"]);
    expect(out[0].correctIndex).toBe(2);
    expect(questionContentSchema.parse({ questions: out }).questions).toHaveLength(2);
  });

  it("still reads questions saved before formats existed", () => {
    const old = { questions: [{ text: "Q", options: ["a", "b", "c", "d"], correctIndex: 1, sourceText: "s", explanation: "e" }] };
    expect(questionContentSchema.parse(old).questions[0].format).toBe("MULTIPLE_CHOICE");
  });
});

describe("flashcard generation", () => {
  it("defaults reproduce the original 5-card deck", () => {
    const options = flashcardGenerationOptionsSchema.parse({});
    expect(options.count).toBe(5);
    expect(buildFlashcardPrompt("text", options, null).prompt).toContain("exactly 5 flashcards");
  });

  it("dedupes fronts, keeps examples only when asked, and trims to count", () => {
    const cards = [
      { front: "Run", back: "chạy", example: "I run." },
      { front: "run ", back: "chạy", example: "" },
      { front: "walk", back: "đi bộ", example: "We walk." },
      { front: "swim", back: "bơi", example: "" },
    ];
    const without = normalizeFlashcards({ cards }, flashcardGenerationOptionsSchema.parse({ count: 2 }));
    expect(without.map((c) => c.front)).toEqual(["Run", "walk"]);
    expect(without.every((c) => c.example === null)).toBe(true);

    const withEx = normalizeFlashcards({ cards }, flashcardGenerationOptionsSchema.parse({ count: 3, withExample: true }));
    expect(withEx.map((c) => c.example)).toEqual(["I run.", "We walk.", null]);
    expect(flashcardContentSchema.parse({ cards: withEx }).cards).toHaveLength(3);
  });

  it("still reads 5-card decks saved without examples", () => {
    const old = { cards: Array.from({ length: 5 }, (_, i) => ({ front: `f${i}`, back: `b${i}` })) };
    expect(flashcardContentSchema.parse(old).cards).toHaveLength(5);
  });
});
