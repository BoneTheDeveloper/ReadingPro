import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

// Browser tests against the dev servers on the local database. They reuse
// servers that are already running and otherwise start (and stop) them.
// Install the browser once with `pnpm test:e2e:install`.
export default defineConfig({
  testDir: "e2e",
  // One database and shared test accounts: run one test at a time.
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    viewport: { width: 1440, height: 900 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } }],
  webServer: [
    { command: "pnpm dev:api", url: "http://localhost:3001/api/auth/ok", reuseExistingServer: true, timeout: 120_000 },
    { command: "pnpm dev:web", url: "http://localhost:3000", reuseExistingServer: true, timeout: 120_000 },
  ],
});
