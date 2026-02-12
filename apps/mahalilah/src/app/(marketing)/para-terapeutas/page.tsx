import type { Metadata } from 'next'
import { MediaPlaceholder } from '@/components/marketing/MediaPlaceholder'
import { CTA } from '@/components/marketing/sections/CTA'
import { FAQ } from '@/components/marketing/sections/FAQ'
import { Hero } from '@/components/marketing/sections/Hero'
import { SectionHeader, SectionShell } from '@/components/marketing/ui'

export const metadata: Metadata = {
  title: 'Para terapeutas',
  description:
    'Conduza atendimentos e grupos com mais presença, menos retrabalho e continuidade entre sessões.',
  openGraph: {
    title: 'Maha Lilah Online para terapeutas',
    description:
      'Conduza atendimentos e grupos com mais presença, menos retrabalho e continuidade entre sessões.',
    url: '/para-terapeutas'
  }
}

const faqItems = [
  {
    question: 'Posso exportar os registros?',
    answer: 'Sim. O export em TXT/JSON facilita integração ao seu fluxo de acompanhamento.'
  },
  {
    question: 'A IA substitui o terapeuta?',
    answer: 'Não. A IA é apoio opcional para perguntas e síntese final; a condução segue humana.'
  },
  {
    question: 'O histórico fica salvo no meu perfil?',
    answer: 'Sim. Cada sessão alimenta seu histórico para retomadas rápidas.'
  }
]

export default function ParaTerapeutasPage() {
  return (
    <div>
      <Hero
        eyebrow="Para terapeutas"
        title="Seu consultório em uma sala viva, organizada e segura"
        subtitle="Conduza sessões com mais presença e menos esforço operacional: histórico por jogada, deck randômico, síntese assistida e visão completa da evolução."
        primaryCta={{ label: 'Criar minha primeira sala', href: '/login' }}
        secondaryCta={{ label: 'Ver planos', href: '/planos' }}
        mediaLabel="Terapeuta acompanhando sessão com painel em tempo real"
        highlights={['Histórico completo', 'Export rápido', 'Convites por e-mail']}
      />

      <SectionShell>
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col gap-5">
            <SectionHeader
              eyebrow="Dashboard clínico"
              title="Visão clara de tudo que está em andamento"
              subtitle="Acompanhe sessões ativas, concluídas e próximas ações em um único painel."
            />
            <p className="text-sm text-ink-muted">
              Menos tempo organizando contexto e mais tempo conduzindo com qualidade e presença terapêutica.
            </p>
          </div>
          <MediaPlaceholder variant="horizontal" label="Dashboard de sessões e andamento clínico" />
        </div>
      </SectionShell>

      <SectionShell>
        <div className="grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          <MediaPlaceholder variant="vertical" label="Convites por e-mail com controle de acesso" />
          <div className="flex flex-col gap-5">
            <SectionHeader
              eyebrow="Confiança"
              title="Convites com identidade confirmada"
              subtitle="Cada participante entra com conta vinculada ao e-mail, preservando segurança e rastreabilidade."
            />
            <p className="text-sm text-ink-muted">
              Esse controle reduz ruído na sessão e aumenta segurança para temas sensíveis.
            </p>
          </div>
        </div>
      </SectionShell>

      <SectionShell>
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col gap-5">
            <SectionHeader
              eyebrow="Registro terapêutico"
              title="Anote o essencial sem perder fluidez"
              subtitle="Emoção, intensidade, corpo, insight e micro-ação com estrutura objetiva."
            />
            <p className="text-sm text-ink-muted">
              Você mantém linguagem viva da pessoa e ganha consistência para sessões futuras.
            </p>
          </div>
          <MediaPlaceholder variant="horizontal" label="Registro por jogada no modo terapia" />
        </div>
      </SectionShell>

      <SectionShell>
        <div className="grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          <MediaPlaceholder variant="vertical" label="Síntese assistida por IA no fechamento" />
          <div className="flex flex-col gap-5">
            <SectionHeader
              eyebrow="Síntese final"
              title="Feche a sessão com mais clareza"
              subtitle="Organize pontos-chave em segundos para apoiar devolutivas e continuidade."
            />
            <p className="text-sm text-ink-muted">
              IA com limites e supervisão humana para preservar qualidade da sua escuta.
            </p>
          </div>
        </div>
      </SectionShell>

      <SectionShell>
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col gap-5">
            <SectionHeader
              eyebrow="Export e continuidade"
              title="Leve seu histórico para onde precisar"
              subtitle="Exporte os dados da sessão e integre ao seu processo clínico sem retrabalho."
            />
            <p className="text-sm text-ink-muted">
              Continuidade fácil aumenta percepção de valor e recorrência do acompanhamento.
            </p>
          </div>
          <MediaPlaceholder variant="horizontal" label="Export de dados terapêuticos em TXT e JSON" />
        </div>
      </SectionShell>

      <SectionShell>
        <SectionHeader
          eyebrow="Casos de uso"
          title="Situações em que terapeutas mais usam o Maha Lilah"
          subtitle="Estrutura para trabalhar profundidade com segurança e progressão."
        />
        <div className="grid gap-4 rounded-3xl border border-border/70 bg-surface/70 p-5 text-sm text-ink-muted sm:grid-cols-2 sm:p-8">
          {[
            'Travas recorrentes e padrões de repetição',
            'Momentos de decisão com conflito emocional',
            'Reconstrução de limites em relações',
            'Integração entre insight e ação concreta',
            'Condução de grupos terapêuticos pequenos',
            'Sessões de continuidade com histórico comparável'
          ].map((item) => (
            <div key={item} className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-gold" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </SectionShell>

      <FAQ
        eyebrow="FAQ"
        title="Perguntas de terapeutas"
        items={faqItems}
        ctaLabel="Ver planos"
        ctaHref="/planos"
      />

      <CTA
        title="Transforme cada sessão em continuidade real"
        subtitle="Crie sua sala, convide seus clientes e conduza com mais presença e menos fricção."
        primaryCta={{ label: 'Criar minha sala', href: '/login' }}
        secondaryCta={{ label: 'Ver planos', href: '/planos' }}
        badges={['Dashboard clínico', 'Registro inteligente', 'Export imediato']}
      />
    </div>
  )
}
