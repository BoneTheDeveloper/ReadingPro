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
        lastSeenAt: new Date("2026-05-21T12:00:00.000Z"),
      },
    });
  });

  it("reuses the newest open session and refreshes lastSeenAt", async () => {
    vi.mocked(db.studySession.findFirst).mockResolvedValue({
      id: "session-1",
      userId: "user-1",
      startedAt: new Date("2026-05-21T11:30:00.000Z"),
      completedAt: null,
      lastSeenAt: new Date("2026-05-21T11:45:00.000Z"),
    });

    await ensureActiveSession("user-1");

    expect(db.$executeRaw).toHaveBeenCalledTimes(1);
    expect(db.studySession.findFirst).toHaveBeenCalledWith({
      where: { userId: "user-1", completedAt: null },
      orderBy: [
        { lastSeenAt: "desc" },
        { startedAt: "desc" },
      ],
    });
    expect(db.studySession.update).toHaveBeenCalledWith({
      where: { id: "session-1" },
      data: { lastSeenAt: new Date("2026-05-21T12:00:00.000Z") },
    });
  });

  it("creates a fresh session when none is open", async () => {
    vi.mocked(db.studySession.findFirst).mockResolvedValue(null);

    await ensureActiveSession("user-1");

    expect(db.$executeRaw).toHaveBeenCalledTimes(1);
    expect(db.studySession.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        startedAt: new Date("2026-05-21T12:00:00.000Z"),
        lastSeenAt: new Date("2026-05-21T12:00:00.000Z"),
      },
    });
  });

  it("sweeps stale sessions using the idle cutoff", async () => {
    vi.mocked(db.studySession.findFirst).mockResolvedValue(null);

    await ensureActiveSession("user-1");

    const rawQuery = vi.mocked(db.$executeRaw).mock.calls[0]?.[0];
    expect(String(rawQuery)).toContain('UPDATE "study_sessions"');
    expect(String(rawQuery)).toContain('completedAt');
    expect(String(rawQuery)).toContain('lastSeenAt');
    expect(Number(SESSION_IDLE_MS)).toBe(300000);
  });
});
