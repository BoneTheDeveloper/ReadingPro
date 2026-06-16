import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";
import { db } from "./client";
import {
  SESSION_IDLE_MS,
  createStudySession,
  createStudySessionSchema,
  ensureActiveSession,
} from "./study-session-queries";

describe("study-session queries", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-21T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("validates session payload boundaries", () => {
    expect(() => createStudySessionSchema.parse({ userId: "" })).toThrow(ZodError);
  });

  it("creates sessions with study timestamps", async () => {
    await createStudySession("user-1");

    expect(db.studySession.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        startedAt: new Date("2026-05-21T12:00:00.000Z"),
        lastActivityAt: new Date("2026-05-21T12:00:00.000Z"),
      },
    });
  });

  it("serializes ensure-calls with a per-user advisory lock before the sweep", async () => {
    vi.mocked(db.studySession.findFirst).mockResolvedValue(null);

    await ensureActiveSession("user-1");

    const lockQuery = vi.mocked(db.$executeRaw).mock.calls[0]?.[0];
    expect(String(lockQuery)).toContain("pg_advisory_xact_lock");
    expect(vi.mocked(db.$executeRaw).mock.calls[0]?.slice(1)).toContain(
      "study_session:user-1",
    );
  });

  it("reuses the newest open session and refreshes lastActivityAt", async () => {
    vi.mocked(db.studySession.findFirst).mockResolvedValue({
      id: "session-1",
      userId: "user-1",
      startedAt: new Date("2026-05-21T11:30:00.000Z"),
      completedAt: null,
      lastActivityAt: new Date("2026-05-21T11:45:00.000Z"),
    });

    await ensureActiveSession("user-1");

    // advisory lock + stale sweep
    expect(db.$executeRaw).toHaveBeenCalledTimes(2);
    expect(db.studySession.findFirst).toHaveBeenCalledWith({
      where: { userId: "user-1", completedAt: null },
      orderBy: [
        { lastActivityAt: "desc" },
        { startedAt: "desc" },
      ],
    });
    expect(db.studySession.update).toHaveBeenCalledWith({
      where: { id: "session-1" },
      data: { lastActivityAt: new Date("2026-05-21T12:00:00.000Z") },
    });
  });

  it("creates a fresh session when none is open", async () => {
    vi.mocked(db.studySession.findFirst).mockResolvedValue(null);

    await ensureActiveSession("user-1");

    // advisory lock + stale sweep
    expect(db.$executeRaw).toHaveBeenCalledTimes(2);
    expect(db.studySession.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        startedAt: new Date("2026-05-21T12:00:00.000Z"),
        lastActivityAt: new Date("2026-05-21T12:00:00.000Z"),
      },
    });
  });

  it("sweeps stale sessions using the idle cutoff", async () => {
    vi.mocked(db.studySession.findFirst).mockResolvedValue(null);

    await ensureActiveSession("user-1");

    const sweepQuery = vi.mocked(db.$executeRaw).mock.calls[1]?.[0];
    expect(String(sweepQuery)).toContain('UPDATE "study_sessions"');
    expect(String(sweepQuery)).toContain('completedAt');
    expect(String(sweepQuery)).toContain('lastActivityAt');
    expect(Number(SESSION_IDLE_MS)).toBe(600000);
  });
});
