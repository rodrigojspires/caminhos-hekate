import type { Metadata } from 'next'
import { LoginForm } from '@/components/marketing/LoginForm'
import { MediaPlaceholder } from '@/components/marketing/MediaPlaceholder'
import { CTA } from '@/components/marketing/sections/CTA'
import { FAQ } from '@/components/marketing/sections/FAQ'
import { Hero } from '@/components/marketing/sections/Hero'
import { SectionShell } from '@/components/marketing/ui'

export const metadata: Metadata = {
  title: 'Entrar',
  description: 'Acesse sua conta para criar salas, convidar participantes e acompanhar registros terapêuticos.',
  openGraph: {
    title: 'Entrar no Maha Lilah Online',
    description: 'Acesse sua conta para criar salas, convidar participantes e acompanhar registros terapêuticos.',
    url: '/login'
  }
}

const faqItems = [
  {
    question: 'Preciso de conta para entrar em uma sala?',
    answer: 'Sim. O login é obrigatório para todos os participantes, garantindo identidade e histórico seguro.'
  },
  {
    question: 'Posso usar a mesma conta do Caminhos de Hekate?',
    answer: 'Sim. O acesso integra o mesmo ecossistema, com autenticação segura.'
  },
  {
    question: 'Esqueci minha senha. O que faço?',
    answer: 'Use o fluxo de recuperação do Caminhos de Hekate ou fale com nosso suporte.'
  }
]

export default function LoginPage() {
  return (
    <div>
      <Hero
        eyebrow="Área segura"
        title="Entre para abrir sua sala"
        subtitle="Acesse com login obrigatório para participar de sessões ao vivo, convites por e-mail e histórico completo."
        primaryCta={{ label: 'Ver planos', href: '/planos' }}
        secondaryCta={{ label: 'Como funciona', href: '/como-funciona' }}
        mediaLabel="Tela de login e acesso seguro"
        note="Atendimento profissional, sem promessas milagrosas"
      />

      <SectionShell>
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col gap-4">
            <h2 className="font-serif text-3xl text-ink">Seu acesso, seu ritmo</h2>
            <p className="text-base text-ink-muted">
              Use o mesmo login do Caminhos de Hekate. O acesso garante que cada participante esteja
              identificado e que os registros fiquem vinculados ao perfil correto.
            </p>
            <LoginForm />
          </div>
          <MediaPlaceholder variant="vertical" label="Imagem institucional: entrada na sala" />
        </div>
      </SectionShell>

      <FAQ
        eyebrow="FAQ"
        title="Perguntas rápidas"
        subtitle="Duas respostas antes de entrar."
        items={faqItems}
        ctaLabel="Ver FAQ completa"
        ctaHref="/faq"
      />

      <CTA
        title="Pronto para sua primeira sala?"
        subtitle="Escolha o formato ideal ou avance direto para o checkout com sua sessão avulsa."
        primaryCta={{ label: 'Ver planos', href: '/planos' }}
        secondaryCta={{ label: 'Ir para checkout', href: '/checkout' }}
      />
    </div>
  )
}
