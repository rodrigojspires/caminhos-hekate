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
    answer: 'Entre em contato pelo formulário com dados da compra e motivo.'
  },
  {
    question: 'E se eu cancelar a assinatura?',
    answer: 'O cancelamento impede novas cobranças, mas não gera reembolso retroativo.'
  },
  {
    question: 'Como lidam com chargebacks?',
    answer: 'Chargebacks são analisados caso a caso, com registro e comprovantes.'
  }
]

export default function PoliticaDeReembolsoPage() {
  return (
    <div>
      <Hero
        eyebrow="Reembolso"
        title="Política de reembolso"
        subtitle="Regras claras para garantir transparência em sessões avulsas e assinaturas."
        primaryCta={{ label: 'Falar com suporte', href: '/contato' }}
        secondaryCta={{ label: 'Ver planos', href: '/planos' }}
        mediaLabel="Imagem: reembolso e suporte"
        highlights={['Transparência', 'Análise justa', 'Suporte dedicado']}
      />

      <SectionShell>
        <div className="grid items-start gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col gap-6">
            <SectionHeader
              eyebrow="Sessão avulsa"
              title="Condições para sessão avulsa"
              subtitle="Reembolso quando a sessão não foi iniciada ou dentro do prazo permitido."
            />
            <ul className="list-disc space-y-2 pl-5 text-sm text-ink-muted">
              <li>Solicitações devem ser feitas em prazo razoável após a compra.</li>
              <li>Reembolso integral se a sala não foi iniciada.</li>
              <li>Se a sessão foi iniciada, avaliamos caso a caso.</li>
            </ul>
          </div>
          <MediaPlaceholder variant="vertical" label="Imagem: sessão avulsa" />
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
            gera reembolso proporcional do ciclo em andamento, salvo exceções previstas em lei.
          </p>
          <p className="mt-3">
            Caso tenha problemas técnicos graves, a equipe pode avaliar reembolso parcial.
          </p>
        </div>
      </SectionShell>

      <SectionShell>
        <SectionHeader
          eyebrow="Chargebacks"
          title="Disputas e contestações"
          subtitle="Chargebacks são tratados com cuidado e transparência." />
        <div className="rounded-3xl border border-border/70 bg-surface/70 p-6 text-sm text-ink-muted">
          <p>
            Em caso de contestação, solicitamos registros e comprovantes. O objetivo é resolver de forma justa,
            respeitando usuários e regras do provedor de pagamento.
          </p>
          <p className="mt-3">
            Consulte nossos <Link className="text-gold" href="/termos">Termos de uso</Link> para detalhes.
          </p>
        </div>
      </SectionShell>

      <FAQ
        eyebrow="FAQ"
        title="Perguntas sobre reembolso"
        items={faqItems}
        ctaLabel="Falar com suporte"
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
