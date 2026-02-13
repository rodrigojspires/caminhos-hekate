import type { Metadata } from 'next'
import { MediaPlaceholder } from '@/components/marketing/MediaPlaceholder'
import { CTA } from '@/components/marketing/sections/CTA'
import { FAQ } from '@/components/marketing/sections/FAQ'
import { Hero } from '@/components/marketing/sections/Hero'
import { SectionHeader, SectionShell } from '@/components/marketing/ui'

export const metadata: Metadata = {
  title: 'Como funciona',
  description:
    'Entenda o fluxo completo do Maha Lilah Online, do convite ao fechamento com síntese assistida.',
  openGraph: {
    title: 'Como funciona o Maha Lilah Online',
    description:
      'Entenda o fluxo completo do Maha Lilah Online, do convite ao fechamento com síntese assistida.',
    url: '/como-funciona'
  }
}

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

export default function ComoFuncionaPage() {
  return (
    <div>
      <Hero
        eyebrow="Como funciona"
        title="Fluxo simples para sessões profundas"
        subtitle="Você entra, cria a sala, convida participantes e conduz uma experiência ao vivo com rastro terapêutico completo."
        primaryCta={{ label: 'Ver planos', href: '/planos' }}
        secondaryCta={{ label: 'Falar com a equipe', href: '/contato' }}
        mediaLabel="Vídeo curto com a jornada completa em tempo real"
        highlights={['Convite por e-mail', 'Turnos organizados', 'Histórico por sessão']}
      />

      <SectionShell>
        <div className="grid items-start gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col gap-6">
            <SectionHeader
              eyebrow="Fluxo da sessão"
              title="Da entrada ao fechamento em 8 etapas"
              subtitle="Uma estrutura clara para conduzir com segurança, sem perder espontaneidade."
            />
            <ol className="space-y-4 text-sm text-ink-muted">
              {[
                'Acesse com login seguro',
                'Escolha sessão avulsa ou assinatura',
                'Crie uma sala ao vivo em segundos',
                'Convide participantes por e-mail',
                'Registre consentimento inicial',
                'Conduza as jogadas por turno',
                'Use cartas randômicas para abrir novas perguntas',
                'Finalize com síntese assistida por IA'
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
          <MediaPlaceholder variant="vertical" label="Timeline visual da sessão ao vivo" />
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

      <SectionShell>
        <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <MediaPlaceholder variant="horizontal" label="Boas práticas de condução terapêutica" />
          <div className="flex flex-col gap-6">
            <SectionHeader
              eyebrow="Boas práticas"
              title="Como manter a experiência segura e envolvente"
              subtitle="Retenção e transformação nascem de ambiente seguro, ritmo claro e fechamento consciente."
            />
            <ul className="space-y-3 text-sm text-ink-muted">
              {[
                'Abra a sessão alinhando intenção e combinados.',
                'Respeite o tempo emocional de cada participante.',
                'Registre o essencial para não perder presença.',
                'Use IA apenas quando ela realmente ajuda.',
                'Finalize sempre com uma micro-ação concreta.'
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-gold" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">
              Uso responsável: não substitui atendimento clínico.
            </p>
          </div>
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
        primaryCta={{ label: 'Começar agora', href: '/planos' }}
        secondaryCta={{ label: 'Falar com a equipe', href: '/contato' }}
        badges={['Onboarding rápido', 'Sem setup técnico complexo']}
      />
    </div>
  )
}
