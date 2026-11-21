import "dotenv/config";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Integration tests run against the local dev database (DATABASE_URL, which
// must point at localhost). Every test removes only the users it created.
// A fixed non-UTC zone proves that timestamps survive the round trip.
process.env.TZ = "Asia/Bangkok";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globalSetup: "src/server/test/global-setup.ts",
    setupFiles: ["src/server/test/setup.ts"],
    // One database, so one file at a time.
    fileParallelism: false,
    env: { TZ: "Asia/Bangkok" },
  },
});
