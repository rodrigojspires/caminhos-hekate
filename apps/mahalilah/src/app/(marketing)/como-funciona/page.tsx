import type { Metadata } from 'next'
import { MediaPlaceholder } from '@/components/marketing/MediaPlaceholder'
import { CTA } from '@/components/marketing/sections/CTA'
import { FAQ } from '@/components/marketing/sections/FAQ'
import { Hero } from '@/components/marketing/sections/Hero'
import { SessionFlowTimeline } from '@/components/marketing/sections/SessionFlowTimeline'
import { SectionHeader, SectionShell } from '@/components/marketing/ui'
import { withSeoDefaults } from '@/lib/marketing/seo'

export const metadata: Metadata = withSeoDefaults({
  title: 'Como funciona',
  description:
    'Entenda o fluxo completo do Maha Lilah Online, do convite ao fechamento com síntese assistida.',
  openGraph: {
    title: 'Como funciona o Maha Lilah Online',
    description:
      'Entenda o fluxo completo do Maha Lilah Online, do convite ao fechamento com síntese assistida.',
    url: '/como-funciona'
  }
})

const faqItems = [
  {
    question: 'Cada jogador rola o próprio dado?',
    answer: 'Sim. A rolagem é individual e respeita a ordem do grupo.'
  },
  {
    question: 'Posso puxar cartas fora do tabuleiro?',
    answer: 'Sim. O deck randômico pode ser acionado a qualquer momento, com 1 a 3 cartas.'
  },
  {
    question: 'A síntese por IA é automática?',
    answer: 'Não. Ela aparece por botão, dentro do limite do plano e com decisão humana.'
  }
]

const sessionFlowSteps = [
  {
    title: 'Acesse com login seguro',
    imageSrc: '/marketing/como-funciona/fluxo-01.webp'
  },
  {
    title: 'Escolha sessão avulsa ou assinatura',
    imageSrc: '/marketing/como-funciona/fluxo-02.webp'
  },
  {
    title: 'Crie uma sala ao vivo em segundos',
    imageSrc: '/marketing/como-funciona/fluxo-03.webp'
  },
  {
    title: 'Convide participantes por e-mail',
    imageSrc: '/marketing/como-funciona/fluxo-04.webp'
  },
  {
    title: 'Registre consentimento inicial',
    imageSrc: '/marketing/como-funciona/fluxo-05.webp'
  },
  {
    title: 'Conduza as jogadas por turno',
    imageSrc: '/marketing/como-funciona/fluxo-06.webp'
  },
  {
    title: 'Use cartas randômicas para abrir novas perguntas',
    imageSrc: '/marketing/como-funciona/fluxo-07.webp'
  },
  {
    title: 'Finalize com síntese assistida por IA',
    imageSrc: '/marketing/como-funciona/fluxo-08.webp'
  }
]

export default function ComoFuncionaPage() {
  return (
    <div>
      <Hero
        title="Fluxo simples para sessões profundas"
        subtitle="Você entra, cria a sala, se for sala em grupo convida participantes e conduz uma experiência ao vivo com rastro terapêutico completo."
        primaryCta={{ label: 'Ver planos', href: '/planos' }}
        secondaryCta={{ label: 'Falar com a equipe', href: '/contato' }}
        mediaLabel="Vídeo curto com a jornada completa em tempo real"
        highlights={['Assistência com IA', 'Autoguiado', 'Histórico por sessão']}
      />

      <SectionShell>
        <div className="flex flex-col gap-6">
          <SectionHeader
            eyebrow="Fluxo da sessão"
            title="Da entrada ao fechamento em 8 etapas"
            subtitle="Uma estrutura clara para conduzir com segurança, sem perder espontaneidade."
          />
          <SessionFlowTimeline steps={sessionFlowSteps} />
        </div>
      </SectionShell>

      <SectionShell>
        <SectionHeader
          eyebrow="O que fica registrado"
          title="Memória terapêutica sem retrabalho"
          subtitle="Tudo o que importa para continuidade, acompanhamento e evolução."
        />
        <div className="grid gap-4 rounded-3xl border border-border/70 bg-surface/70 p-5 text-sm text-ink-muted sm:grid-cols-2 sm:p-8">
          {[
            'Jogadas e movimentações no tabuleiro',
            'Cartas puxadas e contexto de uso',
            'Registros terapêuticos por rodada',
            'Sínteses finais quando acionadas',
            'Consentimentos e acordos da sessão',
            'Histórico no perfil do facilitador'
          ].map((item) => (
            <div key={item} className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-teal" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </SectionShell>

      <FAQ
        eyebrow="Perguntas"
        title="Dúvidas sobre o fluxo"
        items={faqItems}
        ctaLabel="Ver FAQ completa"
        ctaHref="/faq"
      />

      <CTA
        title="Agora que você viu o fluxo, é só entrar e conduzir"
        subtitle="Teste o ciclo completo na prática e sinta a diferença de uma experiência viva."
        secondaryCta={{ label: 'Falar com a equipe', href: '/contato' }}
        badges={['Onboarding rápido', 'Sem setup técnico complexo']}
      />
    </div>
  )
}
