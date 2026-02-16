import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { CTA } from '@/components/marketing/sections/CTA'
import { FAQ } from '@/components/marketing/sections/FAQ'
import { Hero } from '@/components/marketing/sections/Hero'
import { PricingCards, type PricingPlan } from '@/components/marketing/sections/PricingCards'
import { SingleSessionPrice } from '@/components/marketing/SingleSessionPrice'
import { SectionHeader, SectionShell } from '@/components/marketing/ui'
import { getPlanConfig } from '@/lib/mahalilah/plans'
import { withSeoDefaults } from '@/lib/marketing/seo'

export const metadata: Metadata = withSeoDefaults({
  title: 'Planos',
  description:
    'Planos flexíveis para quem quer experimentar, escalar atendimentos ou conduzir grupos recorrentes.',
  openGraph: {
    title: 'Planos Maha Lilah Online',
    description:
      'Planos flexíveis para quem quer experimentar, escalar atendimentos ou conduzir grupos recorrentes.',
    url: '/planos'
  }
})

const billingFaq = [
  {
    question: 'Quais formas de pagamento estão disponíveis?',
    answer: 'Pix e cartão via Mercado Pago, com checkout rápido e seguro.'
  },
  {
    question: 'Como funciona a renovação?',
    answer: 'Planos mensais e anuais renovam automaticamente até o cancelamento.'
  },
  {
    question: 'Posso cancelar quando quiser?',
    answer: 'Sim. O cancelamento impede novas cobranças e não possui multa.'
  },
  {
    question: 'Como funciona o reembolso?',
    answer: 'As regras estão detalhadas na Política de Reembolso, com critérios transparentes.'
  }
]

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
})

const formatCurrency = (value: number) => currencyFormatter.format(value)

const getAnnualSavingsPercent = (monthlyPrice: number, yearlyPrice: number) => {
  if (!Number.isFinite(monthlyPrice) || !Number.isFinite(yearlyPrice)) return null
  if (monthlyPrice <= 0 || yearlyPrice <= 0) return null
  const annualizedMonthly = monthlyPrice * 12
  if (annualizedMonthly <= 0) return null
  const savings = ((annualizedMonthly - yearlyPrice) / annualizedMonthly) * 100
  if (savings <= 0) return null
  return Math.round(savings)
}

export const dynamic = 'force-dynamic'

export default async function PlanosPage() {
  const planConfig = await getPlanConfig()
  const unlimitedSavingsPercent = getAnnualSavingsPercent(
    planConfig.subscriptionUnlimited.monthlyPrice,
    planConfig.subscriptionUnlimited.yearlyPrice
  )
  const limitedSavingsPercent = getAnnualSavingsPercent(
    planConfig.subscriptionLimited.monthlyPrice,
    planConfig.subscriptionLimited.yearlyPrice
  )
  const limitedRoomsPerMonth =
    typeof planConfig.subscriptionLimited.roomsPerMonth === 'number' &&
    planConfig.subscriptionLimited.roomsPerMonth > 0
      ? planConfig.subscriptionLimited.roomsPerMonth
      : null
  const limitedCostPerRoom =
    limitedRoomsPerMonth !== null
      ? planConfig.subscriptionLimited.monthlyPrice / limitedRoomsPerMonth
      : null
  const unlimitedBreakEvenRooms =
    limitedCostPerRoom !== null && limitedCostPerRoom > 0
      ? Math.floor(planConfig.subscriptionUnlimited.monthlyPrice / limitedCostPerRoom) + 1
      : null
  const singleSessionLimits = planConfig.singleSession.marketing.limits.filter((item) => {
    const normalized = item.toLowerCase()
    return !normalized.includes('participante') && !normalized.includes('r$')
  })

  const planCandidates: Array<PricingPlan | null> = [
    planConfig.singleSession.isActive
      ? {
          name: planConfig.singleSession.name,
          price: (
            <SingleSessionPrice pricesByParticipants={planConfig.singleSession.pricesByParticipants} />
          ),
          description: planConfig.singleSession.description,
          forWho: planConfig.singleSession.marketing.forWho,
          includes: planConfig.singleSession.marketing.includes,
          limits: singleSessionLimits,
          cta: {
            label: planConfig.singleSession.marketing.ctaLabel,
            href: planConfig.singleSession.marketing.ctaHref
          },
          highlight: planConfig.singleSession.marketing.highlight
        }
      : null,
    planConfig.subscriptionLimited.isActive
      ? {
          name: planConfig.subscriptionLimited.name,
          price: (
            <div className="flex flex-col gap-2">
              <span>{formatCurrency(planConfig.subscriptionLimited.monthlyPrice)} / mês ou {formatCurrency(planConfig.subscriptionLimited.yearlyPrice)} / ano</span>
              {limitedCostPerRoom !== null && limitedRoomsPerMonth !== null && (
                <span className="text-xs text-ink-muted">
                  {formatCurrency(limitedCostPerRoom)} por sala ({limitedRoomsPerMonth}/mês)
                </span>
              )}
              {limitedSavingsPercent !== null && (
                <span className="inline-flex w-fit items-center rounded-full border border-gold/50 bg-gold/15 px-3 py-1 text-xs uppercase tracking-[0.12em] text-gold-soft">
                  Economize {limitedSavingsPercent}% no anual
                </span>
              )}
            </div>
          ),
          description: planConfig.subscriptionLimited.description,
          forWho: planConfig.subscriptionLimited.marketing.forWho,
          includes: planConfig.subscriptionLimited.marketing.includes,
          limits: planConfig.subscriptionLimited.marketing.limits,
          cta: {
            label: planConfig.subscriptionLimited.marketing.ctaLabel,
            href: planConfig.subscriptionLimited.marketing.ctaHref
          },
          highlight: planConfig.subscriptionLimited.marketing.highlight
        }
      : null,
    planConfig.subscriptionUnlimited.isActive
      ? {
          name: planConfig.subscriptionUnlimited.name,
          price: (
            <div className="flex flex-col gap-2">
              <span>{formatCurrency(planConfig.subscriptionUnlimited.monthlyPrice)} / mês ou {formatCurrency(planConfig.subscriptionUnlimited.yearlyPrice)} / ano</span>
              <span className="text-xs text-ink-muted">
                {unlimitedBreakEvenRooms !== null
                  ? `Salas ilimitadas — melhor custo acima de 5 salas/mês`
                  : 'Salas ilimitadas para escalar sem teto mensal'}
              </span>
              {unlimitedSavingsPercent !== null && (
                <span className="inline-flex w-fit items-center rounded-full border border-gold/50 bg-gold/15 px-3 py-1 text-xs uppercase tracking-[0.12em] text-gold-soft">
                  Economize {unlimitedSavingsPercent}% no anual
                </span>
              )}
            </div>
          ),
          description: planConfig.subscriptionUnlimited.description,
          forWho: planConfig.subscriptionUnlimited.marketing.forWho,
          includes: planConfig.subscriptionUnlimited.marketing.includes,
          limits: planConfig.subscriptionUnlimited.marketing.limits,
          cta: {
            label: planConfig.subscriptionUnlimited.marketing.ctaLabel,
            href: planConfig.subscriptionUnlimited.marketing.ctaHref
          },
          highlight: planConfig.subscriptionUnlimited.marketing.highlight
        }
      : null
  ]

  const pricingPlans = planCandidates.filter((plan): plan is PricingPlan => plan !== null)
  const limitedRoomsLabel =
    typeof planConfig.subscriptionLimited.roomsPerMonth === 'number' &&
    planConfig.subscriptionLimited.roomsPerMonth > 0
      ? String(planConfig.subscriptionLimited.roomsPerMonth)
      : '—'

  return (
    <div>
      <PricingCards
        eyebrow="Planos e benefícios"
        title="Opções para diferentes momentos da sua jornada"
        subtitle="Escolha o que faz sentido agora e ajuste depois, sem perder histórico."
        plans={pricingPlans}
      />

      <SectionShell className="pt-0 sm:pt-0 lg:pt-0">
        <div className="rounded-3xl border border-border/70 bg-surface/70 p-5 sm:p-6">
          <div className="mb-4">
            <h2 className="font-serif text-2xl text-ink sm:text-3xl">Comparativo rápido</h2>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border/70">
            <div className="grid grid-cols-[1.1fr_repeat(3,minmax(0,1fr))] bg-surface-2/70 px-4 py-2 text-xs uppercase tracking-[0.16em] text-ink-muted">
              <span>Recurso</span>
              <span className="normal-case tracking-normal text-ink-muted">
                <strong className="block text-ink">Avulsa</strong>
                <span>Vou testar / 1 sessão</span>
              </span>
              <span className="normal-case tracking-normal text-ink-muted">
                <strong className="block text-ink">Limitado</strong>
                <span>Tenho agenda fixa</span>
              </span>
              <span className="normal-case tracking-normal text-ink-muted">
                <strong className="block text-ink">Ilimitado</strong>
                <span>Atendo com frequência</span>
              </span>
            </div>
            {[
              {
                feature: 'Salas/mês',
                single: '1 sessão',
                limited: limitedRoomsLabel,
                unlimited: 'Ilimitadas'
              },
              {
                feature: 'Participantes/sala',
                single: String(planConfig.singleSession.maxParticipants),
                limited: String(planConfig.subscriptionLimited.maxParticipants),
                unlimited: String(planConfig.subscriptionUnlimited.maxParticipants)
              },
              {
                feature: 'Dicas IA por jogador',
                single: String(planConfig.singleSession.tipsPerPlayer),
                limited: String(planConfig.subscriptionLimited.tipsPerPlayer),
                unlimited: String(planConfig.subscriptionUnlimited.tipsPerPlayer)
              },
              {
                feature: 'Síntese IA por sessão',
                single: String(planConfig.singleSession.summaryLimit),
                limited: String(planConfig.subscriptionLimited.summaryLimit),
                unlimited: String(planConfig.subscriptionUnlimited.summaryLimit)
              }
            ].map((row) => (
              <div
                key={row.feature}
                className="grid grid-cols-[1.1fr_repeat(3,minmax(0,1fr))] border-t border-border/70 px-4 py-3 text-sm text-ink-muted"
              >
                <span>{row.feature}</span>
                <strong className="text-ink">{row.single}</strong>
                <strong className="text-ink">{row.limited}</strong>
                <strong className="text-ink">{row.unlimited}</strong>
              </div>
            ))}
          </div>
        </div>
      </SectionShell>

      <SectionShell>
        <SectionHeader
          eyebrow="Uso justo"
          title="Como funciona na prática"
          subtitle="Regras objetivas para manter estabilidade e qualidade para todos os usuários."
        />
        <div className="grid gap-4 rounded-3xl border border-border/70 bg-surface/70 p-5 text-sm text-ink-muted sm:grid-cols-2 sm:p-8">
          {[
            `Participantes por sala: até ${planConfig.singleSession.maxParticipants} no avulso, até ${planConfig.subscriptionUnlimited.maxParticipants} no ilimitado e até ${planConfig.subscriptionLimited.maxParticipants} no plano com franquia.`,
            planConfig.subscriptionLimited.roomsPerMonth
              ? `Plano com franquia: até ${planConfig.subscriptionLimited.roomsPerMonth} salas por mês.`
              : 'Plano com franquia: quantidade de salas definida em catálogo ativo.',
            'Salas simultâneas: o uso é pensado para condução humana em tempo real; padrões anômalos de concorrência podem exigir revisão técnica.',
            `IA com limites técnicos por sessão: ${planConfig.singleSession.tipsPerPlayer} dicas por jogador no avulso e síntese final de até ${planConfig.singleSession.summaryLimit} por sessão.`,
            'Uso excessivo: automações em massa, compartilhamento indevido de conta ou geração anômala de salas podem passar por revisão operacional.'
          ].map((item) => (
            <div key={item} className="flex items-start gap-3">
              <span className="mt-1 h-2.5 w-2.5 rounded-full bg-gold" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </SectionShell>

      <SectionShell>
        <div className="grid items-center gap-10">
          <div className="flex flex-col gap-6">
            <SectionHeader
              eyebrow="Valor percebido"
              title="Por que os planos retêm melhor"
              subtitle="Além da tecnologia, você leva consistência operacional para cada sessão."
            />
            <div className="rounded-3xl border border-border/70 bg-surface/70 p-5 text-sm text-ink-muted sm:p-6">
              <ul className="space-y-3">
                {[
                  'Menos tempo com organização manual e mais foco em presença terapêutica.',
                  'Histórico claro entre sessões, aumentando adesão dos participantes.',
                  'Fluxo previsível para grupos recorrentes e atendimentos individuais.',
                  'Uso de IA como suporte estratégico, sem perder autonomia profissional.'
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-1 h-2.5 w-2.5 rounded-full bg-gold" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-sm text-ink-muted">
              Precisa de ajuda para escolher? Fale com a equipe e montamos a melhor configuração para seu perfil.
            </p>
          </div>
        </div>
      </SectionShell>

      <SectionShell>
        <div className="grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="overflow-hidden rounded-3xl border border-border/70 bg-surface/75 p-1 shadow-soft">
            <div className="relative aspect-[16/9] overflow-hidden rounded-[1.3rem]">
              <Image
                src="/marketing/planos/ia-assistida.webp"
                alt="Fluxo de IA assistida e limites por plano"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 45vw"
              />
            </div>
          </div>
          <div className="flex flex-col gap-6">
            <SectionHeader
              eyebrow="IA assistida"
              title="Uso consciente, com limites claros"
              subtitle="Você decide quando usar IA para perguntas e fechamento, sempre com controle humano."
            />
            <div className="rounded-3xl border border-border/70 bg-surface/70 p-5 text-sm text-ink-muted sm:p-6">
              <p>
                Cada plano define quantas dicas por jogador e quantas sínteses por sessão estão disponíveis.
                Assim você evita excesso e mantém a qualidade da condução.
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
          </div>
        </div>
      </SectionShell>

      <FAQ
        eyebrow="Pagamento"
        title="Perguntas sobre cobrança e assinatura"
        items={billingFaq}
        ctaLabel="Ver política de reembolso"
        ctaHref="/politica-de-reembolso"
      />

      <SectionShell>
        <div className="rounded-3xl border border-border/70 bg-surface/70 p-5 text-sm text-ink-muted sm:p-8">
          <p>
            Ao contratar qualquer plano, você concorda com nossos{' '}
            <Link className="text-gold" href="/termos">
              Termos de uso
            </Link>{' '}
            e com a{' '}
            <Link className="text-gold" href="/privacidade">
              Política de privacidade
            </Link>
            .
          </p>
        </div>
      </SectionShell>

      
    </div>
  )
}
