import { expect, test, type Page } from '@playwright/test'

/**
 * Full content lifecycle.
 *
 * These tests create, edit, publish, read, comment on and delete real rows,
 * so they must run against a seeded database (see README). Every test uses a
 * unique title/slug and cleans up after itself, which keeps the suite
 * repeatable and safe to run against a dev database.
 */

const ADMIN_USERNAME = process.env.E2E_ADMIN_USERNAME ?? 'admin'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'admin123'

/** Unique per run, so reruns never collide on the album unique key. */
const stamp = () => `${Date.now()}-${Math.floor(Math.random() * 10_000)}`

async function login(page: Page) {
  await page.goto('/login')
  await page.fill('#username', ADMIN_USERNAME)
  await page.fill('#password', ADMIN_PASSWORD)
  await page.getByRole('button', { name: '登录' }).click()
  await expect(page).toHaveURL(/\/admin$/, { timeout: 15_000 })
}

/**
 * TipTap renders its editable surface asynchronously (immediatelyRender:
 * false). Waiting for the element to be visible avoids typing into a node
 * that is replaced right after mount.
 */
async function typeBody(page: Page, text: string) {
  const editor = page.locator('.prose-signal[contenteditable="true"]')
  await expect(editor).toBeVisible({ timeout: 15_000 })
  await editor.click()
  await page.keyboard.type(text)
  await expect(editor).toContainText(text)
}


test.describe('review lifecycle', () => {
  test('create as draft -> publish -> visible in list and detail -> delete', async ({ page }) => {
    const id = stamp()
    const artist = `测试艺人 ${id}`
    const album = `测试专辑 ${id}`
    const body = `这是一段用于端到端测试的乐评正文 ${id}。`

    await login(page)

    // --- create ---------------------------------------------------------
    await page.goto('/admin/reviews/new')
    await page.fill('#artist', artist)
    await page.fill('#albumTitle', album)
    await page.fill('#label', '测试厂牌')
    await page.fill('#releaseDate', '2024-05-01')
    await page.fill('#score', '8.7')
    await page.fill('#tracksText', 'Track One\nTrack Two\nTrack Three')
    await page.fill('#mvUrl', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')

    // Pick two genres from the picker.
    await page.getByRole('button', { name: '摇滚', exact: true }).click()
    await page.getByRole('button', { name: '后摇', exact: true }).click()

    await typeBody(page, body)

    // Save as draft first.
    await page.getByRole('button', { name: '保存草稿' }).click()
    await expect(page).toHaveURL(/\/admin\/reviews\/\d+\?saved=1/, { timeout: 20_000 })
    const editUrl = page.url()
    const reviewId = Number(editUrl.match(/\/admin\/reviews\/(\d+)/)?.[1])
    expect(reviewId).toBeGreaterThan(0)

    // A draft must not appear on the public site.
    await page.goto('/music?q=' + encodeURIComponent(album))
    await expect(page.getByText(album)).toHaveCount(0)

    // --- publish --------------------------------------------------------
    await page.goto(editUrl)
    await page.getByRole('button', { name: '发布' }).click()
    await expect(page).toHaveURL(/saved=1/, { timeout: 20_000 })

    // Read the generated slug from the edit form.
    await page.goto(editUrl)
    const slug = await page.locator('#slug').inputValue()
    expect(slug.length).toBeGreaterThan(0)

    // --- public list ----------------------------------------------------
    await page.goto('/music?q=' + encodeURIComponent(album))
    await expect(page.getByRole('heading', { name: album, exact: true })).toBeVisible()

    // --- public detail --------------------------------------------------
    await page.goto(`/music/${encodeURIComponent(slug)}`)
    await expect(page.locator('h1')).toHaveText(album)
    await expect(page.getByText(artist).first()).toBeVisible()
    await expect(page.getByText('8.7').first()).toBeVisible()
    await expect(page.getByText(body)).toBeVisible()
    await expect(page.getByRole('heading', { name: '曲目' })).toBeVisible()
    await expect(page.getByText('Track One')).toBeVisible()
    await expect(page.getByRole('link', { name: /观看 MV/ })).toHaveAttribute(
      'href',
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    )

    // Genres rendered as tags.
    await expect(page.getByText('摇滚').first()).toBeVisible()
    await expect(page.getByText('后摇').first()).toBeVisible()

    // Legacy numeric id redirects to the slug.
    const redirect = await page.request.get(`/music/${reviewId}`, { maxRedirects: 0 })
    expect([301, 308]).toContain(redirect.status())
    expect(redirect.headers()['location']).toContain(encodeURIComponent(slug))

    // --- SEO ------------------------------------------------------------
    await page.goto(`/music/${encodeURIComponent(slug)}`)
    expect(await page.title()).toContain(album)
    expect(await page.title()).toContain(artist)
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(canonical).toContain(`/music/${encodeURIComponent(slug)}`)

    const jsonLd = await page
      .locator('script[type="application/ld+json"]')
      .first()
      .textContent()
    const nodes = JSON.parse(jsonLd ?? '[]')
    const reviewNode = (Array.isArray(nodes) ? nodes : [nodes]).find(
      (node: { '@type'?: string }) => node['@type'] === 'Review',
    )
    expect(reviewNode).toBeTruthy()
    expect(reviewNode.itemReviewed.name).toBe(album)
    expect(reviewNode.itemReviewed.byArtist.name).toBe(artist)
    expect(Number(reviewNode.reviewRating.ratingValue)).toBe(8.7)

    // Sitemap picks the new page up.
    const sitemap = await page.request.get('/sitemap.xml')
    expect(await sitemap.text()).toContain(encodeURIComponent(slug))

    // --- edit -----------------------------------------------------------
    await page.goto(editUrl)
    const score = page.locator('#score')
    await score.fill('9.4')
    // The field is controlled: wait for React to commit the new value.
    await expect(score).toHaveValue('9.4')
    await page.getByRole('button', { name: '发布' }).click()
    await expect(page).toHaveURL(/saved=1/, { timeout: 20_000 })
    await expect(page.locator('#score')).toHaveValue('9.4')

    await page.goto(`/music/${encodeURIComponent(slug)}`)
    await expect(page.getByText('9.4').first()).toBeVisible()

    // --- delete ---------------------------------------------------------
    await page.goto('/admin/reviews?q=' + encodeURIComponent(album))
    const row = page.locator('li', { hasText: album }).first()
    await expect(row).toBeVisible()
    // Delete is a two-step inline confirmation (no native window.confirm).
    await row.getByRole('button', { name: '删除' }).first().click()
    await expect(row.getByText('确认删除？')).toBeVisible()
    await row.getByRole('button', { name: '删除', exact: true }).last().click()
    await expect(row).toHaveCount(0, { timeout: 20_000 })

    // The public page now 404s.
    const gone = await page.goto(`/music/${encodeURIComponent(slug)}`)
    expect(gone?.status()).toBe(404)
  })

  test('validation rejects a review without a body', async ({ page }) => {
    await login(page)
    await page.goto('/admin/reviews/new')

    await page.fill('#artist', `无正文艺人 ${stamp()}`)
    await page.fill('#albumTitle', `无正文专辑 ${stamp()}`)
    await page.fill('#score', '7.0')
    await page.getByRole('button', { name: '发布' }).click()

    // Stays on the form and shows a field error.
    await expect(page).toHaveURL(/\/admin\/reviews\/new/)
    await expect(page.getByText('正文不能为空')).toBeVisible()
  })
})

test.describe('anime and movie lifecycle', () => {
  test('create an anime, then a movie, and verify both on the public site', async ({ page }) => {
    await login(page)
    const id = stamp()

    // --- anime ----------------------------------------------------------
    const animeTitle = `测试番剧 ${id}`
    await page.goto('/admin/anime/new')
    await page.fill('#title', animeTitle)
    await page.fill('#studio', '测试制作')
    await page.fill('#releaseDate', '2023-10-01')
    await page.fill('#score', '8.1')
    await page.getByRole('button', { name: '奇幻', exact: true }).click()
    await typeBody(page, `番剧正文 ${id}`)
    await page.getByRole('button', { name: '发布' }).click()
    await expect(page).toHaveURL(/\/admin\/anime\/\d+\?saved=1/, { timeout: 20_000 })

    await page.goto('/anime?q=' + encodeURIComponent(animeTitle))
    await expect(page.getByRole('heading', { name: animeTitle, exact: true })).toBeVisible()

    await page.getByRole('heading', { name: animeTitle, exact: true }).click()
    await expect(page.locator('h1')).toHaveText(animeTitle)
    await expect(page.getByText('测试制作').first()).toBeVisible()

    // Year filter is crawlable and finds the item.
    await page.goto('/anime?year=2023&q=' + encodeURIComponent(animeTitle))
    await expect(page.getByRole('heading', { name: animeTitle, exact: true })).toBeVisible()

    // --- movie ----------------------------------------------------------
    const movieTitle = `测试电影 ${id}`
    await page.goto('/admin/movies/new')
    await page.fill('#title', movieTitle)
    await page.fill('#director', '测试导演')
    await page.fill('#actorsText', '演员甲，演员乙, 演员丙')
    await page.fill('#region', '亚洲')
    await page.fill('#releaseDate', '2022-03-15')
    await page.fill('#score', '7.6')
    await page.getByRole('button', { name: '剧情', exact: true }).click()
    await typeBody(page, `电影正文 ${id}`)
    await page.getByRole('button', { name: '发布' }).click()
    await expect(page).toHaveURL(/\/admin\/movies\/\d+\?saved=1/, { timeout: 20_000 })

    await page.goto('/movie?q=' + encodeURIComponent(movieTitle))
    await page.getByRole('heading', { name: movieTitle, exact: true }).click()
    await expect(page.locator('h1')).toHaveText(movieTitle)
    await expect(page.getByText('测试导演').first()).toBeVisible()
    await expect(page.getByText('演员甲').first()).toBeVisible()

    // JSON-LD for a movie is a @graph containing Movie + Review.
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents()
    const types = blocks.flatMap((raw) => {
      const parsed = JSON.parse(raw)
      const nodes = Array.isArray(parsed) ? parsed : [parsed]
      return nodes.flatMap((node: { '@type'?: string; '@graph'?: { '@type': string }[] }) =>
        node['@graph'] ? node['@graph'].map((entry) => entry['@type']) : [node['@type']],
      )
    })
    expect(types).toEqual(expect.arrayContaining(['Movie', 'Review', 'BreadcrumbList']))

    // Clean up.
    for (const [base, title] of [
      ['/admin/anime', animeTitle],
      ['/admin/movies', movieTitle],
    ] as const) {
      await page.goto(`${base}?q=${encodeURIComponent(title)}`)
      const row = page.locator('li', { hasText: title }).first()
      await row.getByRole('button', { name: '删除' }).first().click()
      await expect(row.getByText('确认删除？')).toBeVisible()
      await row.getByRole('button', { name: '删除', exact: true }).last().click()
      await expect(row).toHaveCount(0, { timeout: 20_000 })
    }
  })
})

test.describe('comments', () => {
  test('logged-in user posts, updates and deletes a comment', async ({ page }) => {
    // Use an existing published review so the test does not depend on the
    // creation flow above.
    await page.goto('/music')
    const firstCard = page.locator('article a[href^="/music/"]').first()
    const href = await firstCard.getAttribute('href')
    expect(href).toBeTruthy()
    const detailPath = href as string

    await login(page)
    await page.goto(detailPath)

    const marker = `评论测试 ${stamp()}`

    await page.fill('#comment-content', marker)
    await page.getByRole('button', { name: /发表评论|更新评论/ }).click()

    const renderedComments = page.locator("#comments p.whitespace-pre-wrap")
    await expect(renderedComments.getByText(marker, { exact: true })).toBeVisible({ timeout: 15_000 })

    // The legacy rule: one top-level comment per user per target. Posting
    // again updates the existing comment instead of adding a second one.
    const updated = `${marker}（已更新）`
    await page.fill('#comment-content', updated)
    await page.getByRole('button', { name: '更新评论' }).click()
    await expect(renderedComments.getByText(updated, { exact: true })).toBeVisible({
      timeout: 15_000,
    })
    await expect(renderedComments.getByText(marker, { exact: true })).toHaveCount(0)

    // Only one top-level entry exists for this user.
    await expect(
      page.locator('#comments').getByText(ADMIN_USERNAME, { exact: true }),
    ).toHaveCount(1)

    // Delete it.
    await page
      .locator('#comments li', { hasText: updated })
      .first()
      .getByRole('button', { name: '删除' })
      .click()
    await expect(renderedComments.getByText(updated, { exact: true })).toHaveCount(0, { timeout: 15_000 })
  })

  test('anonymous visitors are asked to log in instead of seeing the form', async ({ page }) => {
    await page.goto('/music')
    await page.locator('article a[href^="/music/"]').first().click()
    await expect(page).toHaveURL(/\/music\//)

    await expect(page.locator('#comment-content')).toHaveCount(0)
    await expect(page.getByText('后参与讨论。')).toBeVisible()
    await expect(page.locator('#comments').getByRole('link', { name: '登录' })).toHaveAttribute(
      'href',
      /^\/login\?next=/,
    )
  })
})

test.describe('permissions', () => {
  test('a regular USER cannot reach the admin area', async ({ page }) => {
    // Register a fresh USER account through the public form.
    const username = `e2e_user_${stamp()}`.slice(0, 30)
    await page.goto('/login')
    await page.getByRole('button', { name: '注册' }).click()
    await page.fill('#username', username)
    await page.fill('#email', `${username}@example.com`)
    await page.fill('#password', 'test-password-123')
    await page.getByRole('button', { name: '注册' }).click()

    // Registration signs the user in and sends them home.
    await expect(page).toHaveURL('http://localhost:3000/', { timeout: 20_000 })

    // Middleware bounces USERs away from /admin.
    await page.goto('/admin')
    await expect(page).toHaveURL('http://localhost:3000/')

    // The admin API rejects them too.
    const response = await page.request.post('/api/admin/ai/anime', {
      data: { title: 'whatever' },
    })
    expect(response.status()).toBe(403)

    // A USER still gets the normal site and the profile page.
    await page.goto('/profile')
    await expect(page.locator('h1')).toHaveText(username)
  })

  test('admin-only APIs reject anonymous requests', async ({ page }) => {
    for (const endpoint of ['/api/admin/upload', '/api/admin/ai/review', '/api/admin/ai/movie']) {
      const response = await page.request.post(endpoint, { data: {} })
      expect(response.status()).toBe(403)
    }
  })

  test('server actions re-check the session, not just the middleware', async ({ page }) => {
    // Forge a cookie with a valid signature but a non-existent user id.
    // The middleware only verifies the JWT; the admin layout must still
    // reject the request because the account does not exist in the database.
    const secret = process.env.AUTH_SECRET
    test.skip(!secret, 'AUTH_SECRET is required to forge a token')

    const { SignJWT } = await import('jose')
    const token = await new SignJWT({ username: 'ghost', role: 'ADMIN' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('999999')
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(new TextEncoder().encode(secret))

    await page.context().addCookies([
      {
        name: 'dumb_session',
        value: token,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
      },
    ])

    const response = await page.goto('/admin')
    // requireEditor() finds no user and redirects to /login.
    await expect(page).toHaveURL(/\/login/)
    expect(response?.status()).toBeLessThan(500)
  })
})

test.describe('cross-cutting SEO', () => {
  test('list pages expose canonical, metadata and breadcrumb data', async ({ page }) => {
    for (const path of ['/music', '/anime', '/movie']) {
      await page.goto(path)
      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
      expect(canonical).toContain(path)
      expect((await page.locator('meta[name="description"]').getAttribute('content'))?.length).toBeGreaterThan(10)

      const raw = await page.locator('script[type="application/ld+json"]').first().textContent()
      const data = JSON.parse(raw ?? '{}')
      expect(data['@type']).toBe('BreadcrumbList')
      expect(data.itemListElement.length).toBeGreaterThanOrEqual(2)
    }
  })

  test('filtered lists keep crawlable URLs and canonical rules', async ({ page }) => {
    await page.goto('/music?genre=rock&sort=score')
    await expect(page).toHaveURL(/genre=rock/)
    await expect(page).toHaveURL(/sort=score/)

    // A search query is noindex; the canonical drops `q` but keeps the genre.
    await page.goto('/music?q=radiohead&genre=rock')
    const robots = await page.locator('meta[name="robots"]').getAttribute('content')
    expect(robots).toContain('noindex')
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(canonical).toContain('genre=rock')
    expect(canonical).not.toContain('q=')
  })

  test('search is noindex and every type filter works', async ({ page }) => {
    await page.goto('/search?q=a&type=music')
    expect(await page.locator('meta[name="robots"]').getAttribute('content')).toContain('noindex')

    for (const type of ['all', 'music', 'anime', 'movie']) {
      await page.goto(`/search?q=a&type=${type}`)
      await expect(page.locator('h1')).toHaveText('搜索')
    }
  })

  test('sitemap covers every published detail URL and none of the private ones', async ({
    request,
  }) => {
    const xml = await (await request.get('/sitemap.xml')).text()
    expect(xml).toContain('/music/')
    expect(xml).toContain('/anime/')
    expect(xml).toContain('/movie/')
    expect(xml).not.toContain('/admin')
    expect(xml).not.toContain('/login')

    // Every listed URL must actually resolve (2xx or a redirect).
    const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])
    expect(urls.length).toBeGreaterThan(3)
    for (const url of urls.slice(0, 8)) {
      const response = await request.get(url)
      expect(response.status(), `${url} should resolve`).toBeLessThan(400)
    }
  })
})

test.describe('uploads', () => {
  test('admin upload stores an image and it is served back', async ({ page }) => {
    await login(page)

    // A 1x1 PNG is enough to exercise sharp + the storage path.
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    )

    const response = await page.request.post('/api/admin/upload', {
      multipart: {
        file: { name: 'pixel.png', mimeType: 'image/png', buffer: png },
      },
    })
    expect(response.status()).toBe(200)

    const body = (await response.json()) as { url?: string }
    expect(body.url).toMatch(/^\/uploads\/[A-Za-z0-9-]+\.webp$/)

    const served = await page.request.get(body.url as string)
    expect(served.status()).toBe(200)
    expect(served.headers()['content-type']).toBe('image/webp')
    // In dev, UPLOAD_DIR is public/uploads and Next's static handler wins;
    // in production the route handler sets an immutable cache header.
    expect(served.headers()['cache-control']).toBeTruthy()
  })

  test('upload rejects non-images and path traversal', async ({ page }) => {
    await login(page)

    const text = await page.request.post('/api/admin/upload', {
      multipart: {
        file: { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') },
      },
    })
    expect(text.status()).toBe(400)

    // The serving route only allows a single safe filename.
    const traversal = await page.request.get('/uploads/..%2F..%2F.env')
    // Next may reject the malformed path itself (400) before the route does
    // (404); either way the file must not be served.
    expect([400, 404]).toContain(traversal.status())
  })
})
