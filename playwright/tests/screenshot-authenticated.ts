import { test, expect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

// SCREENSHOT_* variables customize the manual screenshot helper only.
const targetPath = process.env.SCREENSHOT_PATH ?? '/en/study'
const screenshotName = process.env.SCREENSHOT_NAME ?? 'study-screenshot'
const outDir = process.env.SCREENSHOT_DIR ?? 'test-results/playwright/screenshots'

test(`screenshot ${targetPath}`, async ({ page }) => {
  await mkdir(outDir, { recursive: true })

  await page.goto(targetPath)
  await expect(page).not.toHaveURL(/\/sign-in(?:\?|$)/)
  await expect(page.locator('#study-panels')).toBeVisible()
  await expect(page.getByRole('heading', { name: /sources/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: /content/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: /studio/i })).toBeVisible()

  await page.screenshot({
    path: join(outDir, `${screenshotName}.png`),
    fullPage: true,
  })
})
