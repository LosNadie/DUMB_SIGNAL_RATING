import { expect, test } from '@playwright/test'

const ADMIN_USERNAME = process.env.E2E_ADMIN_USERNAME ?? 'admin'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'admin123'

test.describe('authentication', () => {
  test('unauthenticated access to /admin redirects to login', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin/)
    await expect(page.getByText('Access the archive')).toBeVisible()
  })

  test('unauthenticated access to /profile redirects to login', async ({ page }) => {
    await page.goto('/profile')
    await expect(page).toHaveURL(/\/login/)
  })

  test('login then reach the admin dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.fill('#username', ADMIN_USERNAME)
    await page.fill('#password', ADMIN_PASSWORD)
    await page.getByRole('button', { name: '登录' }).click()

    await expect(page).toHaveURL(/\/admin$/, { timeout: 15_000 })
    await expect(page.locator('h1')).toContainText('概览')

    await page.goto('/profile')
    await expect(page.locator('h1')).toHaveText(ADMIN_USERNAME)
  })
})

test.describe('admin content', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('#username', ADMIN_USERNAME)
    await page.fill('#password', ADMIN_PASSWORD)
    await page.getByRole('button', { name: '登录' }).click()
    await expect(page).toHaveURL(/\/admin$/, { timeout: 15_000 })
  })

  test('lists content for each section', async ({ page }) => {
    for (const path of ['/admin/reviews', '/admin/anime', '/admin/movies']) {
      await page.goto(path)
      await expect(page.locator('h1')).toBeVisible()
      await expect(page.getByRole('link', { name: '编辑' }).first()).toBeVisible()
    }
  })

  test('edit page renders the form with existing data', async ({ page }) => {
    await page.goto('/admin/reviews')
    await page.getByRole('link', { name: '编辑' }).first().click()
    await expect(page.locator('input#artist')).not.toBeEmpty()
    await expect(page.locator('input#albumTitle')).not.toBeEmpty()
    await expect(page.getByText('AI 辅助')).toBeVisible()
  })

  test('admin pages are noindex', async ({ page }) => {
    await page.goto('/admin')
    const robots = await page.locator('meta[name="robots"]').getAttribute('content')
    expect(robots).toContain('noindex')
  })
})
