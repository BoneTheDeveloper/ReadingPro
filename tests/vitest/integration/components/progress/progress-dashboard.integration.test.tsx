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

  it("falls back to default stats after a fetch failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("network down");
    }));
    vi.spyOn(console, "error").mockImplementation(() => {});

    renderWithUser(<ProgressDashboard />);

    expect(await screen.findByText("Your Progress")).toBeInTheDocument();
    // In case of error, stats remains null and fallback values (?? 0) are used
    await waitFor(() => expect(screen.getAllByText("0 days")).toHaveLength(1));
    expect(screen.getAllByText("0m")).toHaveLength(2);
    expect(screen.getAllByText("0/7")).toHaveLength(1);
  });

  it("rejects malformed progress success payloads", async () => {
    mockProgressFetch({
      streakDays: "invalid",
    });

    renderWithUser(<ProgressDashboard />);

    expect(await screen.findByText("Your Progress")).toBeInTheDocument();
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
    expect(screen.getAllByText("0 days")).toHaveLength(1);
  });

  it("navigates from header and progress actions", async () => {
    mockProgressFetch({
      streakDays: 0,
      timeStudiedTodaySeconds: 0,
      timeStudiedWeekSeconds: 0,
      activeDaysThisWeek: 0,
    });
    const { user } = renderWithUser(<ProgressDashboard />);

    await screen.findByText("Your Progress");

    await user.click(screen.getByText("Start Studying"));
    expect(push).toHaveBeenLastCalledWith("/study");

    await user.click(screen.getByText("Back to Home"));
    expect(push).toHaveBeenLastCalledWith("/");

    expect(push).toHaveBeenCalledTimes(2);
  });
});
