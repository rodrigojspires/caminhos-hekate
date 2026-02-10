import type { Metadata } from 'next'
import { ForgotPasswordForm } from '@/components/marketing/ForgotPasswordForm'
import { MediaPlaceholder } from '@/components/marketing/MediaPlaceholder'
import { SectionShell } from '@/components/marketing/ui'

export const metadata: Metadata = {
  title: 'Recuperar senha',
  description: 'Solicite um link para redefinir sua senha no Maha Lilah Online.',
  openGraph: {
    title: 'Recuperar senha - Maha Lilah Online',
    description: 'Solicite um link para redefinir sua senha no Maha Lilah Online.',
    url: '/forgot-password'
  }
}

export default function ForgotPasswordPage() {
  return (
    <SectionShell className="pt-8">
      <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <h1 className="font-serif text-3xl text-ink">Recuperar senha</h1>
            <p className="text-base text-ink-muted">
              Informe seu e-mail e enviaremos um link para você criar uma nova senha.
            </p>
          </div>
          <ForgotPasswordForm />
        </div>
        <MediaPlaceholder variant="vertical" label="Imagem institucional: recuperação de senha" />
      </div>
    </SectionShell>
  )
}
