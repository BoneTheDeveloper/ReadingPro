import { screen } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FlashcardTestClient } from "@/features/test/flashcard-test-client";
import { createTestPassage, createTestQuestion } from "../../fixtures";
import { renderWithUser } from "../../helpers";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

const push = vi.fn();

describe("FlashcardTestClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({
      back: vi.fn(),
      forward: vi.fn(),
      prefetch: vi.fn(),
      push,
      refresh: vi.fn(),
      replace: vi.fn(),
    });
  });

  it("answers with clicks, shows feedback, highlights source, and completes results", async () => {
    const passage = createTestPassage();
    const questions = [
      createTestQuestion(),
      createTestQuestion({
        id: "question-2",
        number: 2,
        questionText: "What should tests avoid?",
        correctAnswer: "B",
        explanation: "Live service calls make tests brittle.",
        sourceText: "They call live services.",
        sourceLine: 1,
      }),
    ];
    const { user } = renderWithUser(<FlashcardTestClient passage={passage} questions={questions} />);

    expect(screen.getByText("1 of 2")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /They make tests predictable/ }));
    await user.click(screen.getByRole("button", { name: "Check Answer" }));

    expect(screen.getByText("Correct!")).toBeInTheDocument();
    expect(screen.getAllByText("1").length).toBeGreaterThan(0);
    expect(screen.getByText(/fixtures are predictable/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Next Question/ }));
    expect(screen.getByText("2 of 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check Answer" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /They make tests predictable/ }));
    await user.click(screen.getByRole("button", { name: "Check Answer" }));
    expect(screen.getByText("Not quite right")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "View Results" }));

    expect(screen.getByText("Reading complete")).toBeInTheDocument();
    expect(screen.getAllByText("1")).toHaveLength(2);
    expect(screen.getByText((_, element) => element?.textContent === "Keep practicing! 50% accuracy")).toBeInTheDocument();
  });

  it("supports keyboard shortcuts for options and advancing", async () => {
    const { user } = renderWithUser(
      <FlashcardTestClient passage={createTestPassage()} questions={[createTestQuestion()]} />,
    );

    await user.keyboard("1");
    await user.keyboard("{Enter}");

    expect(screen.getByText("Correct!")).toBeInTheDocument();

    await user.keyboard("{Enter}");
    expect(screen.getByText("Reading complete")).toBeInTheDocument();
  });

  it("toggles the passage on small-layout control and navigates from result actions", async () => {
    const passage = createTestPassage({ id: "reading-test-id" });
    const { user } = renderWithUser(
      <FlashcardTestClient passage={passage} questions={[createTestQuestion()]} />,
    );

    await user.click(screen.getByRole("button", { name: "Show Passage" }));
    expect(screen.getByText("Line one introduces the topic.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /They make tests predictable/ }));
    await user.click(screen.getByRole("button", { name: "Check Answer" }));
    await user.click(screen.getByRole("button", { name: "View Results" }));
    await user.click(screen.getByRole("button", { name: "Review Reading" }));
    await user.click(screen.getByRole("button", { name: "New Passage" }));

    expect(push).toHaveBeenCalledWith("/reading/reading-test-id");
    expect(push).toHaveBeenCalledWith("/upload");
  });
});
