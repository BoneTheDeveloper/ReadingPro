import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TextInputArea } from "@/features/upload/text-input-area";
import { renderWithUser } from "../../../helpers";

const validText =
  "This is a long enough English text sample for the upload flow, with enough detail to pass validation.";

describe("TextInputArea", () => {
  it("renders an empty paste area with disabled submit", () => {
    renderWithUser(<TextInputArea onSubmit={vi.fn()} />);

    expect(screen.getByText("Paste your text")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Paste your English text content here...")).toBeEnabled();
    expect(screen.getByText("0 words")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  it("updates the word count and submits valid text", async () => {
    const onSubmit = vi.fn();
    const { user } = renderWithUser(<TextInputArea onSubmit={onSubmit} />);

    await user.type(screen.getByPlaceholderText("Paste your English text content here..."), validText);
    expect(screen.getByText("18 words")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(onSubmit).toHaveBeenCalledWith(validText);
    expect(screen.queryByText(/too short/i)).not.toBeInTheDocument();
  });

  it("shows validation errors and clears them when the user edits", async () => {
    const { user } = renderWithUser(<TextInputArea onSubmit={vi.fn()} />);
    const textarea = screen.getByPlaceholderText("Paste your English text content here...");

    await user.type(textarea, "Too short.");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByText("Text is too short (minimum 50 characters)")).toBeInTheDocument();

    await user.type(textarea, " This edit clears the displayed validation error.");

    expect(screen.queryByText("Text is too short (minimum 50 characters)")).not.toBeInTheDocument();
  });

  it("disables input and shows processing state while work is running", () => {
    renderWithUser(<TextInputArea onSubmit={vi.fn()} isProcessing />);

    expect(screen.getByPlaceholderText("Paste your English text content here...")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Processing..." })).toBeDisabled();
  });
});
