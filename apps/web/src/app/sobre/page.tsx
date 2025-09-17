import { Metadata } from 'next'
import { Manifesto } from '@/components/public/about/Manifesto'
import { CTA } from '@/components/public/CTA'

export const metadata: Metadata = {
  title: 'Manifesto da Escola | Caminhos de Hekate',
  description: 'A Escola Iniciática Caminhos de Hekate é templo vivo: cada encontro é rito, cada palavra é invocação, cada ciclo é travessia.',
  keywords: [
    'manifesto',
    'escola iniciática',
    'templo',
    'hekate',
    'ritual',
    'travessia',
    'sabedoria',
    'autoconhecimento'
  ],
  openGraph: {
    title: 'Manifesto da Escola | Caminhos de Hekate',
    description: 'Templo vivo, rito e travessia. A Escola Iniciática Caminhos de Hekate em palavras.',
    type: 'website',
    locale: 'pt_BR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Manifesto da Escola | Caminhos de Hekate',
    description: 'Templo vivo, rito e travessia. A Escola Iniciática Caminhos de Hekate em palavras.',
  },
  alternates: {
    canonical: '/sobre'
  }
}

export default function AboutPage() {
  return (
    <main className="min-h-screen">
      <Manifesto />
      <CTA />
    </main>
  )
}
