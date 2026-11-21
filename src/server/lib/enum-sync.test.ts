// Fails when an enum in src/shared/enums.ts drifts from the Postgres enum of
// the same name that Flyway created.
import { describe, expect, it } from "vitest";
import { pool } from "@/server/lib/db";
import * as Shared from "@/shared/enums";

const SHARED_ENUMS: Record<string, Record<string, string>> = {
  CEFRLevel: Shared.CEFRLevel,
  SourceType: Shared.SourceType,
  VocabularyStatus: Shared.VocabularyStatus,
  ReviewRating: Shared.ReviewRating,
  StudioArtifactType: Shared.StudioArtifactType,
  ProcessingStatus: Shared.ProcessingStatus,
  PartOfSpeech: Shared.PartOfSpeech,
};

describe("shared enums", () => {
  it("match the database enums label for label, in order", async () => {
    const { rows } = await pool.query<{ typname: string; enumlabel: string }>(
      `SELECT t."typname", e."enumlabel"
       FROM pg_type t JOIN pg_enum e ON e."enumtypid" = t."oid"
       ORDER BY t."typname", e."enumsortorder"`,
    );
    const dbEnums = new Map<string, string[]>();
    for (const row of rows) {
      dbEnums.set(row.typname, [...(dbEnums.get(row.typname) ?? []), row.enumlabel]);
    }

    for (const [name, values] of Object.entries(SHARED_ENUMS)) {
      expect(Object.keys(values), `${name} keys`).toEqual(Object.values(values));
      expect(dbEnums.get(name), name).toEqual(Object.values(values));
    }
  });
});
