// Measures how many words of the sample passages the dictionary can explain.
//
//   pnpm db:dictionary-coverage [file...]
//
// Counts distinct alphabetic tokens of 3+ letters and resolves each the way
// the lookup does: its own spelling or one of its base forms must be a
// headword. Prints the percentage and the misses.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { resolveDatabaseUrl } from "../src/server/lib/database-url.ts";
import { baseForms, surfaceForms } from "../src/server/modules/dictionary/lookup-forms.ts";

const DEFAULT_FILES = ["valid-a1-simple.txt", "valid-c1-complex.txt"].map((name) =>
  fileURLToPath(new URL(`../docs/Fixtures/upload-files/txt/${name}`, import.meta.url)),
);
const TARGET = 90;

async function main() {
  const files = process.argv.length > 2 ? process.argv.slice(2) : DEFAULT_FILES;
  const text = files.map((file) => readFileSync(file, "utf8")).join("\n");
  const tokens = [...new Set((text.match(/[A-Za-z]+/g) ?? []).filter((t) => t.length >= 3).map((t) => t.toLowerCase()))];

  const formsByToken = new Map(
    tokens.map((token) => {
      const surfaces = surfaceForms(token);
      return [token, [...surfaces, ...baseForms(surfaces[surfaces.length - 1])]];
    }),
  );

  const url = resolveDatabaseUrl();
  if (!url) throw new Error("No database configured: set DATABASE_URL or the POSTGRES_* variables.");
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  let known: Set<string>;
  try {
    const { rows } = await client.query<{ headword: string }>(
      `SELECT "headword" FROM "DictionaryEntry" WHERE "headword" = ANY($1::text[])`,
      [[...new Set([...formsByToken.values()].flat())]],
    );
    known = new Set(rows.map((row) => row.headword));
  } finally {
    await client.end();
  }

  const misses = tokens.filter((token) => !formsByToken.get(token)!.some((form) => known.has(form)));
  const coverage = ((tokens.length - misses.length) / tokens.length) * 100;
  console.log(`Distinct tokens: ${tokens.length}`);
  console.log(`Resolved: ${tokens.length - misses.length} (${coverage.toFixed(1)}%, target ${TARGET}%)`);
  console.log(`Misses (${misses.length}): ${misses.sort().join(", ") || "none"}`);
  if (coverage < TARGET) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
