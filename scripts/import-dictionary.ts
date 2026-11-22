// Loads the English-Vietnamese dictionary into "DictionaryEntry".
//
//   pnpm db:import-dictionary [path/to/AnhViet.zip]
//
// Without an argument it reads db/dictionary/AnhViet.zip and refuses it unless
// its sha256 matches db/dictionary/SOURCE.txt. The table is truncated and
// refilled in one transaction, so running it again gives the same rows.
// Production: take a pg_dump first, then run with DATABASE_URL set.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { resolveDatabaseUrl } from "../src/server/lib/database-url.ts";
import { buildDictionary } from "../src/server/modules/dictionary/ovdp-parser.ts";
import { readStardictZip } from "../src/server/modules/dictionary/stardict-reader.ts";

const DEFAULT_FILE = fileURLToPath(new URL("../db/dictionary/AnhViet.zip", import.meta.url));
const EXPECTED_SHA256 = "6ff1508004311e916993b4eb84580cee910c89d682028d387763f7f85fc9c442";
const BATCH_SIZE = 1000;

async function main() {
  const file = process.argv[2] ?? DEFAULT_FILE;
  const zip = readFileSync(file);
  const sha256 = createHash("sha256").update(zip).digest("hex");
  if (file === DEFAULT_FILE && sha256 !== EXPECTED_SHA256) {
    throw new Error(`${file} has sha256 ${sha256}, expected ${EXPECTED_SHA256}`);
  }
  console.log(`Reading ${file} (sha256 ${sha256})`);

  const entries = buildDictionary(readStardictZip(zip));
  console.log(`Parsed ${entries.length} entries`);

  const url = resolveDatabaseUrl();
  if (!url) throw new Error("No database configured: set DATABASE_URL or the POSTGRES_* variables.");
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query(`TRUNCATE "DictionaryEntry"`);
    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = entries.slice(i, i + BATCH_SIZE);
      await client.query(
        `INSERT INTO "DictionaryEntry" ("headword", "displayHeadword", "phonetic", "senses")
         SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::jsonb[])`,
        [
          batch.map((entry) => entry.headword),
          batch.map((entry) => entry.displayHeadword),
          batch.map((entry) => entry.phonetic),
          batch.map((entry) => JSON.stringify(entry.senses)),
        ],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
  console.log(`Imported ${entries.length} entries into "DictionaryEntry"`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
