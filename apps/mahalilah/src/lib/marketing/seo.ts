import type { Metadata } from 'next'

export const MAHA_LILAH_SITE_URL = 'https://mahalilahonline.com.br'
export const MAHA_LILAH_SITE_NAME = 'Maha Lilah Online'
export const DEFAULT_OG_IMAGE_URL = '/opengraph-image'

const BASE_KEYWORDS = [
  'maha lilah',
  'maha lilah online',
  'jogo maha lilah',
  'tabuleiro de autoconhecimento',
  'jornada terapêutica',
  'terapia integrativa online',
  'facilitação terapêutica'
]

type SeoDefaultsOptions = {
  noIndex?: boolean
  keywords?: string[]
  canonicalPath?: string
}

function normalizePath(path: string | URL | undefined): string {
  if (!path) return '/'
  if (path instanceof URL) return path.pathname || '/'

  const trimmed = path.trim()
  if (!trimmed) return '/'
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      return new URL(trimmed).pathname || '/'
    } catch {
      return '/'
    }
  }
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

function uniqKeywords(list: string[]): string[] {
  const normalized = list
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.toLowerCase())
  return Array.from(new Set(normalized))
}

function readOpenGraphUrl(metadata: Metadata): string {
  if (!metadata.openGraph || typeof metadata.openGraph !== 'object') return '/'
  return normalizePath(metadata.openGraph.url)
}

export function withSeoDefaults(
  metadata: Metadata,
  options: SeoDefaultsOptions = {}
): Metadata {
  const canonicalPath = normalizePath(
    options.canonicalPath || readOpenGraphUrl(metadata)
  )

  const title =
    typeof metadata.title === 'string'
      ? metadata.title
      : MAHA_LILAH_SITE_NAME
  const description =
    metadata.description ||
    'Salas ao vivo para jornadas terapêuticas com registro, deck randômico e assistência por IA.'

  const existingKeywords = Array.isArray(metadata.keywords)
    ? metadata.keywords
    : typeof metadata.keywords === 'string'
      ? metadata.keywords.split(',')
      : []
  const keywords = uniqKeywords([
    ...BASE_KEYWORDS,
    ...existingKeywords,
    ...(options.keywords || [])
  ])

  const openGraph =
    metadata.openGraph && typeof metadata.openGraph === 'object'
      ? metadata.openGraph
      : undefined
  const openGraphTitle = openGraph?.title || title
  const openGraphDescription = openGraph?.description || description

  const twitter =
    metadata.twitter && typeof metadata.twitter === 'object'
      ? metadata.twitter
      : undefined
  const twitterTitle = twitter?.title || openGraphTitle
  const twitterDescription = twitter?.description || openGraphDescription

  return {
    ...metadata,
    title,
    description,
    keywords,
    alternates: {
      ...(metadata.alternates || {}),
      canonical: canonicalPath
    },
    openGraph: {
      ...(openGraph || {}),
      title: openGraphTitle,
      description: openGraphDescription,
      siteName: MAHA_LILAH_SITE_NAME,
      locale: 'pt_BR',
      url: canonicalPath,
      images: openGraph?.images || [
        {
          url: DEFAULT_OG_IMAGE_URL,
          width: 1200,
          height: 630,
          alt: 'Maha Lilah Online'
        }
      ]
    },
    twitter: {
      ...(twitter || {}),
      card: 'summary_large_image',
      title: twitterTitle,
      description: twitterDescription,
      images: twitter?.images || [DEFAULT_OG_IMAGE_URL]
    },
    robots: options.noIndex
      ? {
          index: false,
          follow: false,
          nocache: true,
          googleBot: {
            index: false,
            follow: false,
            noimageindex: true
          }
        }
      : metadata.robots || {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true
          }
        }
  }
}
