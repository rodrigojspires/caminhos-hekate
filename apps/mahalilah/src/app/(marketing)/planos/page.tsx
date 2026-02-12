import type { Metadata } from 'next'
import Link from 'next/link'
import { MediaPlaceholder } from '@/components/marketing/MediaPlaceholder'
import { CTA } from '@/components/marketing/sections/CTA'
import { FAQ } from '@/components/marketing/sections/FAQ'
import { Hero } from '@/components/marketing/sections/Hero'
import { PricingCards, type PricingPlan } from '@/components/marketing/sections/PricingCards'
import { SingleSessionPrice } from '@/components/marketing/SingleSessionPrice'
import { SectionHeader, SectionShell } from '@/components/marketing/ui'
import { getPlanConfig } from '@/lib/mahalilah/plans'

export const metadata: Metadata = {
  title: 'Planos',
  description: 'Escolha entre sessão avulsa, assinatura mensal ilimitada ou plano com salas mensais.',
  openGraph: {
    title: 'Planos Maha Lilah Online',
    description: 'Sessão avulsa ou assinaturas com limites claros e checkout via Mercado Pago.',
    url: '/planos'
  }
}

const billingFaq = [
  {
    question: 'Quais formas de pagamento estão disponíveis?',
    answer: 'Pix e cartão via Mercado Pago. O checkout é seguro e rápido.'
  },
  {
    question: 'Como funciona a renovação?',
    answer: 'Planos mensais renovam automaticamente até cancelamento.'
  },
  {
    question: 'Posso cancelar quando quiser?',
    answer: 'Sim. O cancelamento impede a próxima cobrança, sem multas.'
  },
  {
    question: 'E o reembolso?',
    answer: 'Veja os critérios completos na política de reembolso.'
  }
]

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
})

const formatCurrency = (value: number) => currencyFormatter.format(value)

export const dynamic = 'force-dynamic'

export default async function PlanosPage() {
  const planConfig = await getPlanConfig()

  const pricingPlans: PricingPlan[] = [
    planConfig.singleSession.isActive
      ? {
          name: planConfig.singleSession.name,
          price: (
            <SingleSessionPrice pricesByParticipants={planConfig.singleSession.pricesByParticipants} />
          ),
          description: planConfig.singleSession.description,
          forWho: planConfig.singleSession.marketing.forWho,
          includes: planConfig.singleSession.marketing.includes,
          limits: planConfig.singleSession.marketing.limits,
          cta: {
            label: planConfig.singleSession.marketing.ctaLabel,
            href: planConfig.singleSession.marketing.ctaHref,
          },
          highlight: planConfig.singleSession.marketing.highlight
        }
      : null,
    planConfig.subscriptionUnlimited.isActive
      ? {
          name: planConfig.subscriptionUnlimited.name,
          price: `${formatCurrency(planConfig.subscriptionUnlimited.monthlyPrice)} / mês`,
          description: planConfig.subscriptionUnlimited.description,
          forWho: planConfig.subscriptionUnlimited.marketing.forWho,
          includes: planConfig.subscriptionUnlimited.marketing.includes,
          limits: planConfig.subscriptionUnlimited.marketing.limits,
          cta: {
            label: planConfig.subscriptionUnlimited.marketing.ctaLabel,
            href: planConfig.subscriptionUnlimited.marketing.ctaHref,
          },
          highlight: planConfig.subscriptionUnlimited.marketing.highlight
        }
      : null,
    planConfig.subscriptionLimited.isActive
      ? {
          name: planConfig.subscriptionLimited.name,
          price: `${formatCurrency(planConfig.subscriptionLimited.monthlyPrice)} / mês`,
          description: planConfig.subscriptionLimited.description,
          forWho: planConfig.subscriptionLimited.marketing.forWho,
          includes: planConfig.subscriptionLimited.marketing.includes,
          limits: planConfig.subscriptionLimited.marketing.limits,
          cta: {
            label: planConfig.subscriptionLimited.marketing.ctaLabel,
            href: planConfig.subscriptionLimited.marketing.ctaHref,
          },
          highlight: planConfig.subscriptionLimited.marketing.highlight
        }
      : null
  ].filter((plan): plan is PricingPlan => Boolean(plan))

  return (
    <div>
      <Hero
        eyebrow="Planos"
        title="Escolha o formato ideal"
        subtitle="Sessão avulsa para experimentar ou assinaturas para quem conduz com frequência."
        primaryCta={{ label: 'Assinar', href: '/checkout' }}
        secondaryCta={{ label: 'Como funciona', href: '/como-funciona' }}
        mediaLabel="Imagem: comparativo de planos e limites"
      />

      <PricingCards
        eyebrow="Planos e limites"
        title="Opções para diferentes ritmos"
        subtitle="Cada plano tem limites de salas e uso de IA definidos para manter qualidade e segurança."
        plans={pricingPlans}
      />

      <SectionShell>
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col gap-6">
            <SectionHeader
              eyebrow="IA com limites"
              title="Uso consciente e controlado"
              subtitle="A IA oferece perguntas e uma síntese final por botão, sempre com limites definidos por plano."
            />
            <div className="rounded-2xl border border-border/70 bg-surface/70 p-5 text-sm text-ink-muted">
              <p>
                Cada jogador tem direito a um número configurável de dicas por sessão, além de síntese final
                dentro do limite de cada plano.
              </p>
              {planConfig.singleSession.isActive && (
                <p className="mt-3 text-xs uppercase tracking-[0.2em] text-ink-muted">
                  {planConfig.singleSession.marketing.aiSummaryLabel}
                </p>
              )}
              {planConfig.subscriptionUnlimited.isActive && (
                <p className="mt-2 text-xs uppercase tracking-[0.2em] text-ink-muted">
                  {planConfig.subscriptionUnlimited.marketing.aiSummaryLabel}
                </p>
              )}
              {planConfig.subscriptionLimited.isActive && (
                <p className="mt-2 text-xs uppercase tracking-[0.2em] text-ink-muted">
                  {planConfig.subscriptionLimited.marketing.aiSummaryLabel}
                </p>
              )}
            </div>
            <p className="text-sm text-ink-muted">
              A IA não substitui terapia. Ela organiza registros e sugere perguntas, mas a condução é sempre humana.
            </p>
          </div>
          <MediaPlaceholder variant="vertical" label="Imagem: painel de limites de IA" />
        </div>
      </SectionShell>

      <FAQ
        eyebrow="Pagamento"
        title="Perguntas sobre cobrança"
        items={billingFaq}
        ctaLabel="Ver política de reembolso"
        ctaHref="/politica-de-reembolso"
      />

      <SectionShell>
        <div className="rounded-3xl border border-border/70 bg-surface/70 p-5 text-sm text-ink-muted sm:p-8">
          <p>
            Ao assinar, você concorda com nossos <Link className="text-gold" href="/termos">Termos de uso</Link>
            {' '}e com a <Link className="text-gold" href="/privacidade">Política de privacidade</Link>.
          </p>
        </div>
      </SectionShell>

      <CTA
        title="Escolha seu plano e comece"
        subtitle="Sessão avulsa para testar ou assinatura para quem precisa de continuidade."
        primaryCta={{ label: 'Assinar agora', href: '/checkout' }}
        secondaryCta={{ label: 'Falar com vendas', href: '/contato' }}
      />
    </div>
  )
}
