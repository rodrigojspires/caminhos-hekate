import type { Metadata } from 'next'
import { CTA } from '@/components/marketing/sections/CTA'
import { FAQ } from '@/components/marketing/sections/FAQ'
import { Features } from '@/components/marketing/sections/Features'
import { Hero } from '@/components/marketing/sections/Hero'
import { Testimonials } from '@/components/marketing/sections/Testimonials'
import { SectionHeader, SectionShell } from '@/components/marketing/ui'
import { withSeoDefaults } from '@/lib/marketing/seo'

export const metadata: Metadata = withSeoDefaults({
  title: 'Para grupos',
  description:
    'Conduza grupos com ritmo, segurança emocional e uma experiência que aumenta a participação.',
  openGraph: {
    title: 'Maha Lilah Online para grupos',
    description:
      'Conduza grupos com ritmo, segurança emocional e uma experiência que aumenta a participação.',
    url: '/para-grupos'
  }
})

const faqItems = [
  {
    question: 'Quantas pessoas posso conduzir por sessão?',
    answer:
      'Você pode adaptar conforme o plano, mas grupos entre 3 e 8 pessoas costumam manter melhor equilíbrio entre profundidade e tempo de fala.'
  },
  {
    question: 'O facilitador também joga durante a sessão?',
    answer:
      'Sim, quando fizer sentido para o formato do grupo. Você pode conduzir apenas como facilitador ou participar da jornada.'
  },
  {
    question: 'Consigo acompanhar o histórico por participante?',
    answer:
      'Sim. A plataforma organiza registros por jogada e por participante, facilitando retomadas e acompanhamento.'
  }
]

export default function ParaGruposPage() {
  return (
    <div>
      <Hero
        title="Grupos com energia alta, organização clara e profundidade"
        subtitle="Cada participante entra com login, joga no próprio turno e vivencia uma jornada coletiva sem perder a individualidade."
        primaryCta={{ label: 'Experimente', href: '/dashboard' }}
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
        <SectionHeader
          eyebrow="Dimensionamento"
          title="Como definir o tamanho ideal do grupo"
          subtitle="Escolher a quantidade certa de participantes melhora a retenção e a qualidade da condução."
        />
        <div className="grid gap-4 rounded-3xl border border-border/70 bg-surface/70 p-5 text-sm text-ink-muted sm:grid-cols-2 sm:p-8">
          {[
            '3 a 5 pessoas: profundidade individual mais alta.',
                '6 a 8 pessoas: equilíbrio entre diversidade e tempo de fala.',
                'Acima de 8: exige blocos de tempo e acordos bem definidos.',
                'Sempre planeje tempo de abertura, desenvolvimento e fechamento.'
          ].map((item) => (
            <div key={item} className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-teal" />
              <span>{item}</span>
            </div>
          ))}
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

      <FAQ
        eyebrow="FAQ"
        title="Perguntas sobre grupos"
        items={faqItems}
      />
    </div>
  )
}
