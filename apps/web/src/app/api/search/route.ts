import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'

function highlight(text: string, query: string, radius = 80) {
  if (!text) return ''
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text.slice(0, 160)
  const start = Math.max(0, idx - radius)
  const end = Math.min(text.length, idx + query.length + radius)
  let snippet = text.slice(start, end)
  const re = new RegExp(`(${query.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'ig')
  snippet = snippet.replace(re, '<mark>$1</mark>')
  return (start > 0 ? '…' : '') + snippet + (end < text.length ? '…' : '')
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = (searchParams.get('q') || '').trim()
    const typesParam = (searchParams.get('types') || '').trim()
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const types = typesParam ? typesParam.split(',').map(s => s.trim().toLowerCase()) : []

    if (!q) return NextResponse.json({ results: [], facets: {}, query: q })

    const where: any = { isActive: true }
    if (types.length) where.entityType = { in: types }
    const items = await prisma.searchIndex.findMany({
      where: {
        ...where,
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { content: { contains: q, mode: 'insensitive' } },
          { tags: { hasSome: [q] } },
          { categories: { hasSome: [q] } },
        ],
      },
      orderBy: [{ popularity: 'desc' }, { relevance: 'desc' }],
      take: limit,
    })

    const results = items.map((it) => {
      const url = (() => {
        switch (it.entityType) {
          case 'product': return `/loja/${(it as any).metadata?.slug || it.entityId}`
          case 'course': return `/cursos/${(it as any).metadata?.slug || it.entityId}`
          case 'post': return `/comunidade/post/${(it as any).metadata?.slug || it.entityId}`
          case 'user': return `/perfil/${it.entityId}`
          default: return `/${it.entityType}/${it.entityId}`
        }
      })()
      const snippet = highlight(it.content || it.summary || '', q)
      return {
        id: it.id,
        entityType: it.entityType,
        entityId: it.entityId,
        title: it.title,
        url,
        summary: it.summary,
        snippet,
        tags: it.tags,
        categories: it.categories,
      }
    })

    const facets: Record<string, Record<string, number>> = { entityType: {}, tags: {}, categories: {} }
    for (const r of items) {
      facets.entityType[r.entityType] = (facets.entityType[r.entityType] || 0) + 1
      for (const t of r.tags || []) facets.tags[t] = (facets.tags[t] || 0) + 1
      for (const c of r.categories || []) facets.categories[c] = (facets.categories[c] || 0) + 1
    }

    try {
      await prisma.searchSuggestion.upsert({
        where: { query: q },
        update: { popularity: { increment: 1 } },
        create: { query: q, suggestion: q, category: 'general' },
      })
    } catch {}

    return NextResponse.json({ results, facets, query: q })
  } catch (e) {
    console.error('GET /api/search error', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

