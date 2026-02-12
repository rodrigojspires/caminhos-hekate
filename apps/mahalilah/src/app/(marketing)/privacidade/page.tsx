import type { Metadata } from 'next'
import Link from 'next/link'
import { MediaPlaceholder } from '@/components/marketing/MediaPlaceholder'
import { CTA } from '@/components/marketing/sections/CTA'
import { FAQ } from '@/components/marketing/sections/FAQ'
import { Hero } from '@/components/marketing/sections/Hero'
import { SectionHeader, SectionShell } from '@/components/marketing/ui'

export const metadata: Metadata = {
  title: 'Privacidade',
  description: 'Como coletamos, usamos e protegemos dados no Maha Lilah Online.',
  openGraph: {
    title: 'Política de Privacidade',
    description: 'Como coletamos, usamos e protegemos dados no Maha Lilah Online.',
    url: '/privacidade'
  }
}

const faqItems = [
  {
    question: 'Quais dados são obrigatórios?',
    answer: 'Dados de conta e acesso são essenciais para manter a segurança das salas.'
  },
  {
    question: 'A IA recebe meus dados pessoais?',
    answer: 'Apenas registros terapêuticos fornecidos, com mínimo necessário e dentro do consentimento.'
  },
  {
    question: 'Como solicito exclusão?',
    answer: 'Entre em contato pelo formulário ou suporte para solicitar a exclusão de dados.'
  }
]

export default function PrivacidadePage() {
  return (
    <div>
      <Hero
        eyebrow="Privacidade"
        title="Transparência no cuidado dos dados"
        subtitle="Explicamos o que coletamos, como usamos e quais direitos você tem como titular."
        primaryCta={{ label: 'Falar com a equipe', href: '/contato' }}
        secondaryCta={{ label: 'Termos de uso', href: '/termos' }}
        mediaLabel="Imagem: privacidade e dados"
        highlights={['LGPD', 'Consentimento', 'Controle do titular']}
      />

      <SectionShell>
        <div className="grid items-start gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col gap-6">
            <SectionHeader
              eyebrow="Coleta"
              title="Quais dados coletamos"
              subtitle="Somente o necessário para operar a plataforma com segurança."
            />
            <ul className="list-disc space-y-2 pl-5 text-sm text-ink-muted">
              <li>Dados de conta: nome, e-mail e autenticação.</li>
              <li>Dados de sessão: salas, jogadas e participantes.</li>
              <li>Registros terapêuticos inseridos na sala.</li>
              <li>Logs técnicos para segurança e performance.</li>
              <li>Pagamentos processados via Mercado Pago.</li>
            </ul>
          </div>
          <MediaPlaceholder variant="vertical" label="Imagem: dados essenciais" />
        </div>
      </SectionShell>

      <SectionShell>
        <SectionHeader
          eyebrow="Uso e compartilhamento"
          title="Como usamos os dados"
          subtitle="Dados são usados para entregar a experiência, apoiar registros e garantir segurança."
        />
        <div className="rounded-3xl border border-border/70 bg-surface/70 p-6 text-sm text-ink-muted">
          <p>
            Usamos dados para autenticar usuários, manter histórico, gerar relatórios e aprimorar a plataforma.
            O compartilhamento é mínimo e ocorre apenas com provedores essenciais, como pagamento e IA.
          </p>
          <p className="mt-3">
            A IA é fornecida por provedor externo (OpenAI API), que processa apenas o necessário para gerar
            perguntas e síntese final.
          </p>
        </div>
      </SectionShell>

      <SectionShell>
        <SectionHeader
          eyebrow="Retenção e direitos"
          title="Quanto tempo guardamos"
          subtitle="Registros ficam salvos até solicitação de exclusão, conforme termos."
        />
        <div className="rounded-3xl border border-border/70 bg-surface/70 p-6 text-sm text-ink-muted">
          <p>
            Você pode solicitar acesso, correção ou exclusão dos seus dados. Para isso, fale com nossa equipe.
          </p>
          <p className="mt-3">
            Consulte nossos <Link className="text-gold" href="/termos">Termos de uso</Link>
            {' '}e <Link className="text-gold" href="/cookies">Cookies</Link> para mais detalhes.
          </p>
        </div>
      </SectionShell>

      <FAQ
        eyebrow="FAQ"
        title="Perguntas sobre privacidade"
        items={faqItems}
        ctaLabel="Segurança e privacidade"
        ctaHref="/seguranca-privacidade"
      />

      <CTA
        title="Confiança e transparência"
        subtitle="Estamos prontos para esclarecer qualquer dúvida sobre dados."
        primaryCta={{ label: 'Falar com a equipe', href: '/contato' }}
        secondaryCta={{ label: 'Ver planos', href: '/planos' }}
        badges={['Dados protegidos', 'Uso mínimo necessário']}
      />
    </div>
  )
}
