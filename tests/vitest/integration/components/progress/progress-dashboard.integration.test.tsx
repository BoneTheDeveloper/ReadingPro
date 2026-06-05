import { waitFor, screen } from "@testing-library/react";
import * as Sentry from "@sentry/nextjs";
import { useRouter } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProgressDashboard } from "@/features/progress/progress-dashboard";
import { renderWithUser } from "../../../helpers";

const push = vi.fn();

function mockProgressFetch(data: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      json: async () => ({ success: true, data }),
    })),
  );
}

describe("ProgressDashboard", () => {
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

  it("loads and renders progress stats with a due-review CTA", async () => {
    mockProgressFetch({
      totalCards: 12,
      dueCards: 3,
      matureCards: 5,
      todayReviews: 4,
    });

    renderWithUser(<ProgressDashboard />);

    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
    expect(await screen.findByText("Your Progress")).toBeInTheDocument();
    expect(screen.getByText("Total Cards")).toBeInTheDocument();
    expect(screen.getByText("Due for Review")).toBeInTheDocument();
    expect(screen.getByText("Mature Cards")).toBeInTheDocument();
    expect(screen.getByText("Today's Reviews")).toBeInTheDocument();
    expect(screen.getByText("3 cards due for review")).toBeInTheDocument();
    expect(screen.getAllByText("12")[0]).toBeInTheDocument();
  });

  it("renders the caught-up branch when no cards are due", async () => {
    mockProgressFetch({
      totalCards: 2,
      dueCards: 0,
      matureCards: 2,
      todayReviews: 1,
    });

    renderWithUser(<ProgressDashboard />);

    expect(await screen.findByText("All caught up!")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start Review" })).not.toBeInTheDocument();
  });

  it("falls back to zero stats after a fetch failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("network down");
    }));
    vi.spyOn(console, "error").mockImplementation(() => {});

    renderWithUser(<ProgressDashboard />);

    expect(await screen.findByText("All caught up!")).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText("0")).toHaveLength(4));
  });

  it("rejects malformed progress success payloads", async () => {
    mockProgressFetch({
      totalCards: 12,
      dueToday: 3,
      reviewedToday: 4,
    });

    renderWithUser(<ProgressDashboard />);

    expect(await screen.findByText("All caught up!")).toBeInTheDocument();
    await waitFor(() => {
      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "progress",
          level: "error",
          message: "progress-stats-schema-error",
          data: { route: "/api/progress/stats" },
        }),
      );
    });
    expect(screen.getAllByText("0")).toHaveLength(4);
  });

  it("navigates from header and progress actions", async () => {
    mockProgressFetch({
      totalCards: 12,
      dueCards: 2,
      matureCards: 5,
      todayReviews: 4,
    });
    const { user } = renderWithUser(<ProgressDashboard />);

    await screen.findByText("Your Progress");
    await user.click(screen.getByRole("button", { name: "Start Review" }));
    expect(push).toHaveBeenLastCalledWith("/study");

    await user.click(screen.getByText("Add New Content"));
    expect(push).toHaveBeenLastCalledWith("/study");

    await user.click(screen.getByText("Back to Home"));
    expect(push).toHaveBeenLastCalledWith("/");

    expect(push).toHaveBeenCalledTimes(3);
  });
});
