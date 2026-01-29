import type { Metadata } from 'next'
import { MediaPlaceholder } from '@/components/marketing/MediaPlaceholder'
import { CTA } from '@/components/marketing/sections/CTA'
import { FAQ } from '@/components/marketing/sections/FAQ'
import { Hero } from '@/components/marketing/sections/Hero'
import { SectionHeader, SectionShell } from '@/components/marketing/ui'

export const metadata: Metadata = {
  title: 'Cookies',
  description: 'Entenda como usamos cookies e como você pode gerenciar suas preferências.',
  openGraph: {
    title: 'Política de Cookies',
    description: 'Entenda como usamos cookies e como você pode gerenciar suas preferências.',
    url: '/cookies'
  }
}

const faqItems = [
  {
    question: 'Posso desativar cookies?',
    answer: 'Sim. Você pode ajustar as preferências no navegador ou no banner.'
  },
  {
    question: 'Cookies afetam a segurança?',
    answer: 'Usamos cookies para melhorar a experiência e manter autenticação segura.'
  },
  {
    question: 'Quais categorias existem?',
    answer: 'Essenciais, analíticos e personalização.'
  }
]

export default function CookiesPage() {
  return (
    <div>
      <Hero
        eyebrow="Cookies"
        title="Preferências de cookies com clareza"
        subtitle="Usamos cookies para garantir login seguro e melhorar a experiência. Você controla as preferências."
        primaryCta={{ label: 'Ver privacidade', href: '/privacidade' }}
        secondaryCta={{ label: 'Termos de uso', href: '/termos' }}
        mediaLabel="Imagem: cookies e preferencias" />

      <SectionShell>
        <div className="grid items-start gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col gap-6">
            <SectionHeader
              eyebrow="Categorias"
              title="Como usamos cookies"
              subtitle="Separados por finalidade para que você escolha com tranquilidade."
            />
            <ul className="list-disc space-y-2 pl-5 text-sm text-ink-muted">
              <li>Essenciais: login, segurança e funcionamento básico.</li>
              <li>Analíticos: melhoria de desempenho e estabilidade.</li>
              <li>Personalização: ajustes de experiência e preferência de idioma.</li>
            </ul>
          </div>
          <MediaPlaceholder variant="vertical" label="Imagem: categorias de cookies" />
        </div>
      </SectionShell>

      <SectionShell>
        <div className="rounded-3xl border border-border/70 bg-surface/70 p-8 text-sm text-ink-muted">
          <p className="text-ink">Exemplo de banner de cookies (simples)</p>
          <div className="mt-4 rounded-2xl border border-border/70 bg-[#0b0e13]/70 p-4">
            <p>
              Usamos cookies para manter sua sessão segura e melhorar sua experiência. Você pode aceitar
              todos ou ajustar preferências.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button className="btn-primary" type="button">Aceitar tudo</button>
              <button className="btn-secondary" type="button">Ajustar preferências</button>
            </div>
          </div>
          <p className="mt-4 text-xs uppercase tracking-[0.2em] text-ink-muted">
            TODO: implementar banner real com consentimento.
          </p>
        </div>
      </SectionShell>

      <FAQ
        eyebrow="FAQ"
        title="Perguntas sobre cookies"
        items={faqItems}
        ctaLabel="Falar com a equipe"
        ctaHref="/contato"
      />

      <CTA
        title="Controle total"
        subtitle="Gerencie suas preferências e siga com segurança."
        primaryCta={{ label: 'Ver privacidade', href: '/privacidade' }}
        secondaryCta={{ label: 'Entrar', href: '/login' }}
      />
    </div>
  )
}
