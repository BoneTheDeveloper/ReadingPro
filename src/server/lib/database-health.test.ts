import { describe, expect, it } from "vitest";
import { checkDatabase, describeDatabaseTarget } from "@/server/lib/database-health";
import { resolveDatabaseUrl } from "@/server/lib/database-url";

describe("describeDatabaseTarget", () => {
  it("keeps host, port and database but drops the credentials", () => {
    expect(describeDatabaseTarget("postgres://user:secret@db.example.com:6543/app")).toBe(
      "db.example.com:6543/app",
    );
  });

  it("falls back to the default port", () => {
    expect(describeDatabaseTarget("postgres://u:p@db.example.com/app")).toBe("db.example.com:5432/app");
  });
});

describe("checkDatabase", () => {
  it("reports the configured local database as reachable", async () => {
    const health = await checkDatabase(resolveDatabaseUrl());
    expect(health.ok).toBe(true);
  });

  it("reports a closed local port with the db:up hint", async () => {
    const health = await checkDatabase("postgres://u:p@localhost:1/none");
    expect(health).toMatchObject({ ok: false, target: "localhost:1/none" });
    expect(health.ok === false && health.hint).toContain("pnpm db:up");
  });

  it("reports a missing configuration", async () => {
    expect(await checkDatabase(undefined)).toMatchObject({ ok: false, target: null });
  });
});
