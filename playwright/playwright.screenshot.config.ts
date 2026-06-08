import { defineConfig, devices } from '@playwright/test'
import { resolve } from 'node:path'
import { loadE2EEnv } from './helpers/load-e2e-env'

loadE2EEnv()

// E2E_BASE_URL targets an existing app. When omitted, screenshot runs start a
// local dev server through Playwright.
const externalBaseURL = process.env.E2E_BASE_URL
const baseURL = externalBaseURL ?? 'http://127.0.0.1:3000'
const authStorageState = resolve(process.cwd(), '.auth/user.json')
const playwrightResultsDir = resolve(process.cwd(), 'test-results/playwright')

export default defineConfig({
  testDir: './tests',
  outputDir: `${playwrightResultsDir}/artifacts`,
  reporter: [['html', { outputFolder: `${playwrightResultsDir}/report`, open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'setup',
      testMatch: '**/auth.setup.ts',
    },
    {
      name: 'screenshot',
      testMatch: '**/screenshot-authenticated.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: authStorageState,
      },
      dependencies: ['setup'],
    },
  ],

  webServer: externalBaseURL
    ? undefined
    : {
        command: 'pnpm dev',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        stdout: 'pipe',
        stderr: 'pipe',
      },
})
