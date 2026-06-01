import { test, expect } from '@playwright/test'

test.describe('Authenticated smoke', () => {
  test('study workspace loads with saved auth state', async ({ page }) => {
    await page.goto('/en/study')

    await expect(page).not.toHaveURL(/\/sign-in(?:\?|$)/)
    await expect(page.locator('#study-panels')).toBeVisible()
    await expect(page.getByRole('heading', { name: /sources/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /content/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /studio/i })).toBeVisible()
  })
})
