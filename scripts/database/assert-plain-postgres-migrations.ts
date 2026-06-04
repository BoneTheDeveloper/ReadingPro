/**
 * Asserts that all Prisma migration SQL files use plain PostgreSQL,
 * rejecting Supabase-specific syntax (RLS policies, Supabase functions,
 * trigger functions referencing auth.uid(), etc.).
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = join(import.meta.dirname, "../../prisma/migrations");

const SUPABASE_PATTERNS = [
  /CREATE\s+POLICY\b/i,
  /ALTER\s+TABLE.*ENABLE\s+ROW\s+LEVEL\s+SECURITY/i,
  /auth\.uid\(\)/i,
  /supabase/i,
  /CURRENT_SETTING\s*\(\s*'request\.jwt'/i,
];

function getMigrationFiles(): string[] {
  try {
    const entries = readdirSync(MIGRATIONS_DIR, { withFileTypes: true });
    return entries
      .filter((d) => d.isDirectory())
      .flatMap((d) => {
        const sqlPath = join(MIGRATIONS_DIR, d.name, "migration.sql");
        try {
          readFileSync(sqlPath, "utf-8");
          return [sqlPath];
        } catch {
          return [];
        }
      });
  } catch {
    console.log("No migrations directory found — skipping audit.");
    return [];
  }
}

function auditFile(filePath: string): string[] {
  const content = readFileSync(filePath, "utf-8");
  const violations: string[] = [];
  for (const pattern of SUPABASE_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      violations.push(`  Found Supabase-specific syntax: "${match[0]}"`);
    }
  }
  return violations;
}

function main() {
  console.log("Auditing migration SQL for plain PostgreSQL compliance...\n");

  const files = getMigrationFiles();
  if (files.length === 0) {
    console.log("No migration files to audit.");
    return;
  }

  let hasViolations = false;
  for (const file of files) {
    const violations = auditFile(file);
    if (violations.length > 0) {
      hasViolations = true;
      console.error(`${file}:`);
      for (const v of violations) {
        console.error(v);
      }
    }
  }

  if (hasViolations) {
    console.error("\nMigration audit FAILED: Supabase-specific syntax detected.");
    process.exit(1);
  }

  console.log(`\nMigration audit passed: ${files.length} file(s) checked.`);
}

main();
