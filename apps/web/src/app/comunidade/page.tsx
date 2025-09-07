import { Metadata } from 'next'
import { CommunityHero } from '@/components/public/community/CommunityHero'
import { CommunityStats } from '@/components/public/community/CommunityStats'
import { CommunityFeatures } from '@/components/public/community/CommunityFeatures'
import { CommunityTestimonials } from '@/components/public/community/CommunityTestimonials'
import { CommunityJoin } from '@/components/public/community/CommunityJoin'
import { CTA } from '@/components/public/CTA'
import CommunityFeedServer from '@/components/public/community/CommunityFeedServer'

export const metadata: Metadata = {
  title: 'Comunidade | Caminhos de Hekate',
  description: 'Faça parte de uma comunidade vibrante de pessoas em jornada de autoconhecimento e crescimento espiritual. Conecte-se, compartilhe e cresça junto.',
  keywords: [
    'comunidade espiritual',
    'desenvolvimento pessoal',
    'autoconhecimento',
    'crescimento espiritual',
    'conexão',
    'compartilhamento',
    'apoio mútuo',
    'jornada interior',
    'transformação',
    'espiritualidade'
  ],
  openGraph: {
    title: 'Comunidade | Caminhos de Hekate',
    description: 'Faça parte de uma comunidade vibrante de pessoas em jornada de autoconhecimento e crescimento espiritual.',
    type: 'website',
    locale: 'pt_BR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Comunidade | Caminhos de Hekate',
    description: 'Faça parte de uma comunidade vibrante de pessoas em jornada de autoconhecimento e crescimento espiritual.',
  },
  alternates: {
    canonical: '/comunidade'
  }
}

export default function CommunityPage({ searchParams }: { searchParams?: { filter?: string } }) {
  return (
    <main className="min-h-screen">
      <CommunityHero />
      <CommunityStats />
      <CommunityFeatures />
      {/* Feed com filtros e infinitescroll */}
      {/* @ts-ignore */}
      <CommunityFeedServer basePath="/comunidade" filter={searchParams?.filter} />
      <CommunityTestimonials />
      <CommunityJoin />
      <CTA />
    </main>
  )
}
