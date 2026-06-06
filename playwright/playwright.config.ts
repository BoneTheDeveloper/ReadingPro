import { defineConfig, devices } from '@playwright/test'
import { resolve } from 'node:path'
import { loadE2EEnv } from './helpers/load-e2e-env'

loadE2EEnv()

const externalBaseURL = process.env.E2E_BASE_URL
const baseURL = externalBaseURL ?? 'http://127.0.0.1:3000'
const authStorageState = resolve(process.cwd(), '.auth/user.json')
const playwrightResultsDir = resolve(process.cwd(), 'test-results/playwright')

export default defineConfig({
  testDir: './tests',
  outputDir: `${playwrightResultsDir}/artifacts`,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
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
      name: 'public',
      testMatch: '**/smoke.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'authenticated',
      testMatch: '**/authenticated-*.spec.ts',
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
