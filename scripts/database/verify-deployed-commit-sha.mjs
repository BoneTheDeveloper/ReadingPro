import { readFileSync } from "node:fs";

const body = JSON.parse(readFileSync("health.json", "utf8"));
const expected = process.env.EXPECTED_COMMIT_SHA;
const deployed = body.data?.commitSha ?? "unknown";

if (deployed !== expected) {
  console.error(`Expected deployed commit ${expected}, got ${deployed}`);
  process.exit(1);
}
