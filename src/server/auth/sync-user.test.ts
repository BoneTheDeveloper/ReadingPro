import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db/client";
import { userProfileFixture } from "@tests/vitest/fixtures/user";

// Clerk must never be called from ensureUserProfile — no import needed, but guard via mock
const clerkMocks = vi.hoisted(() => ({
  clerkClient: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: clerkMocks.clerkClient,
}));

// Spy-able logger so we can assert the heal-path warning fires only on retry.
const logMocks = vi.hoisted(() => ({
  warn: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}));

vi.mock("@/server/observability/logger", () => ({
  createModuleLogger: () => logMocks,
}));

import { ensureUserProfile, isMissingUserProfileFk, withUserProfile } from "./sync-user";

// Builds a genuine PrismaClientKnownRequestError carrying the EXACT meta shape
// captured live from Prisma 7.8 + @prisma/adapter-pg against the Neon database
// (a `userId` FK violation on study_sessions). Do not "simplify" this shape —
// it is the real payload the matcher must handle.
function p2003(constraintIndex: string) {
  return new Prisma.PrismaClientKnownRequestError(
    `Foreign key constraint violated on the constraint: \`${constraintIndex}\``,
    {
      code: "P2003",
      clientVersion: "7.8.0",
      meta: {
        modelName: "StudySession",
        driverAdapterError: {
          name: "DriverAdapterError",
          cause: {
            originalCode: "23503",
            originalMessage: `insert or update violates foreign key constraint "${constraintIndex}"`,
            kind: "ForeignKeyConstraintViolation",
            constraint: { index: constraintIndex },
          },
        },
      },
    },
  );
}

describe("ensureUserProfile", () => {
  beforeEach(() => {
    clerkMocks.clerkClient.mockReset();
  });

  it("upserts a minimal row with create:{id} and update:{} (no-op on existing)", async () => {
    vi.mocked(db.userProfile.upsert).mockResolvedValue(userProfileFixture);

    await ensureUserProfile(userProfileFixture.id);

    expect(db.userProfile.upsert).toHaveBeenCalledOnce();
    expect(db.userProfile.upsert).toHaveBeenCalledWith({
      where: { id: userProfileFixture.id },
      update: {},
      create: { id: userProfileFixture.id },
    });
  });

  it("is idempotent: calling twice does not throw", async () => {
    vi.mocked(db.userProfile.upsert).mockResolvedValue(userProfileFixture);

    await expect(ensureUserProfile(userProfileFixture.id)).resolves.toBeUndefined();
    await expect(ensureUserProfile(userProfileFixture.id)).resolves.toBeUndefined();
    expect(db.userProfile.upsert).toHaveBeenCalledTimes(2);
  });

  it("never calls clerkClient", async () => {
    vi.mocked(db.userProfile.upsert).mockResolvedValue(userProfileFixture);

    await ensureUserProfile(userProfileFixture.id);

    expect(clerkMocks.clerkClient).not.toHaveBeenCalled();
  });
});

describe("isMissingUserProfileFk", () => {
  // HARD GATE: matcher must recognize the real captured payload. If this fails,
  // the new-user race is not healed and first writes 500.
  it("matches a real P2003 userId-FK payload", () => {
    expect(isMissingUserProfileFk(p2003("study_sessions_userId_fkey"))).toBe(true);
  });

  it("does NOT match a non-userId FK (e.g. sourceId) — real bug must propagate", () => {
    expect(isMissingUserProfileFk(p2003("translation_caches_sourceId_fkey"))).toBe(false);
  });

  it("does NOT match other Prisma error codes", () => {
    const p2002 = new Prisma.PrismaClientKnownRequestError("unique", {
      code: "P2002",
      clientVersion: "7.8.0",
      meta: {},
    });
    expect(isMissingUserProfileFk(p2002)).toBe(false);
  });

  it("does NOT match non-Prisma errors", () => {
    expect(isMissingUserProfileFk(new Error("boom"))).toBe(false);
    expect(isMissingUserProfileFk(undefined)).toBe(false);
  });
});

describe("withUserProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("happy path: returns write() result with no ensure and no warning", async () => {
    const write = vi.fn().mockResolvedValue("ok");

    const result = await withUserProfile(userProfileFixture.id, write);

    expect(result).toBe("ok");
    expect(write).toHaveBeenCalledOnce();
    expect(db.userProfile.upsert).not.toHaveBeenCalled();
    expect(logMocks.warn).not.toHaveBeenCalled();
  });

  it("race path: on userId-FK miss, ensures profile, retries once, warns", async () => {
    vi.mocked(db.userProfile.upsert).mockResolvedValue(userProfileFixture);
    const write = vi
      .fn()
      .mockRejectedValueOnce(p2003("study_sessions_userId_fkey"))
      .mockResolvedValueOnce("ok-after-retry");

    const result = await withUserProfile(userProfileFixture.id, write);

    expect(result).toBe("ok-after-retry");
    expect(write).toHaveBeenCalledTimes(2);
    expect(db.userProfile.upsert).toHaveBeenCalledOnce();
    expect(logMocks.warn).toHaveBeenCalledOnce();
  });

  it("propagates a non-userId FK without ensuring or retrying", async () => {
    const err = p2003("translation_caches_sourceId_fkey");
    const write = vi.fn().mockRejectedValue(err);

    await expect(withUserProfile(userProfileFixture.id, write)).rejects.toBe(err);
    expect(write).toHaveBeenCalledOnce();
    expect(db.userProfile.upsert).not.toHaveBeenCalled();
    expect(logMocks.warn).not.toHaveBeenCalled();
  });

  it("propagates a non-Prisma error without ensuring or retrying", async () => {
    const err = new Error("network down");
    const write = vi.fn().mockRejectedValue(err);

    await expect(withUserProfile(userProfileFixture.id, write)).rejects.toBe(err);
    expect(write).toHaveBeenCalledOnce();
    expect(db.userProfile.upsert).not.toHaveBeenCalled();
  });
});
