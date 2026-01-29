import type { Metadata } from 'next'
import Link from 'next/link'
import { MediaPlaceholder } from '@/components/marketing/MediaPlaceholder'
import { ContactForm } from '@/components/marketing/sections/ContactForm'
import { CTA } from '@/components/marketing/sections/CTA'
import { FAQ } from '@/components/marketing/sections/FAQ'
import { Hero } from '@/components/marketing/sections/Hero'
import { SectionHeader, SectionShell } from '@/components/marketing/ui'

export const metadata: Metadata = {
  title: 'Contato',
  description: 'Fale com a equipe do Maha Lilah Online para dúvidas, suporte ou parcerias.',
  openGraph: {
    title: 'Contato Maha Lilah Online',
    description: 'Fale com a equipe do Maha Lilah Online para dúvidas, suporte ou parcerias.',
    url: '/contato'
  }
}

const faqItems = [
  {
    question: 'Em quanto tempo respondem?',
    answer: 'Respondemos em até 2 dias úteis, geralmente antes.'
  },
  {
    question: 'Posso agendar uma demo?',
    answer: 'Sim. Descreva sua necessidade e retornamos com horários.'
  },
  {
    question: 'Há suporte para grupos grandes?',
    answer: 'Sim. Fale com a equipe para ajustar limites e planos.'
  }
]

export default function ContatoPage() {
  return (
    <div>
      <Hero
        eyebrow="Contato"
        title="Vamos conversar"
        subtitle="Conte o seu contexto e vamos te apoiar a criar a melhor experiência para sua jornada."
        primaryCta={{ label: 'Ver FAQ', href: '/faq' }}
        secondaryCta={{ label: 'Ver planos', href: '/planos' }}
        mediaLabel="Imagem: contato e suporte"
      />

      <ContactForm />

      <SectionShell>
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col gap-4">
            <SectionHeader
              eyebrow="Canais"
              title="Outros caminhos"
              subtitle="Escolha o canal mais confortável para você."
            />
            <div className="flex flex-col gap-2 text-sm text-ink-muted">
              <Link href="https://wa.me/00000000000" className="text-gold">
                WhatsApp (placeholder)
              </Link>
              <Link href="https://instagram.com/mahalilahonline" className="text-gold">
                Instagram (placeholder)
              </Link>
              <span>contato@mahalilahonline.com.br (placeholder)</span>
            </div>
          </div>
          <MediaPlaceholder variant="vertical" label="Imagem: atendimento humano" />
        </div>
      </SectionShell>

      <FAQ
        eyebrow="FAQ"
        title="Perguntas frequentes"
        items={faqItems}
        ctaLabel="Ver FAQ completa"
        ctaHref="/faq"
      />

      <CTA
        title="Prefere entrar direto?"
        subtitle="Crie uma sala e experimente o fluxo completo."
        primaryCta={{ label: 'Entrar', href: '/login' }}
        secondaryCta={{ label: 'Ver planos', href: '/planos' }}
      />
    </div>
  )
}
