import type { Metadata } from 'next'
import Link from 'next/link'
import { MediaPlaceholder } from '@/components/marketing/MediaPlaceholder'
import { CTA } from '@/components/marketing/sections/CTA'
import { FAQ } from '@/components/marketing/sections/FAQ'
import { Hero } from '@/components/marketing/sections/Hero'
import { PricingCards } from '@/components/marketing/sections/PricingCards'
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

const formatParticipantRange = (participants: number[]) => {
  const sorted = [...participants].sort((a, b) => a - b)
  if (sorted.length === 1) {
    return `${sorted[0]} participante`
  }
  if (sorted.length === 2 && sorted[1] === sorted[0] + 1) {
    return `${sorted[0]}–${sorted[1]} participantes`
  }
  return `${sorted.join(', ')} participantes`
}

export default function PlanosPage() {
  const planConfig = getPlanConfig()
  const singleSessionEntries = Object.entries(planConfig.singleSession.pricesByParticipants)
    .map(([participants, price]) => ({ participants: Number(participants), price }))
    .sort((a, b) => a.participants - b.participants)
  const maxSingleParticipants = Math.max(...singleSessionEntries.map((entry) => entry.participants))
  const groupedPrices = singleSessionEntries.reduce<Record<string, number[]>>((acc, entry) => {
    const key = String(entry.price)
    if (!acc[key]) acc[key] = []
    acc[key].push(entry.participants)
    return acc
  }, {})
  const priceByParticipantsLabel = Object.entries(groupedPrices)
    .map(([price, participants]) => `${formatParticipantRange(participants)}: ${formatCurrency(Number(price))}`)
    .join(' · ')

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
        plans={[
          {
            name: 'Sessão avulsa',
            price: (
              <SingleSessionPrice pricesByParticipants={planConfig.singleSession.pricesByParticipants} />
            ),
            description: 'Para experimentar ou facilitar uma sessão pontual.',
            forWho: 'Autoguiado, terapeutas iniciando ou grupos eventuais.',
            includes: [
              '1 sala ao vivo',
              'Convites por e-mail',
              'Deck randômico e modo terapia',
              `Dicas de IA: ${planConfig.singleSession.tipsPerPlayer} por jogador/sessão`,
              `Síntese final por IA: ${planConfig.singleSession.summaryLimit} por sessão`
            ],
            limits: [
              `Participantes por sessão: até ${maxSingleParticipants}`,
              priceByParticipantsLabel
            ],
            cta: { label: 'Comprar sessão', href: '/checkout' }
          },
          {
            name: 'Mensal ilimitado',
            price: `${formatCurrency(planConfig.subscriptionUnlimited.monthlyPrice)} / mês`,
            description: 'Para quem facilita com frequência alta e precisa de flexibilidade.',
            forWho: 'Terapeutas e facilitadores com agenda ativa.',
            includes: [
              'Salas ilimitadas no mês',
              `Até ${planConfig.subscriptionUnlimited.maxParticipants} participantes por sala`,
              'Histórico completo e export',
              'Relatórios e síntese por IA',
              'Suporte prioritário'
            ],
            limits: [
              `Dicas de IA: ${planConfig.subscriptionUnlimited.tipsPerPlayer} por jogador/sessão`,
              `Síntese final por IA: ${planConfig.subscriptionUnlimited.summaryLimit} por sessão`,
              'Políticas de uso justo'
            ],
            cta: { label: 'Assinar ilimitado', href: '/checkout' },
            highlight: true
          },
          {
            name: `Mensal ${planConfig.subscriptionLimited.roomsPerMonth} salas`,
            price: `${formatCurrency(planConfig.subscriptionLimited.monthlyPrice)} / mês`,
            description: 'Para ritmos regulares com previsibilidade de custos.',
            forWho: 'Profissionais com número fixo de grupos por mês.',
            includes: [
              `${planConfig.subscriptionLimited.roomsPerMonth} salas por mês`,
              'Convites por e-mail',
              `Até ${planConfig.subscriptionLimited.maxParticipants} participantes por sala`,
              'Deck randômico + modo terapia'
            ],
            limits: [
              `Dicas de IA: ${planConfig.subscriptionLimited.tipsPerPlayer} por jogador/sessão`,
              `Síntese final por IA: ${planConfig.subscriptionLimited.summaryLimit} por sessão`,
              'Salas extras cobradas à parte'
            ],
            cta: { label: 'Assinar plano', href: '/checkout' }
          }
        ]}
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
              <p className="mt-3 text-xs uppercase tracking-[0.2em] text-ink-muted">
                Sessão avulsa: {planConfig.singleSession.tipsPerPlayer} dicas/jogador · {planConfig.singleSession.summaryLimit} síntese.
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.2em] text-ink-muted">
                Mensal ilimitado: {planConfig.subscriptionUnlimited.tipsPerPlayer} dicas/jogador · {planConfig.subscriptionUnlimited.summaryLimit} sínteses.
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.2em] text-ink-muted">
                Mensal {planConfig.subscriptionLimited.roomsPerMonth} salas: {planConfig.subscriptionLimited.tipsPerPlayer} dicas/jogador · {planConfig.subscriptionLimited.summaryLimit} síntese.
              </p>
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
