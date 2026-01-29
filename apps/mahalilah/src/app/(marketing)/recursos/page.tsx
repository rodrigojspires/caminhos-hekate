import type { Metadata } from 'next'
import { MediaPlaceholder } from '@/components/marketing/MediaPlaceholder'
import { CTA } from '@/components/marketing/sections/CTA'
import { FAQ } from '@/components/marketing/sections/FAQ'
import { Hero } from '@/components/marketing/sections/Hero'
import { SectionHeader, SectionShell } from '@/components/marketing/ui'

export const metadata: Metadata = {
  title: 'Recursos',
  description: 'Deck randômico, modo terapia, tempo real e síntese por IA: tudo dentro da sala.',
  openGraph: {
    title: 'Recursos do Maha Lilah Online',
    description: 'Deck randômico, modo terapia, tempo real e síntese por IA: tudo dentro da sala.',
    url: '/recursos'
  }
}

const faqItems = [
  {
    question: 'Posso puxar cartas em qualquer momento?',
    answer: 'Sim. O deck randômico permite puxar 1 a 3 cartas quando fizer sentido.'
  },
  {
    question: 'O modo terapia é obrigatório?',
    answer: 'Não. Ele é uma camada opcional de registro para quem deseja acompanhar detalhes.'
  },
  {
    question: 'A IA pode ser desativada?',
    answer: 'Sim. O uso é sempre opcional e limitado por plano.'
  }
]

export default function RecursosPage() {
  return (
    <div>
      <Hero
        eyebrow="Recursos"
        title="Tudo o que você precisa dentro da sala"
        subtitle="Tempo real, turnos claros, deck randômico, modo terapia e IA com limites — em um fluxo único."
        primaryCta={{ label: 'Experimentar', href: '/login' }}
        secondaryCta={{ label: 'Ver planos', href: '/planos' }}
        mediaLabel="Imagem: painel completo de recursos"
      />

      <SectionShell>
        <div id="sala" className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col gap-5">
            <SectionHeader
              eyebrow="Sala ao vivo"
              title="Tempo real e sincronizado"
              subtitle="Todos veem o mesmo tabuleiro e acompanham jogadas em tempo real."
            />
            <ul className="list-disc space-y-2 pl-5 text-sm text-ink-muted">
              <li>Sala online com atualização instantânea.</li>
              <li>Visibilidade completa para facilitadores e terapeutas.</li>
              <li>Controle de participantes via login.</li>
            </ul>
          </div>
          <MediaPlaceholder variant="horizontal" label="Screenshot: sala ao vivo" />
        </div>
      </SectionShell>

      <SectionShell>
        <div id="turnos" className="grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          <MediaPlaceholder variant="vertical" label="Screenshot: turnos e rolagens" />
          <div className="flex flex-col gap-5">
            <SectionHeader
              eyebrow="Turnos"
              title="Rolagens com clareza"
              subtitle="Cada jogador rola o próprio dado na sua vez, mantendo o ritmo do grupo."
            />
            <ul className="list-disc space-y-2 pl-5 text-sm text-ink-muted">
              <li>Indicação clara do jogador da vez.</li>
              <li>Sequência organizada para grupos grandes.</li>
              <li>Controle suave pelo facilitador.</li>
            </ul>
          </div>
        </div>
      </SectionShell>

      <SectionShell>
        <div id="deck" className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col gap-5">
            <SectionHeader
              eyebrow="Deck randômico"
              title="Cartas que abrem perguntas"
              subtitle="Puxe 1 a 3 cartas a qualquer momento, independente da casa."
            />
            <ul className="list-disc space-y-2 pl-5 text-sm text-ink-muted">
              <li>Cartas como disparadores, não respostas finais.</li>
              <li>Uso livre conforme o ritmo da sessão.</li>
              <li>Registros vinculados a cada carta puxada.</li>
            </ul>
          </div>
          <MediaPlaceholder variant="horizontal" label="Screenshot: deck randômico" />
        </div>
      </SectionShell>

      <SectionShell>
        <div id="modo-terapia" className="grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          <MediaPlaceholder variant="vertical" label="Screenshot: modo terapia" />
          <div className="flex flex-col gap-5">
            <SectionHeader
              eyebrow="Modo terapia"
              title="Registre o essencial"
              subtitle="Campos guiados para emoção, intensidade, insight, corpo e micro-ação."
            />
            <ul className="list-disc space-y-2 pl-5 text-sm text-ink-muted">
              <li>Registro breve, consistente e comparável.</li>
              <li>Histórico automático no perfil do terapeuta.</li>
              <li>Export fácil para TXT/JSON.</li>
            </ul>
          </div>
        </div>
      </SectionShell>

      <SectionShell>
        <div id="ia" className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col gap-5">
            <SectionHeader
              eyebrow="IA com limites"
              title="Perguntas e síntese final"
              subtitle="Dicas limitadas por jogador e sessão, com síntese final por botão."
            />
            <ul className="list-disc space-y-2 pl-5 text-sm text-ink-muted">
              <li>Uso opcional, sempre com controle humano.</li>
              <li>Resumo final organizado para revisão rápida.</li>
              <li>Limites configurados conforme o plano.</li>
            </ul>
          </div>
          <MediaPlaceholder variant="horizontal" label="Screenshot: painel de IA" />
        </div>
      </SectionShell>

      <FAQ
        eyebrow="FAQ"
        title="Perguntas sobre recursos"
        items={faqItems}
        ctaLabel="Ver planos"
        ctaHref="/planos"
      />

      <CTA
        title="Experimente na prática"
        subtitle="Entre na plataforma e crie sua primeira sala ao vivo."
        primaryCta={{ label: 'Entrar', href: '/login' }}
        secondaryCta={{ label: 'Ver planos', href: '/planos' }}
      />
    </div>
  )
}
