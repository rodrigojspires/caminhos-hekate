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
        title="Seu consultório em uma sala viva, organizada e segura"
        subtitle="Conduza sessões com mais presença e menos esforço operacional: histórico por jogada, deck randômico, síntese assistida e visão completa da evolução."
        primaryCta={{ label: 'Experimente já', href: '/dashboard' }}
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
        </div>
      </SectionShell>

      <SectionShell>
        <div className="grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          
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
              subtitle="Emoção, intensidade, corpo, insight e ação com estrutura objetiva."
            />
            <p className="text-sm text-ink-muted">
              Você mantém linguagem viva da pessoa e ganha consistência para sessões futuras.
            </p>
          </div>
        </div>
      </SectionShell>

      <SectionShell>
        <div className="grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
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
              eyebrow="Relatório em PDF"
              title="Leve seu histórico para onde precisar"
              subtitle="Gere um relatório da sessão que pode ser compartilhado com o seu assistido."
            />
            <p className="text-sm text-ink-muted">
              Continuidade fácil aumenta percepção de valor e recorrência do acompanhamento.
            </p>
          </div>
        </div>
      </SectionShell>

      <CTA
        title="Veja todos os nossos recursos disponíveis"
        subtitle="Existem outros recursos que você pode saber que a plataforma entrega."
        primaryCta={{ label: 'Veja todos os recursos', href: '/recursos' }}
        secondaryCta={{ label: 'Falar com a equipe', href: '/contato' }}
        badges={['Dashboard integrado', 'Registro inteligente', 'Relatório em PDF']}
      />

      <FAQ
        eyebrow="FAQ"
        title="Perguntas de terapeutas"
        items={faqItems}
      />

      
    </div>
  )
}
