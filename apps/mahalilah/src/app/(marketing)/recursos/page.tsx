import type { Metadata } from 'next'
import { MediaPlaceholder } from '@/components/marketing/MediaPlaceholder'
import { CTA } from '@/components/marketing/sections/CTA'
import { FAQ } from '@/components/marketing/sections/FAQ'
import { Hero } from '@/components/marketing/sections/Hero'
import { SectionHeader, SectionShell } from '@/components/marketing/ui'
import { withSeoDefaults } from '@/lib/marketing/seo'

export const metadata: Metadata = withSeoDefaults({
  title: 'Recursos',
  description:
    'Conheça os recursos que tornam o Maha Lilah Online envolvente, seguro e com alto potencial de retenção.',
  openGraph: {
    title: 'Recursos do Maha Lilah Online',
    description:
      'Conheça os recursos que tornam o Maha Lilah Online envolvente, seguro e com alto potencial de retenção.',
    url: '/recursos'
  }
})

const faqItems = [
  {
    question: 'Posso puxar cartas em qualquer momento?',
    answer: 'Sim. O deck randômico funciona como gatilho de reflexão a qualquer momento.'
  },
  {
    question: 'O modo terapia é obrigatório?',
    answer: 'Não. Ele é opcional e fica disponível quando você quer aprofundar registro e continuidade.'
  },
  {
    question: 'A IA pode ser desligada?',
    answer: 'Sim. O uso é opcional e controlado por limites definidos no seu plano.'
  }
]

export default function RecursosPage() {
  return (
    <div>
      <Hero
        title="Uma plataforma desenhada para sessões que as pessoas querem repetir"
        subtitle="Cada recurso foi pensado para aumentar presença, clareza e continuidade: do tabuleiro ao fechamento."
        primaryCta={{ label: 'Experimente', href: '/dashboard' }}
        highlights={['Tempo real', 'Turnos claros', 'Registros por rodada', 'IA assistida']}
      />

      <SectionShell>
        <div id="sala" className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col gap-5">
            <SectionHeader
              eyebrow="Sala ao vivo"
              title="Sincronia instantânea para todos"
              subtitle="Participantes e facilitadores enxergam o mesmo contexto em tempo real."
            />
            <ul className="space-y-3 text-sm text-ink-muted">
              {[
                'Atualização em tempo real para manter ritmo coletivo.',
                'Visão compartilhada do tabuleiro sem confusão.',
                'Entrada com login para proteger identidade do grupo.'
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-gold" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <MediaPlaceholder variant="vertical" label="Sincronia do tabuleiro entre todos os jogadores" 
          imageSrc="/marketing/recursos/recurso-05.webp"
          imageAlt="Sincronia do tabuleiro entre todos os jogadores"/>
        </div>
      </SectionShell>

      <SectionShell>
        <div id="turnos" className="grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          <MediaPlaceholder
            variant="vertical"
            label="Controle de turnos e rolagens"
            imageSrc="/marketing/recursos/recurso-01.webp"
            imageAlt="Controle de turnos e rolagens"
          />
          <div className="flex flex-col gap-5">
            <SectionHeader
              eyebrow="Turnos"
              title="Ritmo claro para grupos pequenos e grandes"
              subtitle="Cada pessoa joga na sua vez com total visibilidade do processo."
            />
            <ul className="space-y-3 text-sm text-ink-muted">
              {[
                'Indicação visual de quem está no turno atual.',
                'Menos sobreposição de fala e maior escuta ativa.',
                'Facilitador com controle leve do andamento.'
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-gold" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </SectionShell>

      <SectionShell>
        <div id="deck" className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col gap-5">
            <SectionHeader
              eyebrow="Deck randômico"
              title="Cartas para abrir espaço emocional"
              subtitle="Puxe 1 a 3 cartas para iluminar perspectivas sem impor significado."
            />
            <ul className="space-y-3 text-sm text-ink-muted">
              {[
                'Gatilho de conversa quando o processo pede frescor.',
                'Uso livre em qualquer ponto da sessão.',
                'Registro conectado ao contexto da jogada.'
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-gold" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <MediaPlaceholder variant="horizontal" 
          label="Deck randômico dentro da sala" 
          imageSrc="/marketing/recursos/recurso-02.webp"
            imageAlt="Deck randômico dentro da sala"/>
        </div>
      </SectionShell>

      <SectionShell>
        <div id="modo-terapia" className="grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          <MediaPlaceholder variant="vertical" label="Modo terapia e campos estruturados" 
          imageSrc="/marketing/recursos/recurso-03.webp"
          imageAlt="Registre seus sentimentos durante o jogo"/>
          <div className="flex flex-col gap-5">
            <SectionHeader
              eyebrow="Modo terapia"
              title="Registro rápido com profundidade"
              subtitle="Organize emoção, corpo, insight e micro-ação sem interromper a experiência."
            />
            <ul className="space-y-3 text-sm text-ink-muted">
              {[
                'Menos textos longos, mais clareza operacional.',
                'Histórico automaticamente vinculado ao facilitador.',
                'Relatório em PDF para continuidade fora da plataforma.'
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-gold" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </SectionShell>

      <SectionShell>
        <div id="ia" className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col gap-5">
            <SectionHeader
              eyebrow="IA com limites"
              title="Perguntas melhores, decisões mais humanas"
              subtitle="Use IA como apoio para ampliar reflexão e finalizar com síntese objetiva."
            />
            <ul className="space-y-3 text-sm text-ink-muted">
              {[
                'Ativação opcional e transparente para o grupo.',
                'Limites por plano para preservar qualidade.',
                'Fechamento por botão com organização da sessão.'
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-gold" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <MediaPlaceholder variant="horizontal" label="Painel de IA assistida para perguntas e síntese" 
          imageSrc="/marketing/recursos/recurso-04.webp"
          imageAlt="Painel de IA assistida para perguntas e síntese"/>
        </div>
      </SectionShell>

      <FAQ
        eyebrow="FAQ"
        title="Perguntas sobre recursos"
        items={faqItems}
        
      />

     
    </div>
  )
}
