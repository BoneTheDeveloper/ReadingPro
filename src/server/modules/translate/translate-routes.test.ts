import { describe, expect, it } from "vitest";
import app from "@/server/app";

const body = JSON.stringify({ word: "run", context: "I run every day." });

describe("POST /api/translate", () => {
  it("needs a session", async () => {
    const res = await app.request("/api/translate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });

    expect(res.status).toBe(401);
    expect((await res.json()).error.reason).toBe("auth.required");
  });
});
