import { defineConfig, devices } from '@playwright/test'
import { loadE2EEnv } from './e2e/helpers/load-e2e-env'

loadE2EEnv()

const externalBaseURL = process.env.E2E_BASE_URL
const baseURL = externalBaseURL ?? 'http://127.0.0.1:3000'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
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
        storageState: '.auth/user.json',
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
