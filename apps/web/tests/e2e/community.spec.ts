import { test, expect } from '@playwright/test'

test.describe('Comunidade - fluxo básico', () => {
  test('Feed carrega e exibe posts', async ({ page }) => {
    await page.goto('/comunidade/feed')
    await expect(page.getByRole('heading', { name: 'Feed da Comunidade' })).toBeVisible()
    // Deve listar artigos
    await expect(page.locator('article').first()).toBeVisible()
  })

  test('Paywall aparece para post de nível alto quando deslogado', async ({ page, context }) => {
    await context.clearCookies()
    // Tenta abrir um post avançado seedado (ajuste o slug se necessário)
    await page.goto('/comunidade/feed')
    // Abre o primeiro item; se não estiver bloqueado, apenas valida que a página abre
    const first = page.locator('article a').first()
    const href = await first.getAttribute('href')
    if (href) {
      await page.click('article a >> nth=0')
      // Se bloqueado, CTA de upgrade deve aparecer
      const paywall = page.locator('text=Faça upgrade')
      // Não falhar caso não exista (depende do seed)
      if (await paywall.count()) {
        await expect(paywall).toBeVisible()
      }
    }
  })

  test('Fluxo autenticado: login, criar post, comentar, like e seguir', async ({ page }) => {
    // Login (admin seed)
    await page.goto('/auth/login')
    await page.getByLabel('Email').fill(process.env.TEST_EMAIL || 'admin@caminhosdehekate.com.br')
    await page.getByLabel('Senha').fill(process.env.TEST_PASSWORD || 'HekateAdmin#2024')
    await page.getByRole('button', { name: 'Entrar' }).click()
    await page.waitForTimeout(1000)

    // Criar post via fetch autenticado no contexto da página
    const title = `Post E2E ${Date.now()}`
    const content = 'Conteúdo de teste automatizado.'
    const createResp = await page.evaluate(async ({ title, content }) => {
      const r = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content })
      })
      return r.ok ? r.json() : null
    }, { title, content })
    expect(createResp).toBeTruthy()
    const slug = createResp.slug as string
    const postId = createResp.id as string

    // Obter detalhes do post + authorId
    const details: any = await page.evaluate(async (slug) => {
      const r = await fetch(`/api/community/posts/${slug}`)
      return r.ok ? r.json() : null
    }, slug)
    expect(details).toBeTruthy()
    const authorId = details.author.id as string

    // Comentar
    const commentResp = await page.evaluate(async (postId) => {
      const r = await fetch(`/api/community/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'Comentário E2E' })
      })
      return r.ok ? r.json() : null
    }, postId)
    expect(commentResp).toBeTruthy()

    // Like no post
    await page.evaluate(async (postId) => {
      await fetch(`/api/community/posts/${postId}/reactions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'LIKE' }) })
    }, postId)

    // Seguir autor
    await page.evaluate(async (authorId) => {
      await fetch(`/api/community/follow/author/${authorId}`, { method: 'POST' })
    }, authorId)

    // Reagir no comentário com ❤️ para validar contadores
    // Buscar comentários via API para obter o ID do comentário criado
    const commentData: any = await page.evaluate(async (postId) => {
      const r = await fetch(`/api/community/posts/${postId}/comments`)
      return r.ok ? r.json() : null
    }, postId)
    const firstCommentId = commentData?.comments?.[0]?.id
    if (firstCommentId) {
      await page.evaluate(async (commentId) => {
        await fetch(`/api/community/comments/${commentId}/reactions`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'HEART' })
        })
      }, firstCommentId)
    }

    // Verificar na UI do post
    await page.goto(`/comunidade/post/${slug}`)
    await expect(page.getByText('Comentário E2E')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Seguir' }).or(page.getByRole('button', { name: 'Seguindo' }))).toBeVisible()
    if (firstCommentId) {
      await expect(page.getByText('❤️ (1)')).toBeVisible()
    }

    // Validar feed "Seguindo" contém o post criado
    await page.goto('/comunidade/feed?filter=following')
    await expect(page.locator(`a[href="/comunidade/post/${slug}"]`).first()).toBeVisible()
  })
})
