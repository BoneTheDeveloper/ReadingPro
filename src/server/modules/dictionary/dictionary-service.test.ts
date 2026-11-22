import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type pg from "pg";
import { pool } from "@/server/lib/db";
import { resolveEntries } from "./dictionary-service";

// Runs inside one transaction that is rolled back, so the imported dictionary
// is untouched and the seeded rows below are the only ones these tests see.
let tx: pg.PoolClient;

const entry = (headword: string, meaning: string) => ({
  headword,
  displayHeadword: headword,
  phonetic: null,
  senses: [{ kind: "word", label: "", partOfSpeech: "OTHER", meanings: [{ text: meaning, examples: [] }] }],
});

beforeAll(async () => {
  tx = await pool.connect();
  await tx.query("BEGIN");
  await tx.query(`DELETE FROM "DictionaryEntry"`);
  const seed = [
    entry("run", "chạy"),
    entry("running", "cuộc chạy đua"),
    entry("go", "đi"),
    entry("study", "sự học tập"),
    entry("interesting", "thú vị"),
    entry("interest", "sự quan tâm"),
    entry("people", "người"),
  ];
  await tx.query(
    `INSERT INTO "DictionaryEntry" ("headword", "displayHeadword", "phonetic", "senses")
     SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::jsonb[])`,
    [
      seed.map((e) => e.headword),
      seed.map((e) => e.displayHeadword),
      seed.map((e) => e.phonetic),
      seed.map((e) => JSON.stringify(e.senses)),
    ],
  );
});

afterAll(async () => {
  await tx.query("ROLLBACK");
  tx.release();
});

const resolve = async (word: string) =>
  (await resolveEntries(word, tx)).map((e) => `${e.headword}:${e.match}`);

describe("resolveEntries", () => {
  it("reaches the base form of an irregular verb and a plural", async () => {
    expect(await resolve("went")).toEqual(["go:lemma"]);
    expect(await resolve("Studies")).toEqual(["study:lemma"]);
  });

  it("returns the word's own entry first and its base form second", async () => {
    expect(await resolve("running")).toEqual(["running:surface", "run:lemma"]);
    expect(await resolve("interesting")).toEqual(["interesting:surface", "interest:lemma"]);
  });

  it("returns one entry for a base form and drops a possessive", async () => {
    expect(await resolve("run")).toEqual(["run:surface"]);
    expect(await resolve("people's")).toEqual(["people:surface"]);
  });

  it("returns nothing for an unknown word", async () => {
    expect(await resolve("qzxv")).toEqual([]);
  });
});
