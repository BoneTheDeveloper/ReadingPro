import { screen } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReadingViewClient } from "@/features/reading/reading-view-client";
import { createReadingPassage } from "../../../fixtures";
import { renderWithUser } from "../../../helpers";

const push = vi.fn();

describe("ReadingViewClient", () => {
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

  it("renders metadata and defaults to simplified content when available", () => {
    renderWithUser(<ReadingViewClient passage={createReadingPassage()} />);

    expect(screen.getAllByText("The Test Passage")[0]).toBeInTheDocument();
    expect(screen.getByText("160 words")).toBeInTheDocument();
    expect(screen.getByText("1 comprehension question available")).toBeInTheDocument();
    expect(screen.getByText("Simplified paragraph for learners.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Original (B2)" })).toBeInTheDocument();
  });

  it("switches between simplified and original reading modes", async () => {
    const { user } = renderWithUser(<ReadingViewClient passage={createReadingPassage()} />);

    await user.click(screen.getByRole("button", { name: "Original (B2)" }));
    expect(screen.getByText("Original paragraph one.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Simplified (A2)" }));
    expect(screen.getByText("Simplified paragraph for learners.")).toBeInTheDocument();
  });

  it("uses original content and hides test actions when simplified content and questions are absent", () => {
    renderWithUser(
      <ReadingViewClient
        passage={createReadingPassage({
          simplifiedContent: null,
          questionCount: 0,
          displayLevel: "B2",
        })}
      />,
    );

    expect(screen.getByText("Original paragraph one.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Simplified/ })).not.toBeInTheDocument();
    expect(screen.getByText("0 comprehension questions available")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Take the Test" })).not.toBeInTheDocument();
  });

  it("navigates back and to the test view", async () => {
    const { user } = renderWithUser(<ReadingViewClient passage={createReadingPassage({ id: "passage-abc" })} />);

    await user.click(screen.getByRole("button", { name: "Start Test" }));
    expect(push).toHaveBeenLastCalledWith("/test/passage-abc");

    await user.click(screen.getByRole("button", { name: "Take the Test" }));
    expect(push).toHaveBeenLastCalledWith("/test/passage-abc");

    await user.click(screen.getByRole("button", { name: "Back to passages" }));
    expect(push).toHaveBeenLastCalledWith("/");
    expect(push).toHaveBeenCalledTimes(3);
  });
});
