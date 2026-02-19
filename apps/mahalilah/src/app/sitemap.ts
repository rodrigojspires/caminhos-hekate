import type { MetadataRoute } from 'next'
import { blogPosts } from '@/lib/marketing/blog'

const baseUrl = 'https://mahalilahonline.com.br'

const staticRoutes: Array<{
  path: string
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']
  priority: number
}> = [
  { path: '', changeFrequency: 'weekly', priority: 1 },
  { path: '/como-funciona', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/planos', changeFrequency: 'weekly', priority: 0.95 },
  { path: '/para-terapeutas', changeFrequency: 'monthly', priority: 0.85 },
  { path: '/para-grupos', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/recursos', changeFrequency: 'monthly', priority: 0.85 },
  { path: '/deck', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/faq', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/contato', changeFrequency: 'monthly', priority: 0.65 },
  { path: '/termos', changeFrequency: 'yearly', priority: 0.4 },
  { path: '/privacidade', changeFrequency: 'yearly', priority: 0.4 },
  { path: '/cookies', changeFrequency: 'yearly', priority: 0.35 },
  { path: '/politica-de-reembolso', changeFrequency: 'yearly', priority: 0.35 }
]

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const marketingRoutes = staticRoutes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority
  }))

  const blogRoutes = blogPosts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(`${post.date}T00:00:00.000Z`),
    changeFrequency: 'monthly' as const,
    priority: 0.75
  }))

  return [...marketingRoutes, ...blogRoutes]
}
