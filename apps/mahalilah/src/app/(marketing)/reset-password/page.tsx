import type { Metadata } from 'next'
import { MediaPlaceholder } from '@/components/marketing/MediaPlaceholder'
import { ResetPasswordForm } from '@/components/marketing/ResetPasswordForm'
import { SectionShell } from '@/components/marketing/ui'

export const metadata: Metadata = {
  title: 'Nova senha',
  description: 'Defina uma nova senha para sua conta no Maha Lilah Online.',
  openGraph: {
    title: 'Nova senha - Maha Lilah Online',
    description: 'Defina uma nova senha para sua conta no Maha Lilah Online.',
    url: '/reset-password'
  }
}

type ResetPasswordPageProps = {
  searchParams?: {
    token?: string | string[]
  }
}

export default function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const tokenValue = searchParams?.token
  const token = typeof tokenValue === 'string' ? tokenValue : ''

  return (
    <SectionShell className="pt-8">
      <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <h1 className="font-serif text-3xl text-ink">Criar nova senha</h1>
            <p className="text-base text-ink-muted">
              Escolha uma nova senha para voltar a acessar sua conta.
            </p>
          </div>
          <ResetPasswordForm token={token} />
        </div>
        <MediaPlaceholder variant="vertical" label="Imagem institucional: redefinição de senha" />
      </div>
    </SectionShell>
  )
}
