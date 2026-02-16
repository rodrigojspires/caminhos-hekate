import type { Metadata } from 'next'
import { LoginForm } from '@/components/marketing/LoginForm'
import { MediaPlaceholder } from '@/components/marketing/MediaPlaceholder'
import { CTA } from '@/components/marketing/sections/CTA'
import { FAQ } from '@/components/marketing/sections/FAQ'
import { SectionShell } from '@/components/marketing/ui'
import { withSeoDefaults } from '@/lib/marketing/seo'

export const metadata: Metadata = withSeoDefaults({
  title: 'Entrar',
  description: 'Acesse sua conta para criar salas, convidar participantes e acompanhar registros terapêuticos.',
  openGraph: {
    title: 'Entrar no Maha Lilah Online',
    description: 'Acesse sua conta para criar salas, convidar participantes e acompanhar registros terapêuticos.',
    url: '/login'
  }
}, { noIndex: true })

const faqItems = [
  {
    question: 'Preciso de conta para entrar em uma sala?',
    answer: 'Sim. O login é obrigatório para todos os participantes, garantindo identidade e histórico seguro.'
  },
  {
    question: 'Posso usar a mesma conta do Portal Caminhos de Hekate?',
    answer: 'Sim. O acesso integra o mesmo ecossistema, com autenticação segura.'
  },
  {
    question: 'Esqueci minha senha. O que faço?',
    answer: 'Clique em "Esqueci minha senha" na tela de login para receber o link de redefinição.'
  }
]

export default function LoginPage() {
  return (
    <div>
      <SectionShell className="pt-8">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col gap-6">
            <LoginForm />
            <div className="flex flex-col gap-3">
              <h2 className="font-serif text-3xl text-ink">Entre e retome sua jornada com um clique</h2>
              <p className="text-base text-ink-muted">
                O Maha Lilah Online é parte integrante do Portal Caminhos de Hekate. Você pode reutilizar o seu login do Portal Caminhos de Hekate no Maha Lilah Online. 
                <br/><br/>
                O acesso garante que cada participante esteja identificado e que os registros fiquem vinculados ao perfil correto.
              </p>
            </div>
          </div>
        </div>
      </SectionShell>
    </div>
  )
}
