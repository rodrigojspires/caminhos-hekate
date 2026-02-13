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
  description:
    'Fale com o time do Maha Lilah Online para onboarding, dúvidas comerciais e orientações de uso.',
  openGraph: {
    title: 'Contato Maha Lilah Online',
    description:
      'Fale com o time do Maha Lilah Online para onboarding, dúvidas comerciais e orientações de uso.',
    url: '/contato'
  }
}

const faqItems = [
  {
    question: 'Em quanto tempo vocês respondem?',
    answer: 'Respondemos em até 2 dias úteis, normalmente antes desse prazo.'
  },
  {
    question: 'Posso agendar uma demonstração?',
    answer: 'Sim. Envie contexto do seu trabalho e retornamos com possibilidades.'
  },
  {
    question: 'Vocês ajudam a escolher o plano ideal?',
    answer: 'Sim. Nossa equipe orienta com base no número de sessões, participantes e objetivos.'
  }
]

export default function ContatoPage() {
  return (
    <div>
      <Hero
        eyebrow="Contato"
        title="Converse com quem entende da experiência terapêutica digital"
        subtitle="Conte seu objetivo e te ajudamos a montar o melhor caminho para começar com segurança e impacto."
        primaryCta={{ label: 'Criar minha primeira sala', href: '/login' }}
        secondaryCta={{ label: 'Ver demo', href: '/como-funciona' }}
        mediaLabel="Atendimento humano e acompanhamento de onboarding"
        highlights={['Atendimento humano', 'Apoio comercial', 'Onboarding orientado']}
      />

      <ContactForm />

      <SectionShell>
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col gap-4">
            <SectionHeader
              eyebrow="Canais diretos"
              title="Prefere falar por outro canal?"
              subtitle="Você pode usar o canal que for mais confortável para seu momento."
            />
            <div className="flex flex-col gap-2 text-sm text-ink-muted">
              <Link href="mailto:contato@mahalilahonline.com.br" className="text-gold">
                contato@mahalilahonline.com.br
              </Link>
              <Link href="https://instagram.com/mahalilahonline" className="text-gold">
                instagram.com/mahalilahonline
              </Link>
            </div>
          </div>
          <MediaPlaceholder variant="vertical" label="Equipe de atendimento e acompanhamento personalizado" />
        </div>
      </SectionShell>

      <FAQ
        eyebrow="FAQ"
        title="Dúvidas frequentes sobre atendimento"
        items={faqItems}
        ctaLabel="Ver FAQ completa"
        ctaHref="/faq"
      />

      <CTA
        title="Se preferir, você pode entrar direto na plataforma"
        subtitle="Crie uma conta, teste o fluxo e fale com a equipe quando quiser para otimizar seu uso."
        primaryCta={{ label: 'Criar minha primeira sala', href: '/login' }}
        secondaryCta={{ label: 'Falar com a equipe', href: '/contato' }}
        badges={['Suporte ativo', 'Onboarding consultivo']}
      />
    </div>
  )
}
