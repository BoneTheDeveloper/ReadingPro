import { defineConfig, devices } from '@playwright/test'
import { loadE2EEnv } from './e2e/helpers/load-e2e-env'

loadE2EEnv()

const externalBaseURL = process.env.E2E_BASE_URL
const baseURL = externalBaseURL ?? 'http://127.0.0.1:3000'

export default defineConfig({
  testDir: './e2e',
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
