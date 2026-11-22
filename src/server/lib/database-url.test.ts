import { describe, expect, it } from "vitest";
import { requireLocalDatabaseUrl, resolveDatabaseUrl } from "@/server/lib/database-url";

const LOCAL = {
  POSTGRES_USER: "app",
  POSTGRES_PASSWORD: "p@ss word",
  POSTGRES_DB: "readingpro",
  POSTGRES_PORT: "54329",
};

describe("resolveDatabaseUrl", () => {
  it("prefers DATABASE_URL", () => {
    expect(resolveDatabaseUrl({ ...LOCAL, DATABASE_URL: "postgres://remote/db" })).toBe("postgres://remote/db");
  });

  it("builds the local Docker URL from the POSTGRES_* variables", () => {
    expect(resolveDatabaseUrl(LOCAL)).toBe("postgres://app:p%40ss%20word@localhost:54329/readingpro");
  });

  it("is undefined when neither is configured", () => {
    expect(resolveDatabaseUrl({ POSTGRES_USER: "app" })).toBeUndefined();
  });
});

describe("requireLocalDatabaseUrl", () => {
  it("accepts the local database and refuses any other host", () => {
    expect(requireLocalDatabaseUrl(LOCAL)).toBe("postgres://app:p%40ss%20word@localhost:54329/readingpro");
    expect(() => requireLocalDatabaseUrl({ DATABASE_URL: "postgres://u:p@db.example.com/app" })).toThrow(
      'the configured database is on "db.example.com"',
    );
    expect(() => requireLocalDatabaseUrl({})).toThrow("No database configured");
  });
});
