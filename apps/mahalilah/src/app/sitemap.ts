import type { MetadataRoute } from 'next'

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

  return staticRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: now
  }))
}
