import type { Metadata } from 'next'
import Link from 'next/link'
import { MediaPlaceholder } from '@/components/marketing/MediaPlaceholder'
import { CTA } from '@/components/marketing/sections/CTA'
import { FAQ } from '@/components/marketing/sections/FAQ'
import { Hero } from '@/components/marketing/sections/Hero'
import { SectionHeader, SectionShell } from '@/components/marketing/ui'

export const metadata: Metadata = {
  title: 'Termos de uso',
  description: 'Condições gerais de uso do Maha Lilah Online, pagamentos, responsabilidade e privacidade.',
  openGraph: {
    title: 'Termos de uso',
    description: 'Condições gerais de uso do Maha Lilah Online, pagamentos, responsabilidade e privacidade.',
    url: '/termos'
  }
}

const faqItems = [
  {
    question: 'Posso cancelar a assinatura?',
    answer: 'Sim. O cancelamento impede a próxima cobrança, sem multas.'
  },
  {
    question: 'Há reembolso?',
    answer: 'Para saber mais consulte nossas Políticas de Reembolso.'
  },
  {
    question: 'Como funciona o uso de IA?',
    answer: 'A IA é opcional, limitada por plano e usada apenas com consentimento.'
  }
]

export default function TermosPage() {
  return (
    <div>
      <Hero
        title="Termos de uso"
        subtitle="Condições gerais para uso do Maha Lilah Online, com foco em segurança, transparência e respeito."
        primaryCta={{ label: 'Política de privacidade', href: '/privacidade' }}
        secondaryCta={{ label: 'Política de reembolso', href: '/politica-de-reembolso' }}
        highlights={['Uso responsável', 'Consentimento', 'Transparência']}
      />

      <SectionShell>
        <div className="grid items-start gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col gap-6">
            <SectionHeader
              eyebrow="Escopo"
              title="O que oferecemos"
              subtitle="Uma plataforma de salas ao vivo para jornadas terapêuticas utilizando o tabuleiro do Maha Lilah, com recursos digitais e registros." />
            <ul className="list-disc space-y-2 pl-5 text-sm text-ink-muted">
              <li>Uso do tabuleiro, deck randômico e modo terapia.</li>
              <li>Convites por e-mail com login obrigatório.</li>
              <li>Histórico e export de registros.</li>
              <li>Síntese por IA com limites e botão dedicado.</li>
            </ul>
          </div>
        </div>
      </SectionShell>

      <SectionShell>
        <SectionHeader
          eyebrow="Responsabilidade"
          title="Compromissos e limites"
          subtitle="O uso deve ser ético, respeitoso e alinhado com a segurança emocional do grupo."
        />
        <div className="grid gap-4 rounded-3xl border border-border/70 bg-surface/70 p-5 text-sm text-ink-muted sm:grid-cols-2 sm:p-8">
          {[
            'Não substitui terapia ou atendimento médico.',
            'Usuários são responsáveis por suas decisões e registros.',
            'Uso aceitável: sem violência, discurso de ódio ou abuso.',
            'Conteúdos inseridos devem respeitar direitos autorais.',
            'Propriedade intelectual da plataforma permanece com a empresa.'
          ].map((item) => (
            <div key={item} className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-gold" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </SectionShell>

      <SectionShell>
        <SectionHeader
          eyebrow="Conta e pagamentos"
          title="Regras de conta, cobrança e cancelamento"
          subtitle="Pagamentos são processados via Mercado Pago e seguem regras claras."
        />
        <div className="rounded-3xl border border-border/70 bg-surface/70 p-6 text-sm text-ink-muted">
          <p>
            Assinaturas renovam automaticamente até cancelamento. A sessão avulsa dá direito a uma sala, conforme
            participantes definidos no checkout. Cancelamentos podem ser feitos na área da conta.
          </p>
          <p className="mt-3">
            Consulte a <Link className="text-gold" href="/politica-de-reembolso">Política de Reembolso</Link>
            {' '}para detalhes sobre prazos e condições.
          </p>
        </div>
      </SectionShell>

      <SectionShell>
        <SectionHeader
          eyebrow="IA e consentimento"
          title="Uso de IA"
          subtitle="A IA é opcional e usada somente com consentimento expresso na sala."
        />
        <div className="rounded-3xl border border-border/70 bg-surface/70 p-6 text-sm text-ink-muted">
          <p>
            A IA processa registros terapêuticos e informações fornecidas durante a sessão. Seu uso é limitado por
            plano e sempre supervisionado pela pessoa facilitadora.
          </p>
        </div>
      </SectionShell>

      <SectionShell>
        <SectionHeader
          eyebrow="Privacidade"
          title="Dados e proteção"
          subtitle="A coleta e o tratamento de dados seguem nossa Política de Privacidade."
        />
        <div className="rounded-3xl border border-border/70 bg-surface/70 p-6 text-sm text-ink-muted">
          <p>
            Para mais informações sobre dados pessoais, consulte a nossa
            {' '}<Link className="text-gold" href="/privacidade">Política de Privacidade</Link>.
          </p>
        </div>
      </SectionShell>

      <FAQ
        eyebrow="FAQ"
        title="Perguntas sobre termos"
        items={faqItems}
        ctaLabel=""
        ctaHref="/contato"
      />
    </div>
  )
}
