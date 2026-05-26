import { test } from '@playwright/test'

const targetPath = process.env.SCREENSHOT_PATH ?? '/en/study'
const screenshotName = process.env.SCREENSHOT_NAME ?? 'study'
const outDir = process.env.SCREENSHOT_DIR ?? 'test-playground'

test(`screenshot ${targetPath}`, async ({ page }) => {
  const email = process.env.E2E_TEST_USER_EMAIL!
  const password = process.env.E2E_TEST_USER_PASSWORD!

  await page.goto('/en/sign-in')
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await page.waitForURL((url) => !url.pathname.includes('sign-in'), { timeout: 15000 })

  await page.goto(targetPath)
  await page.waitForLoadState('networkidle')

  await page.screenshot({ path: `${outDir}/${screenshotName}.png`, fullPage: true })
})
