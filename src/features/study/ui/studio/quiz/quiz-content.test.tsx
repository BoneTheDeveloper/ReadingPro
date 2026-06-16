import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { QuestionData } from "@/features/study/model/types";
import { QuizContent } from "./quiz-content";

function makeQuestion(overrides: Partial<QuestionData> = {}): QuestionData {
  return {
    id: "q1",
    number: 1,
    questionText: "What is the main idea?",
    options: [
      { id: "a", text: "Alpha" },
      { id: "b", text: "Bravo" },
      { id: "c", text: "Charlie" },
      { id: "d", text: "Delta" },
    ],
    correctAnswer: "a",
    explanation: "Alpha is correct.",
    sourceText: "The passage opens with Alpha.",
    sourceLine: 3,
    questionType: "main_idea",
    difficulty: 2,
    ...overrides,
  };
}

function renderQuiz(questions: QuestionData[]) {
  return render(
    <QuizContent
      questions={questions}
      passageTitle="Sample"
      artifactId="artifact-1"
      onReset={vi.fn()}
      onRecordResult={vi.fn()}
      onResetResult={vi.fn()}
    />,
  );
}

describe("QuizContent", () => {
  it("selects an option with number keys, checks with Enter, and shows the source quote", async () => {
    const user = userEvent.setup();
    renderQuiz([makeQuestion()]);

    // Key "1" selects the first option, Enter checks the answer.
    await user.keyboard("1");
    await user.keyboard("{Enter}");

    expect(screen.getByText("Correct!")).toBeInTheDocument();
    expect(screen.getByText("Alpha is correct.")).toBeInTheDocument();
    // Source quote renders after answering.
    expect(screen.getByText(/The passage opens with Alpha\./)).toBeInTheDocument();
  });

  it("advances with Enter and goes back with Backspace", async () => {
    const user = userEvent.setup();
    renderQuiz([
      makeQuestion({ id: "q1", questionText: "First question" }),
      makeQuestion({ id: "q2", questionText: "Second question", correctAnswer: "b" }),
    ]);

    expect(screen.getByText("First question")).toBeInTheDocument();

    await user.keyboard("1");
    await user.keyboard("{Enter}"); // check
    await user.keyboard("{Enter}"); // advance to question 2
    expect(screen.getByText("Second question")).toBeInTheDocument();

    await user.keyboard("2");
    await user.keyboard("{Enter}"); // check question 2 -> feedback shown
    await user.keyboard("{Backspace}"); // back to question 1
    expect(screen.getByText("First question")).toBeInTheDocument();
  });

  it("records the result and shows the results screen after the last question", async () => {
    const user = userEvent.setup();
    const onRecordResult = vi.fn();
    render(
      <QuizContent
        questions={[makeQuestion()]}
        passageTitle="Sample"
        artifactId="artifact-1"
        onReset={vi.fn()}
        onRecordResult={onRecordResult}
        onResetResult={vi.fn()}
      />,
    );

    await user.keyboard("1"); // correct
    await user.keyboard("{Enter}"); // check
    await user.keyboard("{Enter}"); // finish -> results

    expect(await screen.findByText("Test complete")).toBeInTheDocument();
  });
});
