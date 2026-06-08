import { describe, expect, it, afterEach, vi } from "vitest";
import { GET as getHealth } from "@/app/api/health/route";
import { readJsonResponse } from "../../helpers/api";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/health environment contract", () => {
  it("returns only stable deployment metadata", async () => {
    vi.stubEnv("APP_COMMIT_SHA", "app_commit_123");
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "vercel_commit_456");

    const response = getHealth();
    const payload = await readJsonResponse(response);

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      success: true,
      data: {
        status: "ok",
        commitSha: "app_commit_123",
      },
    });
  });

  it("does not expose runtime secrets or deployment-only env values", async () => {
    vi.stubEnv("CLERK_SECRET_KEY", "sk_test_secret");
    vi.stubEnv("DATABASE_URL", "postgresql://runtime-secret");
    vi.stubEnv("DIRECT_URL", "postgresql://migration-secret");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "vercel_blob_rw_secret");
    vi.stubEnv("SENTRY_AUTH_TOKEN", "sentry_secret");
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://public-dsn.example/1");
    vi.stubEnv("APP_COMMIT_SHA", "public_commit");

    const response = getHealth();
    const payload = await readJsonResponse(response);
    const serialized = JSON.stringify(payload);

    expect(response.status).toBe(200);
    expect(serialized).toContain("public_commit");
    expect(serialized).not.toContain("sk_test_secret");
    expect(serialized).not.toContain("postgresql://runtime-secret");
    expect(serialized).not.toContain("postgresql://migration-secret");
    expect(serialized).not.toContain("vercel_blob_rw_secret");
    expect(serialized).not.toContain("sentry_secret");
    expect(serialized).not.toContain("https://public-dsn.example/1");
  });
});
