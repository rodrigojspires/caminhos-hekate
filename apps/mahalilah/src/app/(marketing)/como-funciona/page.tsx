import type { Metadata } from 'next'
import { MediaPlaceholder } from '@/components/marketing/MediaPlaceholder'
import { CTA } from '@/components/marketing/sections/CTA'
import { FAQ } from '@/components/marketing/sections/FAQ'
import { Hero } from '@/components/marketing/sections/Hero'
import { SectionHeader, SectionShell } from '@/components/marketing/ui'

export const metadata: Metadata = {
  title: 'Como funciona',
  description: 'Do convite ao resumo final: entenda o fluxo completo de uma sessão no Maha Lilah Online.',
  openGraph: {
    title: 'Como funciona o Maha Lilah Online',
    description: 'Do convite ao resumo final: entenda o fluxo completo de uma sessão no Maha Lilah Online.',
    url: '/como-funciona'
  }
}

const faqItems = [
  {
    question: 'Cada jogador rola o próprio dado?',
    answer: 'Sim. O turno é individual e cada pessoa faz sua rolagem na sua vez.'
  },
  {
    question: 'Posso puxar cartas fora do tabuleiro?',
    answer: 'Sim. O deck randômico permite puxar 1 a 3 cartas a qualquer momento.'
  },
  {
    question: 'A síntese por IA é obrigatória?',
    answer: 'Não. Ela fica disponível por botão, dentro dos limites do plano.'
  }
]

export default function ComoFuncionaPage() {
  return (
    <div>
      <Hero
        eyebrow="Como funciona"
        title="Do convite ao resumo final — em uma sala ao vivo"
        subtitle="Um fluxo claro para conduzir jornadas terapêuticas em tempo real, com registros e apoio de IA quando necessário."
        primaryCta={{ label: 'Ver planos', href: '/planos' }}
        secondaryCta={{ label: 'Recursos', href: '/recursos' }}
        mediaLabel="Vídeo curto: fluxo completo da sessão"
      />

      <SectionShell>
        <div className="grid items-start gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col gap-6">
            <SectionHeader
              eyebrow="Fluxo da sessão"
              title="Da entrada ao fechamento, em 8 passos"
              subtitle="Cada etapa garante clareza para o grupo e continuidade para o acompanhamento terapêutico."
            />
            <ol className="space-y-4 text-sm text-ink-muted">
              {[
                'Login na plataforma',
                'Compra via Mercado Pago',
                'Criar sala ao vivo',
                'Convidar jogadores por e-mail (vínculo de conta)',
                'Consentimento inicial registrado',
                'Turnos: cada jogador rola o dado na sua vez',
                'Puxar cartas randômicas (1 a 3) quando desejar',
                'Resumo final por IA (botão)'
              ].map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full border border-gold/70 text-xs text-gold">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
          <MediaPlaceholder variant="vertical" label="Screenshot: timeline da sessão" />
        </div>
      </SectionShell>

      <SectionShell>
        <SectionHeader
          eyebrow="Registro"
          title="O que fica salvo"
          subtitle="Tudo o que acontece na sala fica organizado para revisão e acompanhamento."
        />
        <div className="grid gap-4 rounded-3xl border border-border/70 bg-surface/70 p-8 text-sm text-ink-muted sm:grid-cols-2">
          {[
            'Jogadas, caminhos e rolagens',
            'Cartas puxadas do deck randômico',
            'Registros terapêuticos por jogada',
            'Sínteses de IA (quando usadas)',
            'Consentimentos e combinados',
            'Histórico no perfil do terapeuta'
          ].map((item) => (
            <div key={item} className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-teal" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </SectionShell>

      <SectionShell>
        <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <MediaPlaceholder variant="horizontal" label="Imagem: boas práticas terapêuticas" />
          <div className="flex flex-col gap-6">
            <SectionHeader
              eyebrow="Boas práticas"
              title="Condução terapêutica com cuidado"
              subtitle="Recomendações para manter o ambiente seguro e acolhedor."
            />
            <ul className="list-disc space-y-2 pl-5 text-sm text-ink-muted">
              <li>Alinhe expectativas e combinados antes de iniciar.</li>
              <li>Respeite pausas e sinais de cansaço.</li>
              <li>Registre apenas o essencial para preservar a linguagem da pessoa.</li>
              <li>Use a IA apenas como apoio, dentro dos limites.</li>
              <li>Evite interpretar cartas como verdades absolutas.</li>
              <li>Finalize com um fechamento emocional seguro.</li>
            </ul>
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">
              Não substitui terapia ou atendimento médico.
            </p>
          </div>
        </div>
      </SectionShell>

      <FAQ
        eyebrow="Perguntas"
        title="Dúvidas rápidas sobre o fluxo"
        items={faqItems}
        ctaLabel="Ver FAQ completa"
        ctaHref="/faq"
      />

      <CTA
        title="Pronto para facilitar sua primeira sessão?"
        subtitle="Escolha o plano ideal e conduza sua sala com calma e segurança."
        primaryCta={{ label: 'Ver planos', href: '/planos' }}
        secondaryCta={{ label: 'Falar com a equipe', href: '/contato' }}
      />
    </div>
  )
}
