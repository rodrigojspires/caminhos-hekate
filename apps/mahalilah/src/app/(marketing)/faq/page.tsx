import type { Metadata } from 'next'
import { MediaPlaceholder } from '@/components/marketing/MediaPlaceholder'
import { FaqJsonLd } from '@/components/marketing/StructuredData'
import { CTA } from '@/components/marketing/sections/CTA'
import { FAQ } from '@/components/marketing/sections/FAQ'
import { Hero } from '@/components/marketing/sections/Hero'
import { SectionHeader, SectionShell } from '@/components/marketing/ui'

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Respostas sobre salas, convites, IA, planos e privacidade no Maha Lilah Online.',
  openGraph: {
    title: 'FAQ Maha Lilah Online',
    description: 'Respostas sobre salas, convites, IA, planos e privacidade no Maha Lilah Online.',
    url: '/faq'
  }
}

const faqItems = [
  {
    question: 'Preciso ser terapeuta?',
    answer: 'Não. Você pode jogar de forma autoguiada ou com acompanhamento profissional.'
  },
  {
    question: 'Posso jogar sozinho?',
    answer: 'Sim. Há fluxo para jornada individual com registros e síntese opcional.'
  },
  {
    question: 'Como funcionam convites por e-mail?',
    answer: 'Você envia o convite e cada participante vincula sua conta ao entrar na sala.'
  },
  {
    question: 'Cada jogador rola o dado?',
    answer: 'Sim. Os turnos são individuais e cada pessoa rola o próprio dado na sua vez.'
  },
  {
    question: 'O que é o deck randômico?',
    answer: 'Um conjunto de cartas puxadas a qualquer momento (1 a 3) para abrir novas perspectivas.'
  },
  {
    question: 'A IA substitui terapia?',
    answer: 'Não. A IA apenas sugere perguntas e gera síntese final limitada.'
  },
  {
    question: 'Quantas dicas de IA eu tenho?',
    answer: 'O número varia por plano e aparece no checkout. Cada jogador possui limites por sessão.'
  },
  {
    question: 'Posso exportar os registros?',
    answer: 'Sim. Export em TXT/JSON está disponível para terapeutas e facilitadores.'
  },
  {
    question: 'O que fica salvo?',
    answer: 'Jogadas, cartas, registros terapêuticos e sínteses por IA quando usadas.'
  },
  {
    question: 'Como cancelam assinaturas?',
    answer: 'O cancelamento é feito na área da conta e impede a próxima cobrança.'
  },
  {
    question: 'Qual a política de reembolso?',
    answer: 'Consulte nossa Política de Reembolso para prazos e condições.'
  },
  {
    question: 'Posso ter várias salas ao mesmo tempo?',
    answer: 'Depende do plano. O limite de salas simultâneas é informado no checkout.'
  },
  {
    question: 'Login é obrigatório?',
    answer: 'Sim. Todos precisam estar logados para garantir identidade e histórico.'
  },
  {
    question: 'O histórico fica no perfil do terapeuta?',
    answer: 'Sim. O histórico completo aparece no perfil profissional do terapeuta ou facilitador.'
  }
]

export default function FaqPage() {
  return (
    <div>
      <FaqJsonLd items={faqItems} />
      <Hero
        eyebrow="FAQ"
        title="Perguntas frequentes"
        subtitle="Respostas diretas para você entender a experiência, os limites e a privacidade."
        primaryCta={{ label: 'Ver planos', href: '/planos' }}
        secondaryCta={{ label: 'Falar com a equipe', href: '/contato' }}
        mediaLabel="Imagem: perguntas frequentes em destaque"
      />

      <SectionShell>
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col gap-6">
            <SectionHeader
              eyebrow="Visão geral"
              title="Tudo o que você precisa saber antes de entrar"
              subtitle="Organizamos as respostas mais comuns para você seguir com clareza."
            />
            <p className="text-sm text-ink-muted">
              Caso sua dúvida não esteja aqui, fale com a equipe. Respondemos em até 2 dias úteis.
            </p>
          </div>
          <MediaPlaceholder variant="vertical" label="Imagem: suporte e acolhimento" />
        </div>
      </SectionShell>

      <FAQ
        eyebrow="FAQ completa"
        title="Perguntas e respostas"
        items={faqItems}
      />

      <CTA
        title="Ainda com dúvidas?"
        subtitle="Fale com a equipe e receba orientação personalizada."
        primaryCta={{ label: 'Falar com a equipe', href: '/contato' }}
        secondaryCta={{ label: 'Ver planos', href: '/planos' }}
      />
    </div>
  )
}
