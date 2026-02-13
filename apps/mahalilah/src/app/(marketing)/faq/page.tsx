import type { Metadata } from 'next'
import { MediaPlaceholder } from '@/components/marketing/MediaPlaceholder'
import { FaqJsonLd } from '@/components/marketing/StructuredData'
import { CTA } from '@/components/marketing/sections/CTA'
import { FAQ } from '@/components/marketing/sections/FAQ'
import { Hero } from '@/components/marketing/sections/Hero'
import { SectionHeader, SectionShell } from '@/components/marketing/ui'

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    'Perguntas e respostas sobre uso da plataforma, planos, IA, segurança e privacidade no Maha Lilah Online.',
  openGraph: {
    title: 'FAQ Maha Lilah Online',
    description:
      'Perguntas e respostas sobre uso da plataforma, planos, IA, segurança e privacidade no Maha Lilah Online.',
    url: '/faq'
  }
}

const faqItems = [
  {
    question: 'Preciso ser terapeuta para usar?',
    answer: 'Não. Você pode usar de forma autoguiada, em grupo ou com suporte profissional.'
  },
  {
    question: 'Posso jogar sozinho?',
    answer: 'Sim. O fluxo individual está disponível com registro e fechamento opcional.'
  },
  {
    question: 'Como funcionam convites por e-mail?',
    answer: 'Você envia o convite e o participante entra com o mesmo e-mail para garantir identidade.'
  },
  {
    question: 'Cada jogador rola o dado?',
    answer: 'Sim. A rolagem é individual, respeitando a vez de cada participante.'
  },
  {
    question: 'O que é o deck randômico?',
    answer: 'Cartas que podem ser puxadas a qualquer momento para abrir novas perspectivas.'
  },
  {
    question: 'A IA substitui terapia?',
    answer: 'Não. A IA apoia com perguntas e síntese; a condução e decisão final são humanas.'
  },
  {
    question: 'Quantas dicas de IA tenho por sessão?',
    answer: 'O limite varia por plano e aparece com clareza no checkout.'
  },
  {
    question: 'Posso exportar os registros?',
    answer: 'Sim. Você pode exportar em TXT/JSON para continuidade do trabalho.'
  },
  {
    question: 'Quais informações ficam salvas?',
    answer: 'Jogadas, cartas, registros terapêuticos e sínteses acionadas durante a sessão.'
  },
  {
    question: 'Como cancelar assinatura?',
    answer: 'O cancelamento é feito na conta e impede a próxima cobrança.'
  },
  {
    question: 'Existe política de reembolso?',
    answer: 'Sim. Consulte a página de Política de Reembolso para critérios detalhados.'
  },
  {
    question: 'Posso ter várias salas ativas ao mesmo tempo?',
    answer: 'Depende do plano contratado. O limite aparece antes da compra.'
  },
  {
    question: 'Login é obrigatório?',
    answer: 'Sim. Todos entram com login para garantir segurança, identidade e histórico confiável.'
  },
  {
    question: 'O histórico fica no perfil de quem facilita?',
    answer: 'Sim. O histórico completo fica disponível para continuidade das jornadas.'
  }
]

export default function FaqPage() {
  return (
    <div>
      <FaqJsonLd items={faqItems} />
      <Hero
        eyebrow="FAQ"
        title="Tudo que você precisa saber antes de começar"
        subtitle="Respostas diretas para escolher o plano certo e conduzir com confiança desde a primeira sessão."
        primaryCta={{ label: 'Ver planos', href: '/planos' }}
        secondaryCta={{ label: 'Falar com a equipe', href: '/contato' }}
        mediaLabel="Equipe de suporte e experiência acolhedora"
        highlights={['Resposta rápida', 'Transparência total', 'Suporte humano']}
      />

      <SectionShell>
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col gap-6">
            <SectionHeader
              eyebrow="Visão geral"
              title="FAQ pensada para reduzir dúvida e acelerar decisão"
              subtitle="Se preferir, nossa equipe também pode te orientar por contexto de uso."
            />
            <p className="text-sm text-ink-muted">
              Respondemos contatos em até 2 dias úteis com orientação personalizada para terapeutas,
              facilitadores e grupos.
            </p>
          </div>
          <MediaPlaceholder variant="vertical" label="Suporte humano e orientação para escolha de plano" />
        </div>
      </SectionShell>

      <FAQ eyebrow="FAQ completa" title="Perguntas e respostas" items={faqItems} />

      <CTA
        title="Quer orientação específica para seu caso?"
        subtitle="Fale com a equipe e receba direcionamento claro para começar com segurança."
        primaryCta={{ label: 'Ver planos', href: '/planos' }}
        secondaryCta={{ label: 'Falar com a equipe', href: '/contato' }}
        badges={['Atendimento humano', 'Retorno em até 2 dias úteis']}
      />
    </div>
  )
}
