import {
  DEFAULT_OG_IMAGE_URL,
  MAHA_LILAH_SITE_NAME,
  MAHA_LILAH_SITE_URL
} from '@/lib/marketing/seo'

function JsonLdScript({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

export function OrganizationJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: MAHA_LILAH_SITE_NAME,
    url: MAHA_LILAH_SITE_URL,
    logo: `${MAHA_LILAH_SITE_URL}${DEFAULT_OG_IMAGE_URL}`,
    description:
      'Plataforma para jornadas terapêuticas com o tabuleiro Maha Lilah, sessões ao vivo e apoio de IA.',
    email: 'mahalilahonline@caminhosdehekate.com.br',
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Suporte comercial',
      email: 'mahalilahonline@caminhosdehekate.com.br',
      areaServed: 'BR',
      availableLanguage: ['pt-BR']
    },
    sameAs: [
      'https://www.instagram.com/mahalilahonline',
      'https://www.youtube.com/@mahalilahonline'
    ]
  }

  return <JsonLdScript data={data} />
}

export function WebSiteJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: MAHA_LILAH_SITE_NAME,
    url: MAHA_LILAH_SITE_URL,
    inLanguage: 'pt-BR',
    description:
      'Site oficial do Maha Lilah Online com planos, FAQ, recursos, blog e acesso às salas ao vivo.'
  }

  return <JsonLdScript data={data} />
}

export function SoftwareApplicationJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: MAHA_LILAH_SITE_NAME,
    description:
      'Plataforma para conduzir sessões terapêuticas ao vivo no tabuleiro Maha Lilah com registros estruturados e assistência por IA.',
    applicationCategory: 'HealthApplication',
    operatingSystem: 'Web',
    brand: {
      '@type': 'Organization',
      name: MAHA_LILAH_SITE_NAME
    },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'BRL',
      availability: 'https://schema.org/InStock',
      url: `${MAHA_LILAH_SITE_URL}/planos`
    },
    url: MAHA_LILAH_SITE_URL,
    image: `${MAHA_LILAH_SITE_URL}${DEFAULT_OG_IMAGE_URL}`,
    inLanguage: 'pt-BR'
  }

  return <JsonLdScript data={data} />
}

export function FaqJsonLd({
  items
}: {
  items: Array<{ question: string; answer: string }>
}) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer
      }
    }))
  }

  return <JsonLdScript data={data} />
}

export function BlogPostingJsonLd({
  title,
  description,
  slug,
  publishedAt,
  category
}: {
  title: string
  description: string
  slug: string
  publishedAt: string
  category: string
}) {
  const url = `${MAHA_LILAH_SITE_URL}/blog/${slug}`
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description,
    url,
    datePublished: publishedAt,
    dateModified: publishedAt,
    inLanguage: 'pt-BR',
    articleSection: category,
    publisher: {
      '@type': 'Organization',
      name: MAHA_LILAH_SITE_NAME,
      logo: {
        '@type': 'ImageObject',
        url: `${MAHA_LILAH_SITE_URL}${DEFAULT_OG_IMAGE_URL}`
      }
    },
    author: {
      '@type': 'Organization',
      name: MAHA_LILAH_SITE_NAME
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url
    }
  }

  return <JsonLdScript data={data} />
}
