import type { MetadataRoute } from 'next'
import { blogPosts } from '@/lib/marketing/blog'

const baseUrl = 'https://mahalilahonline.com.br'

const staticRoutes = [
  '',
  '/como-funciona',
  '/planos',
  '/para-terapeutas',
  '/para-grupos',
  '/recursos',
  '/seguranca-privacidade',
  '/faq',
  '/blog',
  '/contato',
  '/termos',
  '/privacidade',
  '/cookies',
  '/politica-de-reembolso',
  '/login',
  '/register'
]

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const staticEntries = staticRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: now
  }))

  const blogEntries = blogPosts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: now
  }))

  return [...staticEntries, ...blogEntries]
}
