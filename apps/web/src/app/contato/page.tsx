import type { Metadata } from 'next'
import { ContactHero } from '@/components/public/contact/ContactHero'
import { ContactForm } from '@/components/public/contact/ContactForm'
import { ContactInfo } from '@/components/public/contact/ContactInfo'
import { ContactFAQ } from '@/components/public/contact/ContactFAQ'
import { CTA } from '@/components/public/shared/CTA'

export const metadata: Metadata = {
  title: 'Contato | Caminhos de Hekate - Entre em Contato Conosco',
  description: 'Entre em contato com nossa equipe. Tire suas dúvidas, solicite informações ou compartilhe sua experiência. Estamos aqui para apoiar sua jornada espiritual.',
  keywords: [
    'contato',
    'suporte',
    'atendimento',
    'dúvidas',
    'informações',
    'equipe',
    'ajuda',
    'caminhos de hekate',
    'espiritualidade',
    'desenvolvimento pessoal'
  ],
  openGraph: {
    title: 'Contato | Caminhos de Hekate',
    description: 'Entre em contato conosco. Nossa equipe está pronta para apoiar sua jornada de crescimento espiritual.',
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Caminhos de Hekate'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contato | Caminhos de Hekate',
    description: 'Entre em contato conosco. Nossa equipe está pronta para apoiar sua jornada de crescimento espiritual.'
  },
  alternates: {
    canonical: '/contato'
  }
}

export default function ContactPage() {
  return (
    <main className="min-h-screen">
      <ContactHero />
      <ContactForm />
      <ContactInfo />
      <ContactFAQ />
      <CTA />
    </main>
  )
}