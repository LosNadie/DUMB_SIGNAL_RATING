import { expect, test } from '@playwright/test'

test.describe('public pages', () => {
  test('home renders the hero, featured card and section index', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toContainText('DUMB')
    await expect(page.getByRole('link', { name: '浏览乐评' })).toBeVisible()
    await expect(page.getByRole('link', { name: /音乐乐评/ }).first()).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN')
  })

  test('music list shows real cards and opens a detail page', async ({ page }) => {
    await page.goto('/music')
    const cards = page.locator('article a[href^="/music/"]')
    await expect(cards.first()).toBeVisible()
    expect(await cards.count()).toBeGreaterThan(0)

    await cards.first().click()
    await expect(page).toHaveURL(/\/music\/[^/]+$/)
    await expect(page.locator('h1').first()).not.toBeEmpty()
  })

  test('genre filter updates the query string', async ({ page }) => {
    await page.goto('/music')
    await page.selectOption('#catalog-genre', { index: 1 })
    const value = await page.locator('#catalog-genre').inputValue()
    await page.getByRole('button', { name: '筛选' }).click()
    await expect(page).toHaveURL(new RegExp(`genre=${encodeURIComponent(value)}`))
  })

  test('search returns results', async ({ page }) => {
    await page.goto('/search?q=Radiohead')
    await expect(page.getByText(/条结果/)).toBeVisible()
  })

  test('unknown content returns 404', async ({ page }) => {
    const response = await page.goto('/music/definitely-not-a-real-slug')
    expect(response?.status()).toBe(404)
  })

  test('robots and sitemap are served', async ({ request }) => {
    const robots = await request.get('/robots.txt')
    expect(robots.status()).toBe(200)
    expect(await robots.text()).toContain('Disallow: /admin')

    const sitemap = await request.get('/sitemap.xml')
    expect(sitemap.status()).toBe(200)
    const xml = await sitemap.text()
    expect(xml).toContain('<loc>')
    expect(xml).toMatch(/\/music\//)
  })

  test('about page renders real text', async ({ page }) => {
    await page.goto('/about')
    await expect(page.locator('h1')).toContainText('记录值得再次')
  })
})

test.describe('SEO', () => {
  test('detail page exposes metadata and structured data', async ({ page }) => {
    await page.goto('/music')
    await page.locator('article a[href^="/music/"]').first().click()
    await page.waitForURL(/\/music\//)

    const title = await page.title()
    expect(title).toMatch(/DUMB SIGNAL/)

    const description = await page.locator('meta[name="description"]').getAttribute('content')
    expect((description ?? '').length).toBeGreaterThan(10)

    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(canonical).toMatch(/\/music\//)

    const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content')
    expect(ogImage).toBeTruthy()

    const jsonLd = page.locator('script[type="application/ld+json"]')
    await expect(jsonLd.first()).toBeAttached()
    const raw = await jsonLd.first().textContent()
    const data = JSON.parse(raw ?? '[]')
    const nodes = Array.isArray(data) ? data : [data]
    const types = nodes.flatMap((node) =>
      node['@graph'] && Array.isArray(node['@graph'])
        ? node['@graph'].map((entry: { '@type': string }) => entry['@type'])
        : [node['@type']],
    )
    expect(types).toContain('Review')
    expect(types).toContain('BreadcrumbList')
  })

  test('body content is present without JavaScript', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()
    await page.goto('/music')
    await expect(page.locator('h1')).toBeVisible()
    expect(await page.locator('article a[href^="/music/"]').count()).toBeGreaterThan(0)
    await context.close()
  })
})
