import type { Metadata } from 'next'
import { CTA } from '@/components/marketing/sections/CTA'
import { FAQ } from '@/components/marketing/sections/FAQ'
import { Features } from '@/components/marketing/sections/Features'
import { Hero } from '@/components/marketing/sections/Hero'
import { ImageGallery } from '@/components/marketing/sections/ImageGallery'
import { LegalNotice } from '@/components/marketing/sections/LegalNotice'
import { Steps } from '@/components/marketing/sections/Steps'
import { Testimonials } from '@/components/marketing/sections/Testimonials'
import { VideoSection } from '@/components/marketing/sections/VideoSection'
import { SectionHeader, SectionShell } from '@/components/marketing/ui'

export const metadata: Metadata = {
  title: 'Maha Lilah Online',
  description: 'Salas ao vivo para jornadas terapêuticas com registro, deck randômico e síntese por IA.',
  openGraph: {
    title: 'Maha Lilah Online',
    description: 'Salas ao vivo para jornadas terapêuticas com registro, deck randômico e síntese por IA.',
    url: '/'
  }
}

const faqItems = [
  {
    question: 'Preciso ser terapeuta para usar?',
    answer: 'Não. Você pode jogar de forma autoguiada ou com um profissional.'
  },
  {
    question: 'Cada jogador rola o próprio dado?',
    answer: 'Sim. Os turnos são individuais e cada jogador rola na sua vez.'
  },
  {
    question: 'O que é o deck randômico?',
    answer: 'Um conjunto de cartas puxadas a qualquer momento (1 a 3) para abrir novas perspectivas.'
  },
  {
    question: 'A IA substitui terapia?',
    answer: 'Não. Ela oferece perguntas e síntese limitada, sempre como apoio ao humano.'
  },
  {
    question: 'O histórico fica salvo?',
    answer: 'Sim. Todas as jogadas e registros ficam no perfil do terapeuta ou facilitador.'
  }
]

export default function HomePage() {
  return (
    <div>
      <Hero
        eyebrow="Maha Lilah Online"
        title="Maha Lilah Online"
        subtitle="Salas ao vivo para jornadas terapêuticas com registro, deck randômico e síntese por IA."
        primaryCta={{ label: 'Ver planos', href: '/planos' }}
        secondaryCta={{ label: 'Como funciona', href: '/como-funciona' }}
        mediaLabel="Vídeo hero: criar sala, convidar por e-mail, rolar dado, puxar cartas, registrar terapia, gerar resumo"
        note="Não substitui terapia ou atendimento médico"
      />

      <Features
        eyebrow="Para quem é"
        title="Uma sala para cada tipo de jornada"
        subtitle="Conduza com autonomia, com apoio profissional ou em grupo, sempre com login obrigatório."
        items={[
          {
            title: 'Autoguiado',
            description: 'Para quem deseja praticar auto-observação com registros e perguntas guiadas.'
          },
          {
            title: 'Terapeuta + assistido',
            description: 'Sessão conduzida por profissional com histórico e export de registros.'
          },
          {
            title: 'Grupo',
            description: 'Vários jogadores no tabuleiro, turnos claros e visibilidade em tempo real.'
          }
        ]}
      />

      <SectionShell>
        <SectionHeader
          eyebrow="Diferenciais"
          title="O que torna diferente"
          subtitle="Tudo pensado para experiência segura, acolhedora e consistente."
        />
        <div className="grid gap-4 rounded-3xl border border-border/70 bg-surface/70 p-5 text-sm text-ink-muted sm:grid-cols-2 sm:p-8">
          {[
            'Tempo real com sala online compartilhada',
            'Login obrigatório para participar',
            'Convites por e-mail com vínculo de identidade',
            'Histórico completo por sala e por terapeuta',
            'Deck randômico para puxar 1 a 3 cartas',
            'IA com limites por jogador e por sessão'
          ].map((item) => (
            <div key={item} className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-gold" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </SectionShell>

      <Steps
        eyebrow="Como funciona"
        title="Em três passos simples"
        subtitle="Do pagamento à sessão ao vivo, sem fricção."
        steps={[
          {
            title: 'Escolha um plano ou sessão',
            description: 'Sessão avulsa ou assinatura com limites claros e checkout via Mercado Pago.'
          },
          {
            title: 'Crie a sala e convide por e-mail',
            description: 'Cada convite vincula o jogador e garante login obrigatório.'
          },
          {
            title: 'Jogue ao vivo e registre',
            description: 'Rolagens individuais, deck randômico e registros terapêuticos em tempo real.'
          }
        ]}
      />

      <VideoSection
        eyebrow="Demo rápido"
        title="Veja o fluxo em 60-90 segundos"
        subtitle="Criar sala, convidar por e-mail, rolar dado, puxar cartas e gerar síntese final."
        mediaLabel="Vídeo curto demonstrando o fluxo completo"
        bullets={[
          'Sala online em tempo real',
          'Deck randômico quando precisar de novas perguntas',
          'Modo terapia com registros essenciais'
        ]}
      />

      <ImageGallery
        eyebrow="Recursos"
        title="Tudo no mesmo painel"
        subtitle="Deck randômico, modo terapia, relatórios e dashboard de acompanhamento."
        items={[
          { label: 'Screenshot: sala ao vivo com tabuleiro', variant: 'horizontal' },
          { label: 'Screenshot: modo terapia com registro', variant: 'vertical' },
          { label: 'Screenshot: resumo de IA e relatórios', variant: 'horizontal' },
          { label: 'Screenshot: dashboard do terapeuta', variant: 'vertical' }
        ]}
      />

      <Testimonials
        eyebrow="Prova social"
        title="Relatos de quem já conduz"
        subtitle="Experiências reais, sem promessas milagrosas."
        items={[
          {
            quote:
              'O fluxo ao vivo me ajuda a manter o grupo alinhado. O registro por jogada facilita o retorno na sessão seguinte.',
            name: 'Marina A.',
            role: 'Terapeuta integrativa'
          },
          {
            quote:
              'As cartas randômicas trazem ar novo quando a conversa fica densa. Tudo fica registrado sem eu perder o ritmo.',
            name: 'Rafael L.',
            role: 'Facilitador de grupos'
          }
        ]}
      />

      <FAQ
        eyebrow="FAQ curto"
        title="Dúvidas frequentes"
        subtitle="Resumo rápido antes de escolher seu plano."
        items={faqItems}
        ctaLabel="Ver FAQ completa"
        ctaHref="/faq"
      />

      <CTA
        title="Comece com clareza e segurança"
        subtitle="Crie sua primeira sala e acompanhe toda a jornada com registro e síntese cuidadosa."
        primaryCta={{ label: 'Começar agora', href: '/planos' }}
        secondaryCta={{ label: 'Falar com a equipe', href: '/contato' }}
      />

      <LegalNotice
        items={[
          'Maha Lilah Online não substitui terapia, atendimento médico ou emergência.',
          'Resultados variam conforme contexto, condução e envolvimento de cada participante.'
        ]}
      />
    </div>
  )
}
