import { test as setup, expect } from '@playwright/test'

const authFile = '.auth/user.json'

setup('authenticate', async ({ page }) => {
  const email = process.env.E2E_TEST_USER_EMAIL
  const password = process.env.E2E_TEST_USER_PASSWORD

  if (!email || !password) {
    throw new Error(
      'E2E_TEST_USER_EMAIL and E2E_TEST_USER_PASSWORD must be set in .env.test',
    )
  }

  await page.goto('/en/sign-in')

  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()

  // Wait for redirect away from sign-in page
  await page.waitForURL((url) => !url.pathname.includes('sign-in'), { timeout: 15000 })

  await page.context().storageState({ path: authFile })
})
