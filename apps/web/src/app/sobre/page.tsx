import { Metadata } from 'next'
import { AboutHero } from '@/components/public/about/AboutHero'
import { Mission } from '@/components/public/about/Mission'
import { Team } from '@/components/public/about/Team'
import { Values } from '@/components/public/about/Values'
import { Journey } from '@/components/public/about/Journey'
import { CTA } from '@/components/public/CTA'

export const metadata: Metadata = {
  title: 'Sobre Nós | Caminhos de Hekate',
  description: 'Conheça nossa missão de transformar vidas através do autoconhecimento e desenvolvimento pessoal. Descubra a história por trás da plataforma Caminhos de Hekate.',
  keywords: [
    'sobre caminhos de hekate',
    'missão',
    'valores',
    'equipe',
    'história',
    'desenvolvimento pessoal',
    'autoconhecimento',
    'transformação pessoal'
  ],
  openGraph: {
    title: 'Sobre Nós | Caminhos de Hekate',
    description: 'Conheça nossa missão de transformar vidas através do autoconhecimento e desenvolvimento pessoal.',
    type: 'website',
    locale: 'pt_BR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sobre Nós | Caminhos de Hekate',
    description: 'Conheça nossa missão de transformar vidas através do autoconhecimento e desenvolvimento pessoal.',
  },
  alternates: {
    canonical: '/sobre'
  }
}

export default function AboutPage() {
  return (
    <main className="min-h-screen">
      <AboutHero />
      <Mission />
      <Values />
      <Journey />
      <Team />
      <CTA />
    </main>
  )
}