/**
 * Thin wrapper that invokes the Prisma seed entrypoint.
 * Delegates all logic to prisma/seed.ts.
 *
 * Usage:
 *   pnpm db:import:dictionary              # normalized split files
 *   pnpm db:import:dictionary small-test   # fixtures/small-test.json
 */

import { execSync } from "node:child_process";

const arg = process.argv[2] ?? "";
const cmd = arg ? `tsx prisma/seed.ts ${arg}` : "tsx prisma/seed.ts";

execSync(cmd, { stdio: "inherit" });
