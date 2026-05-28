import { test, expect } from '@playwright/test'

test.describe('Smoke', () => {
  test('public sign-in page loads', async ({ page }) => {
    await page.goto('/en/sign-in')

    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.getByRole('button', { name: /^sign in$/i })).toBeVisible()
  })
})
