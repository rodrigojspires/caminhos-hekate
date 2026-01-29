import type { Metadata } from 'next'
import { RegisterForm } from '@/components/marketing/RegisterForm'
import { MediaPlaceholder } from '@/components/marketing/MediaPlaceholder'
import { CTA } from '@/components/marketing/sections/CTA'
import { Hero } from '@/components/marketing/sections/Hero'
import { SectionShell } from '@/components/marketing/ui'

export const metadata: Metadata = {
  title: 'Criar conta',
  description: 'Crie sua conta para acessar salas, convites e registros terapêuticos do Maha Lilah Online.',
  openGraph: {
    title: 'Criar conta no Maha Lilah Online',
    description: 'Crie sua conta para acessar salas, convites e registros terapêuticos do Maha Lilah Online.',
    url: '/register'
  }
}

export default function RegisterPage() {
  return (
    <div>
      <Hero
        eyebrow="Cadastro rápido"
        title="Crie sua conta com nome, e-mail e senha"
        subtitle="Seu cadastro garante acesso seguro às salas, convites personalizados e histórico terapêutico."
        primaryCta={{ label: 'Ver planos', href: '/planos' }}
        secondaryCta={{ label: 'Como funciona', href: '/como-funciona' }}
        mediaLabel="Tela de cadastro do Maha Lilah Online"
        note="Conta única para toda a experiência"
      />

      <SectionShell>
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col gap-4">
            <h2 className="font-serif text-3xl text-ink">Comece agora</h2>
            <p className="text-base text-ink-muted">
              Basta informar seu nome, e-mail e senha. Você poderá usar a mesma conta no ecossistema do
              Caminhos de Hekate.
            </p>
            <RegisterForm />
          </div>
          <MediaPlaceholder variant="vertical" label="Imagem institucional: criação de conta" />
        </div>
      </SectionShell>

      <CTA
        title="Já recebeu um convite?"
        subtitle="Após criar sua conta, basta entrar com o mesmo e-mail do convite para acessar a sala."
        primaryCta={{ label: 'Entrar', href: '/login' }}
        secondaryCta={{ label: 'Ver planos', href: '/planos' }}
      />
    </div>
  )
}
