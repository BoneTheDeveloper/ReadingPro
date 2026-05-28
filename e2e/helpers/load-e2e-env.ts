import { config as loadEnvFile } from 'dotenv'
import { resolve } from 'node:path'

export function loadE2EEnv() {
  if (process.env.CI) {
    return
  }

  loadEnvFile({ path: resolve(process.cwd(), '.env.local'), quiet: true })
  loadEnvFile({ path: resolve(process.cwd(), '.env.test'), quiet: true })
}
