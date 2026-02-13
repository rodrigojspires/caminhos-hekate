import type { Metadata } from 'next'
import { MediaPlaceholder } from '@/components/marketing/MediaPlaceholder'
import { CTA } from '@/components/marketing/sections/CTA'
import { Features } from '@/components/marketing/sections/Features'
import { Hero } from '@/components/marketing/sections/Hero'
import { Testimonials } from '@/components/marketing/sections/Testimonials'
import { SectionHeader, SectionShell } from '@/components/marketing/ui'

export const metadata: Metadata = {
  title: 'Para grupos',
  description:
    'Conduza grupos com ritmo, segurança emocional e uma experiência que aumenta participação.',
  openGraph: {
    title: 'Maha Lilah Online para grupos',
    description:
      'Conduza grupos com ritmo, segurança emocional e uma experiência que aumenta participação.',
    url: '/para-grupos'
  }
}

export default function ParaGruposPage() {
  return (
    <div>
      <Hero
        eyebrow="Para grupos"
        title="Grupos com energia alta, organização clara e profundidade"
        subtitle="Cada participante entra com login, joga no próprio turno e vivencia uma jornada coletiva sem perder individualidade."
        primaryCta={{ label: 'Ver planos', href: '/planos' }}
        secondaryCta={{ label: 'Experimente', href: '/como-funciona' }}
        mediaLabel="Grupo em sessão ao vivo com turnos e acompanhamento"
        highlights={['Turnos individuais', 'Visão em tempo real', 'Registro por participante']}
      />

      <Features
        eyebrow="Recursos para grupos"
        title="Tudo para manter o grupo engajado até o final"
        subtitle="A estrutura combina dinamismo e segurança emocional para jornadas coletivas memoráveis."
        items={[
          {
            title: 'Tabuleiro compartilhado ao vivo',
            description: 'Todos acompanham o mesmo contexto e a evolução da sessão em tempo real.'
          },
          {
            title: 'Turnos individuais sem atropelo',
            description: 'Cada voz tem espaço, evitando sobreposição e melhorando escuta coletiva.'
          },
          {
            title: 'Deck randômico para destravar',
            description: 'Cartas no momento certo aumentam repertório e profundidade da conversa.'
          },
          {
            title: 'Fechamento organizado',
            description: 'Registros e síntese final ajudam o grupo a sair com clareza e próximos passos.'
          }
        ]}
      />

      <SectionShell>
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col gap-6">
            <SectionHeader
              eyebrow="Dimensionamento"
              title="Como definir o tamanho ideal do grupo"
              subtitle="Escolher a quantidade certa de participantes melhora retenção e qualidade da condução."
            />
            <ul className="space-y-3 text-sm text-ink-muted">
              {[
                '3 a 5 pessoas: profundidade individual mais alta.',
                '6 a 8 pessoas: equilíbrio entre diversidade e tempo de fala.',
                'Acima de 8: exige blocos de tempo e acordos bem definidos.',
                'Sempre planeje tempo de abertura, desenvolvimento e fechamento.'
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-gold" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <MediaPlaceholder variant="vertical" label="Planejamento de grupo e distribuição de turnos" />
        </div>
      </SectionShell>

      <Testimonials
        eyebrow="Relatos"
        title="Quem facilita grupos sente mais fluidez"
        subtitle="Resultados percebidos por profissionais que migraram para uma experiência digital estruturada."
        items={[
          {
            quote:
              'Os turnos deram segurança para o grupo inteiro. Até os mais quietos passaram a participar com confiança.',
            name: 'Isabela C.',
            role: 'Facilitadora de grupos'
          },
          {
            quote:
              'A condução ficou mais leve e profissional. O fechamento por síntese ajuda muito no pós-encontro.',
            name: 'Thiago M.',
            role: 'Coordenador de vivências'
          }
        ]}
      />

      <CTA
        title="Pronto para conduzir seu próximo grupo com mais impacto?"
        subtitle="Escolha o plano ideal para o número de participantes e comece sua jornada coletiva agora."
        primaryCta={{ label: 'Ver planos', href: '/planos' }}
        secondaryCta={{ label: 'Falar com a equipe', href: '/contato' }}
        badges={['Onboarding rápido', 'Escalável para grupos', 'Experiência memorável']}
      />
    </div>
  )
}
