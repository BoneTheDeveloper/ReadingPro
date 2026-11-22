import { describe, expect, it } from "vitest";
import app from "@/server/app";
import { AppError } from "@/server/lib/errors";
import { assertPro } from "@/server/middleware/require-pro";

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

describe("assertPro", () => {
  it("rejects a Free user with plan.pro_required and lets a Pro user through", () => {
    const rejected = (() => {
      try {
        assertPro({ tier: "FREE" });
      } catch (error) {
        return error;
      }
    })();

    expect(rejected).toBeInstanceOf(AppError);
    expect((rejected as AppError).reason).toBe("plan.pro_required");
    expect((rejected as AppError).status).toBe(403);
    expect(() => assertPro({ tier: null })).toThrow(AppError);
    expect(() => assertPro({ tier: "PRO" })).not.toThrow();
  });
});
