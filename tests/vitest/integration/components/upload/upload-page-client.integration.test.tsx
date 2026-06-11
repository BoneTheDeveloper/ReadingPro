import { screen, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UploadPageClient } from "@/features/upload/ui/upload-page-client";
import { renderWithUser } from "../../../helpers";

const push = vi.fn();

vi.mock("@/features/upload/ui/upload-zone", () => ({
  UploadZone: ({ onFileSelect }: { onFileSelect: (file: File) => void }) => (
    <button type="button" onClick={() => onFileSelect(new File(["content"], "story.txt", { type: "text/plain" }))}>
      Mock file upload
    </button>
  ),
}));

vi.mock("@/features/upload/ui/text-input-area", () => ({
  TextInputArea: ({ onSubmit }: { onSubmit: (text: string) => void }) => (
    <button type="button" onClick={() => onSubmit("This is a sufficiently long text passage for upload testing.")}>
      Mock text submit
    </button>
  ),
}));

describe("UploadPageClient response contracts", () => {
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
    vi.spyOn(window, "alert").mockImplementation(() => {});
  });

  it("rejects malformed file upload success payloads", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ success: true, data: { passageId: "missing-fields" } }), {
          status: 200,
        }),
      ),
    );
    const { user } = renderWithUser(<UploadPageClient />);

    await user.click(screen.getByRole("button", { name: "Mock file upload" }));

    await waitFor(() => {
      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "upload",
          level: "error",
          message: "upload-file-schema-error",
          data: { route: "/api/upload" },
        }),
      );
      expect(window.alert).toHaveBeenCalledWith("Upload failed");
    });
    expect(push).not.toHaveBeenCalled();
  });

  it("rejects malformed text upload success payloads", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ success: true, data: { passageId: "missing-fields" } }), {
          status: 200,
        }),
      ),
    );
    const { user } = renderWithUser(<UploadPageClient />);

    await user.click(screen.getByRole("button", { name: "Paste Text" }));
    await user.click(screen.getByRole("button", { name: "Mock text submit" }));

    await waitFor(() => {
      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "upload",
          level: "error",
          message: "upload-text-schema-error",
          data: { route: "/api/upload/text" },
        }),
      );
      expect(window.alert).toHaveBeenCalledWith("Processing failed");
    });
    expect(push).not.toHaveBeenCalled();
  });
});
