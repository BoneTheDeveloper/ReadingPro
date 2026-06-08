import { test as setup } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { E2E_AUTH_FILE } from '../../tests/shared/auth-state'

setup('authenticate', async ({ page }) => {
  // E2E_TEST_USER_* are Playwright-only credentials loaded from .env.test
  // locally or injected as CI secrets.
  const email = process.env.E2E_TEST_USER_EMAIL
  const password = process.env.E2E_TEST_USER_PASSWORD

  if (!email || !password) {
    throw new Error(
      'Missing E2E credentials. Set E2E_TEST_USER_EMAIL and E2E_TEST_USER_PASSWORD in .env.test for local runs, or provide them as CI secrets.',
    )
  }

  await mkdir(dirname(E2E_AUTH_FILE), { recursive: true })

  await page.goto('/en/sign-in')

  await page.locator('input[name="identifier"]').fill(email)
  await page.getByRole('button', { name: /^continue$/i }).click()
  await page.locator('input[name="password"]').fill(password)
  await page.getByRole('button', { name: /^continue$/i }).click()

  // Wait for redirect away from sign-in page
  await page.waitForURL((url) => !url.pathname.includes('sign-in'), { timeout: 15000 })

  await page.context().storageState({ path: E2E_AUTH_FILE })
})
