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
    answer: 'Sim. Envie contexto do seu trabalho e retornamos com possibilidades. Mas caso queira temos uma sala experimental para degustar do nosso tabuleiro.'
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
        title="Converse com quem entende da experiência terapêutica digital"
        subtitle="Conte seu objetivo e te ajudamos a montar o melhor caminho para começar com segurança e impacto."
        primaryCta={{ label: 'Fale no Whatsapp', href: 'https://wa.me/5511961460883?text=Ol%C3%A1!%20Vim%20pelo%20site%20do%20Maha%20Lilah%20e%20quero%20falar%20com%20voces!' }}
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
              <Link href="mailto:mahalilahonline@caminhosdehekate.com.br" className="text-gold">
                mahalilahonline@caminhosdehekate.com.br
              </Link>
              <Link href="https://instagram.com/caminhoshekate" className="text-gold">
                instagram.com/caminhoshekate
              </Link>
            </div>
          </div>
        </div>
      </SectionShell>

      <FAQ
        eyebrow="FAQ"
        title="Dúvidas frequentes sobre atendimento"
        items={faqItems}
      />
    </div>
  )
}
