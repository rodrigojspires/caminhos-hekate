import type { Metadata } from 'next'
import { MediaPlaceholder } from '@/components/marketing/MediaPlaceholder'
import { CTA } from '@/components/marketing/sections/CTA'
import { FAQ } from '@/components/marketing/sections/FAQ'
import { Hero } from '@/components/marketing/sections/Hero'
import { SectionHeader, SectionShell } from '@/components/marketing/ui'

export const metadata: Metadata = {
  title: 'Para terapeutas',
  description: 'Salas ao vivo com histórico, registros por jogada e export para acompanhamento profissional.',
  openGraph: {
    title: 'Maha Lilah Online para terapeutas',
    description: 'Salas ao vivo com histórico, registros por jogada e export para acompanhamento profissional.',
    url: '/para-terapeutas'
  }
}

const faqItems = [
  {
    question: 'Posso exportar os registros?',
    answer: 'Sim. O export em TXT/JSON facilita integrar com seu fluxo de atendimento.'
  },
  {
    question: 'A IA substitui o terapeuta?',
    answer: 'Não. Ela sugere perguntas e gera síntese final, sempre com limites e revisão humana.'
  },
  {
    question: 'O histórico fica salvo?',
    answer: 'Sim. Cada sala alimenta o histórico do terapeuta para continuidade.'
  }
]

export default function ParaTerapeutasPage() {
  return (
    <div>
      <Hero
        eyebrow="Para terapeutas"
        title="Seu consultório com salas ao vivo, histórico e export"
        subtitle="Conduza com clareza: registros por jogada, deck randômico, síntese por IA e histórico completo no perfil profissional."
        primaryCta={{ label: 'Criar minha primeira sala', href: '/login' }}
        secondaryCta={{ label: 'Ver planos', href: '/planos' }}
        mediaLabel="Imagem: terapeuta acompanhando sala ao vivo"
      />

      <SectionShell>
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col gap-5">
            <SectionHeader
              eyebrow="Dashboard"
              title="Dashboard de sessões"
              subtitle="Acompanhe cada sala, status e participantes em um painel claro."
            />
            <p className="text-sm text-ink-muted">
              Veja rapidamente o que está ativo, concluiu ou precisa de atenção. Tudo organizado por data e contexto.
            </p>
          </div>
          <MediaPlaceholder variant="horizontal" label="Screenshot: dashboard de sessões" />
        </div>
      </SectionShell>

      <SectionShell>
        <div className="grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          <MediaPlaceholder variant="vertical" label="Screenshot: convites por e-mail" />
          <div className="flex flex-col gap-5">
            <SectionHeader
              eyebrow="Convites"
              title="Convites e vínculo por e-mail"
              subtitle="Cada participante entra com identidade confirmada e login obrigatório."
            />
            <p className="text-sm text-ink-muted">
              Convites por e-mail vinculam contas e protegem a experiência do grupo, mantendo histórico seguro.
            </p>
          </div>
        </div>
      </SectionShell>

      <SectionShell>
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col gap-5">
            <SectionHeader
              eyebrow="Registro terapêutico"
              title="Registro por jogada"
              subtitle="Anote emoção, intensidade, corpo, insight e micro-ação sem perder o fluxo."
            />
            <p className="text-sm text-ink-muted">
              O modo terapia organiza a anotação para facilitar revisões futuras e manter a linguagem da pessoa.
            </p>
          </div>
          <MediaPlaceholder variant="horizontal" label="Screenshot: registro terapêutico" />
        </div>
      </SectionShell>

      <SectionShell>
        <div className="grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          <MediaPlaceholder variant="vertical" label="Screenshot: relatório final por IA" />
          <div className="flex flex-col gap-5">
            <SectionHeader
              eyebrow="Síntese por IA"
              title="Relatório final com um botão"
              subtitle="Gere uma síntese organizada ao final da sessão, respeitando limites de uso."
            />
            <p className="text-sm text-ink-muted">
              A IA oferece apoio limitado por jogador e por sessão. A decisão final é sempre humana.
            </p>
          </div>
        </div>
      </SectionShell>

      <SectionShell>
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col gap-5">
            <SectionHeader
              eyebrow="Export"
              title="Export TXT/JSON"
              subtitle="Leve os registros para seus arquivos clínicos ou integrações pessoais."
            />
            <p className="text-sm text-ink-muted">O histórico fica pronto para exportar, sem retrabalho.</p>
          </div>
          <MediaPlaceholder variant="horizontal" label="Screenshot: export de dados" />
        </div>
      </SectionShell>

      <SectionShell>
        <SectionHeader
          eyebrow="Casos de uso"
          title="Aplicações comuns"
          subtitle="Cinco exemplos recorrentes em acompanhamento terapêutico."
        />
        <div className="grid gap-4 rounded-3xl border border-border/70 bg-surface/70 p-8 text-sm text-ink-muted sm:grid-cols-2">
          {[
            'Travas recorrentes e padrões de comportamento',
            'Decisões que precisam de clareza emocional',
            'Limites pessoais e relacionais',
            'Ciclos de repetição e reatividade',
            'Mapeamento de recursos internos'
          ].map((item) => (
            <div key={item} className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-gold" />
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
        title="Crie sua primeira sala com calma"
        subtitle="Escolha um plano e convide seu primeiro grupo com login obrigatório."
        primaryCta={{ label: 'Criar minha primeira sala', href: '/login' }}
        secondaryCta={{ label: 'Ver planos', href: '/planos' }}
      />
    </div>
  )
}
