import { NextResponse } from 'next/server'
import { prisma } from '@hekate/database'

export async function GET() {
  try {
    const base = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const [products, courses, posts] = await Promise.all([
      prisma.product.findMany({ where: { active: true }, select: { slug: true, updatedAt: true } }),
      prisma.course.findMany({ where: { status: 'PUBLISHED' as any }, select: { slug: true, updatedAt: true } }),
      prisma.post.findMany({ where: { status: 'PUBLISHED' as any }, select: { slug: true, updatedAt: true } }),
    ])

    const urls: string[] = []
    const addUrl = (path: string, lastmod?: Date) => {
      urls.push(`<url><loc>${base}${path}</loc>${lastmod ? `<lastmod>${lastmod.toISOString()}</lastmod>` : ''}</url>`) 
    }
    addUrl('/')
    addUrl('/sobre')
    addUrl('/loja')
    addUrl('/cursos')
    addUrl('/comunidade')
    addUrl('/precos')
    products.forEach(p => addUrl(`/loja/${p.slug}`, p.updatedAt))
    courses.forEach(c => addUrl(`/cursos/${c.slug}`, c.updatedAt))
    posts.forEach(p => addUrl(`/comunidade/post/${p.slug}`, p.updatedAt))

    const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`
    return new NextResponse(body, { status: 200, headers: { 'Content-Type': 'application/xml' } })
  } catch (e) {
    return new NextResponse('Internal error', { status: 500 })
  }
}
