import type { Metadata } from 'next'
import { MediaPlaceholder } from '@/components/marketing/MediaPlaceholder'
import { CookiePreferencesControls } from '@/components/marketing/CookiePreferencesControls'
import { CTA } from '@/components/marketing/sections/CTA'
import { FAQ } from '@/components/marketing/sections/FAQ'
import { Hero } from '@/components/marketing/sections/Hero'
import { SectionHeader, SectionShell } from '@/components/marketing/ui'
import { withSeoDefaults } from '@/lib/marketing/seo'

export const metadata: Metadata = withSeoDefaults({
  title: 'Cookies',
  description: 'Entenda como usamos cookies e como você pode gerenciar suas preferências.',
  openGraph: {
    title: 'Política de Cookies',
    description: 'Entenda como usamos cookies e como você pode gerenciar suas preferências.',
    url: '/cookies'
  }
})

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
        highlights={['Controle do usuário', 'Transparência', 'Segurança de sessão']}
      />

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
        </div>
      </SectionShell>



      <SectionShell>
        <div className="grid items-start gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col gap-6">
            <SectionHeader
              eyebrow="Banner de consentimento ativo"
              title="Preferências sempre à mão"
              subtitle="Usamos cookies para manter sua sessão segura e melhorar sua experiência. Você pode aceitar
              todos ou ajustar preferências."
            />
            <div className="mt-3">
              <CookiePreferencesControls />
            </div>
          </div>
        </div>
      </SectionShell>

      <FAQ
        eyebrow="FAQ"
        title="Perguntas sobre cookies"
        items={faqItems}
        ctaLabel=""
        ctaHref=""
      />
    </div>
  )
}
