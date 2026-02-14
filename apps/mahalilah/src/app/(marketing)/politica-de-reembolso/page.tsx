import type { Metadata } from 'next'
import Link from 'next/link'
import { MediaPlaceholder } from '@/components/marketing/MediaPlaceholder'
import { CTA } from '@/components/marketing/sections/CTA'
import { FAQ } from '@/components/marketing/sections/FAQ'
import { Hero } from '@/components/marketing/sections/Hero'
import { SectionHeader, SectionShell } from '@/components/marketing/ui'

export const metadata: Metadata = {
  title: 'Política de reembolso',
  description: 'Regras claras para reembolso de sessões avulsas e assinaturas.',
  openGraph: {
    title: 'Política de Reembolso',
    description: 'Regras claras para reembolso de sessões avulsas e assinaturas.',
    url: '/politica-de-reembolso'
  }
}

const faqItems = [
  {
    question: 'Como solicito reembolso?',
    answer: 'Entre em contato pelo formulário com dados da compra e motivo ou através do nosso suporte pelo Whatsapp.'
  },
  {
    question: 'E se eu cancelar a assinatura?',
    answer:
      'O cancelamento impede novas cobranças, não gera reembolso e a assinatura permanece ativa até o fim do ciclo já pago.'
  }
]

export default function PoliticaDeReembolsoPage() {
  return (
    <div>
      <Hero
        title="Política de reembolso"
        subtitle="Regras claras para garantir transparência em sessões avulsas e assinaturas."
        primaryCta={{ label: 'Falar com suporte', href: '/contato' }}
        highlights={['Transparência', 'Suporte dedicado', 'Suporte Humanizado']}
      />

      <SectionShell>
        <SectionHeader
          eyebrow="Sessão Avulsa"
          title="Planos mensais"
          subtitle="Reembolso quando a sessão não foi iniciada ou dentro do prazo permitido." />
        <div className="rounded-3xl border border-border/70 bg-surface/70 p-6 text-sm text-ink-muted">
        <ul className="list-disc space-y-2 pl-5 text-sm text-ink-muted">
              <li>Solicitações devem ser feitas em prazo razoável após a compra.</li>
              <li>Reembolso integral se a sala não foi iniciada.</li>
              <li>Se a sessão foi iniciada, avaliamos caso a caso.</li>
            </ul>
        </div>
      </SectionShell>

      <SectionShell>
        <SectionHeader
          eyebrow="Assinaturas"
          title="Planos mensais"
          subtitle="Regras para renovação e cancelamento." />
        <div className="rounded-3xl border border-border/70 bg-surface/70 p-6 text-sm text-ink-muted">
          <p>
            Assinaturas renovam automaticamente a cada ciclo. O cancelamento evita a próxima cobrança, mas não
            gera reembolso proporcional do ciclo em andamento, salvo exceções previstas em lei. Após cancelar,
            o acesso permanece liberado até a data de vencimento da assinatura atual.
          </p>
        </div>
      </SectionShell>

      <FAQ
        eyebrow="FAQ"
        title="Perguntas sobre reembolso"
        items={faqItems}
        ctaLabel=""
        ctaHref="/contato"
      />

      <CTA
        title="Precisa de ajuda?"
        subtitle="Fale com nossa equipe e resolvemos com cuidado."
        primaryCta={{ label: 'Contato', href: '/contato' }}
        secondaryCta={{ label: 'Ver planos', href: '/planos' }}
      />
    </div>
  )
}
