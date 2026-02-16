import type { Metadata } from 'next'
import { MediaPlaceholder } from '@/components/marketing/MediaPlaceholder'
import { FaqJsonLd } from '@/components/marketing/StructuredData'
import { CTA } from '@/components/marketing/sections/CTA'
import { FAQ } from '@/components/marketing/sections/FAQ'
import { Hero } from '@/components/marketing/sections/Hero'
import { SectionHeader, SectionShell } from '@/components/marketing/ui'
import { withSeoDefaults } from '@/lib/marketing/seo'

export const metadata: Metadata = withSeoDefaults({
  title: 'FAQ',
  description:
    'Perguntas e respostas sobre uso da plataforma, planos, IA, segurança e privacidade no Maha Lilah Online.',
  openGraph: {
    title: 'FAQ Maha Lilah Online',
    description:
      'Perguntas e respostas sobre uso da plataforma, planos, IA, segurança e privacidade no Maha Lilah Online.',
    url: '/faq'
  }
})

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
    question: 'Posso gerar relatório da sessão?',
    answer: 'Sim. Você pode exportar o relatório completo da sessão para um PDF.'
  },
  {
    question: 'Quais informações ficam salvas?',
    answer: 'Jogadas, cartas, registros terapêuticos e sínteses acionadas durante a sessão.'
  },
  {
    question: 'Como cancelar a assinatura?',
    answer: 'O cancelamento é feito na conta e impede a próxima cobrança.'
  },
  {
    question: 'Existe política de reembolso?',
    answer: 'Sim. Consulte a página de Política de Reembolso para critérios detalhados.'
  },
  {
    question: 'Posso ter várias salas ativas ao mesmo tempo?',
    answer: 'Não. O login é único por sala e não permite salas simultâneas com o mesmo login.'
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
        title="Tudo que você precisa saber antes de começar"
        subtitle="Respostas diretas para escolher o plano certo e conduzir com confiança desde a primeira sessão. Esta FAQ foi pensada para reduzir dúvidas e acelerar a decisão."
        primaryCta={{ label: 'Experimente', href: '/dashboard' }}
        secondaryCta={{ label: 'Fale no WhatsApp', href: 'https://wa.me/5511961460883?text=Ol%C3%A1!%20Vim%20pelo%20site%20do%20Maha%20Lilah%20e%20quero%20falar%20com%20voc%C3%AAs!' }}
        highlights={['Resposta rápida', 'Transparência total', 'Suporte humano']}
      />

      <FAQ eyebrow="FAQ completa" title="Perguntas e respostas" items={faqItems} />

    </div>
  )
}
