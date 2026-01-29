export function OrganizationJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Maha Lilah Online',
    url: 'https://mahalilahonline.com.br',
    logo: 'https://mahalilahonline.com.br/og.png',
    sameAs: [
      'https://www.instagram.com/mahalilahonline',
      'https://www.youtube.com/@mahalilahonline'
    ]
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

export function ProductJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'Maha Lilah Online',
    description:
      'Salas ao vivo para jornadas terapêuticas com registro, deck randômico e síntese por IA.',
    brand: {
      '@type': 'Organization',
      name: 'Maha Lilah Online'
    },
    category: 'Software as a Service',
    url: 'https://mahalilahonline.com.br'
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
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

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
