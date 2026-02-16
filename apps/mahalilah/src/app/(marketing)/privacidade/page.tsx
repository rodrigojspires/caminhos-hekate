import type { Metadata } from 'next'
import Link from 'next/link'
import { MediaPlaceholder } from '@/components/marketing/MediaPlaceholder'
import { CTA } from '@/components/marketing/sections/CTA'
import { FAQ } from '@/components/marketing/sections/FAQ'
import { Hero } from '@/components/marketing/sections/Hero'
import { SectionHeader, SectionShell } from '@/components/marketing/ui'
import { withSeoDefaults } from '@/lib/marketing/seo'

export const metadata: Metadata = withSeoDefaults({
  title: 'Privacidade',
  description: 'Como coletamos, usamos e protegemos dados no Maha Lilah Online.',
  openGraph: {
    title: 'Política de Privacidade',
    description: 'Como coletamos, usamos e protegemos dados no Maha Lilah Online.',
    url: '/privacidade'
  }
})

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
        title="Transparência no cuidado dos dados"
        subtitle="Explicamos o que coletamos, como usamos e quais direitos você tem como titular."
        primaryCta={{  label: 'Falar com a equipe', href: '/contato' }}
        highlights={['LGPD', 'Consentimento', 'Uso dos dados']}
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
          eyebrow="IA na prática"
          title="O que vai / o que não vai para o provedor externo"
          subtitle="Resumo objetivo para terapeutas e facilitadores com contexto clínico."
        />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-border/70 bg-surface/70 p-6 text-sm text-ink-muted">
            <h3 className="font-serif text-xl text-ink">O que vai</h3>
            <ul className="mt-3 space-y-2">
              {[
                'Trechos de registro necessários para gerar perguntas e síntese.',
                'Contexto da sessão inserido manualmente por quem conduz.',
                'Metadados técnicos mínimos para segurança e rastreabilidade.'
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-gold" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border border-border/70 bg-surface/70 p-6 text-sm text-ink-muted">
            <h3 className="font-serif text-xl text-ink">O que não vai</h3>
            <ul className="mt-3 space-y-2">
              {[
                'Não exigimos documentos pessoais sensíveis para usar a IA.',
                'Não há necessidade de inserir CPF, RG, endereço completo ou dados bancários.',
                'Não orientamos inserir laudos completos, prontuários integrais ou dados de terceiros.'
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-gold" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-4 rounded-3xl border border-border/70 bg-surface/70 p-6 text-sm text-ink-muted">
          <p className="text-ink">Orientação para terapeutas</p>
          <p className="mt-2">
            Sempre prefira linguagem clínica resumida e anonimizada. Em casos de alta sensibilidade,
            registre apenas o necessário para continuidade da sessão.
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
        ctaLabel=""
        ctaHref=""
      />

      <CTA
        title="Confiança e transparência"
        subtitle="Estamos prontos para esclarecer qualquer dúvida sobre dados."
        primaryCta={{ label: 'Falar com a equipe', href: '/contato' }}
        badges={['Dados protegidos', 'Uso mínimo necessário', 'Transparência', 'LGPD']}
      />
    </div>
  )
}
