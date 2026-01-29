import type { Metadata } from 'next'
import { MediaPlaceholder } from '@/components/marketing/MediaPlaceholder'
import { CTA } from '@/components/marketing/sections/CTA'
import { Features } from '@/components/marketing/sections/Features'
import { Hero } from '@/components/marketing/sections/Hero'
import { Testimonials } from '@/components/marketing/sections/Testimonials'
import { SectionHeader, SectionShell } from '@/components/marketing/ui'

export const metadata: Metadata = {
  title: 'Para grupos',
  description: 'Jornadas em grupo com turnos claros, visibilidade em tempo real e registros individuais.',
  openGraph: {
    title: 'Maha Lilah Online para grupos',
    description: 'Jornadas em grupo com turnos claros, visibilidade em tempo real e registros individuais.',
    url: '/para-grupos'
  }
}

export default function ParaGruposPage() {
  return (
    <div>
      <Hero
        eyebrow="Para grupos"
        title="Jornadas em grupo, com turnos e visibilidade em tempo real"
        subtitle="Cada participante entra com login obrigatório, rola seu próprio dado e registra sua experiência com segurança."
        primaryCta={{ label: 'Ver planos e limites', href: '/planos' }}
        secondaryCta={{ label: 'Como funciona', href: '/como-funciona' }}
        mediaLabel="Imagem: grupo em sala ao vivo"
      />

      <Features
        eyebrow="Recursos para grupos"
        title="Organização que respeita cada voz"
        subtitle="Uma sala, vários jogadores, sem perder o ritmo nem a visibilidade."
        items={[
          {
            title: 'Vários jogadores no tabuleiro',
            description: 'Todos veem o mesmo tabuleiro e acompanham o andamento da jornada.'
          },
          {
            title: 'Cada jogador rola na sua vez',
            description: 'Turnos individuais garantem autonomia e evitam sobreposição.'
          },
          {
            title: 'Deck randômico para insights coletivos',
            description: 'Cartas puxadas no momento certo ajudam o grupo a encontrar novas perguntas.'
          },
          {
            title: 'Registro individual e síntese final',
            description: 'Cada participante registra sua experiência, com fechamento organizado ao final.'
          }
        ]}
      />

      <SectionShell>
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col gap-6">
            <SectionHeader
              eyebrow="Participantes"
              title="Como calcular o número ideal"
              subtitle="Planeje o tamanho do grupo de acordo com o tempo disponível e o nível de profundidade desejado."
            />
            <ul className="list-disc space-y-2 pl-5 text-sm text-ink-muted">
              <li>Grupos menores (3-5) favorecem aprofundamento individual.</li>
              <li>Grupos médios (6-8) equilibram diversidade e tempo de fala.</li>
              <li>Grupos maiores exigem mais tempo e combinados claros.</li>
              <li>Use o tempo da sessão como referência para distribuir turnos.</li>
            </ul>
          </div>
          <MediaPlaceholder variant="vertical" label="Imagem: planejamento de grupo" />
        </div>
      </SectionShell>

      <Testimonials
        eyebrow="Relatos"
        title="Grupos que encontraram fluidez"
        subtitle="Experiências reais, com foco em segurança emocional."
        items={[
          {
            quote: 'Os turnos deixam todo mundo tranquilo. A sala fica viva, mas organizada.',
            name: 'Isabela C.',
            role: 'Facilitadora de grupos'
          },
          {
            quote: 'O deck randômico ajuda o grupo a destravar sem impor significados.',
            name: 'Thiago M.',
            role: 'Coordenador de vivências'
          }
        ]}
      />

      <CTA
        title="Pronto para reunir seu grupo?"
        subtitle="Veja os limites de participantes e escolha o plano ideal para sua jornada coletiva."
        primaryCta={{ label: 'Ver planos e limites', href: '/planos' }}
        secondaryCta={{ label: 'Falar com a equipe', href: '/contato' }}
      />
    </div>
  )
}
