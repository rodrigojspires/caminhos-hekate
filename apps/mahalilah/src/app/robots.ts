import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const blockedPaths = [
    '/api/',
    '/dashboard',
    '/faturas',
    '/checkout',
    '/rooms/',
    '/invite/',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password'
  ]

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: blockedPaths
      }
    ],
    host: 'mahalilahonline.com.br',
    sitemap: 'https://mahalilahonline.com.br/sitemap.xml'
  }
}
