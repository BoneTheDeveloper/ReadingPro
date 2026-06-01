import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { simplifyContent } from "@/lib/ai/content-simplifier";
import { cn } from "@/lib/shared/utils";
import { db } from "../mocks/db";
import { createJsonRequest } from "../helpers/api";
import { resetAllDbMocks } from "../helpers/db";
import { mockGenerateObjectOnce } from "../mocks/ai";

describe("test infrastructure", () => {
  it("resolves @ path aliases", () => {
    expect(cn("base", false && "hidden", "active")).toBe("base active");
  });

  it("loads jest-dom matchers in jsdom", () => {
    render(<button type="button">Start reading</button>);

    expect(screen.getByRole("button", { name: "Start reading" })).toBeInTheDocument();
  });

  it("resets DB mocks between tests", async () => {
    db.passage.findMany.mockResolvedValueOnce([{ id: "passage_1" }]);

    await expect(db.passage.findMany()).resolves.toEqual([{ id: "passage_1" }]);

    resetAllDbMocks();

    expect(db.passage.findMany).not.toHaveBeenCalled();
    expect(db.passage.findMany()).toBeUndefined();
  });

  it("returns deterministic AI generated content", async () => {
    mockGenerateObjectOnce({
      simplifiedText: "This is simpler.",
      changes: ["Shortened the sentence."],
      retainedKeyTerms: ["simpler"],
    });

    await expect(simplifyContent("This sentence should be easier.", "A2")).resolves.toEqual({
      simplifiedText: "This is simpler.",
      changes: ["Shortened the sentence."],
      retainedKeyTerms: ["simpler"],
    });
  });

  it("builds JSON requests for route handler tests", async () => {
    const request = createJsonRequest({ passageId: "passage_1" });

    await expect(request.json()).resolves.toEqual({ passageId: "passage_1" });
    expect(request.method).toBe("POST");
    expect(request.headers.get("content-type")).toBe("application/json");
  });
});
