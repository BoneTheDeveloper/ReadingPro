import { config as loadEnvFile } from 'dotenv'
import { resolve } from 'node:path'

export function loadE2EEnv() {
  // CI injects E2E variables through the runner. Local runs load .env files so
  // Playwright-only settings stay outside the normal app .env.example.
  if (process.env.CI) {
    return
  }

  loadEnvFile({ path: resolve(process.cwd(), '.env.local'), quiet: true })
  loadEnvFile({ path: resolve(process.cwd(), '.env.test'), quiet: true })
}
