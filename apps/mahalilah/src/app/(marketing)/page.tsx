import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@hekate/database'
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
import { withSeoDefaults } from '@/lib/marketing/seo'

export const metadata: Metadata = withSeoDefaults({
  title: 'Maha Lilah Online',
  description:
    'Conduza jornadas terapêuticas ao vivo com experiência encantadora, registro inteligente e segurança de ponta.',
  openGraph: {
    title: 'Maha Lilah Online',
    description:
      'Conduza jornadas terapêuticas ao vivo com experiência encantadora, registro inteligente e segurança de ponta.',
    url: '/'
  }
})

type OperationalSnapshot = {
  sessionsThisMonth: number
  therapistsActiveThisMonth: number
  entriesThisMonth: number
  hasLiveData: boolean
}

const FALLBACK_OPERATIONAL_SNAPSHOT: OperationalSnapshot = {
  sessionsThisMonth: 0,
  therapistsActiveThisMonth: 0,
  entriesThisMonth: 0,
  hasLiveData: false
}

async function loadOperationalSnapshot(): Promise<OperationalSnapshot> {
  if (process.env.SKIP_REDIS === '1') {
    return FALLBACK_OPERATIONAL_SNAPSHOT
  }

  const databaseUrl = process.env.DATABASE_URL?.trim()
  if (!databaseUrl) {
    return FALLBACK_OPERATIONAL_SNAPSHOT
  }

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  try {
    const [sessionsThisMonth, therapistsActiveThisMonth, entriesThisMonth] =
      await Promise.all([
        prisma.mahaLilahRoom.count({
          where: { createdAt: { gte: monthStart } }
        }),
        prisma.mahaLilahRoom
          .groupBy({
            by: ['createdByUserId'],
            where: { createdAt: { gte: monthStart } }
          })
          .then((rows) => rows.length),
        prisma.mahaLilahTherapyEntry.count({
          where: { createdAt: { gte: monthStart } }
        })
      ])

    return {
      sessionsThisMonth,
      therapistsActiveThisMonth,
      entriesThisMonth,
      hasLiveData: true
    }
  } catch (error) {
    console.error('Erro ao buscar indicadores operacionais (Maha Lilah):', error)
    return FALLBACK_OPERATIONAL_SNAPSHOT
  }
}

export default async function HomePage() {
  const {
    sessionsThisMonth,
    therapistsActiveThisMonth,
    entriesThisMonth,
    hasLiveData
  } = await loadOperationalSnapshot()

  return (
    <div>
      <Hero
        title="Jogue no tabuleiro do Maha Lilah — com assistência de IA"
        subtitle="Autoguiado ou em sessão terapêutica, crie uma sala, role o dado, avance pelas casas e registre o que importa — com perguntas e síntese quando você quiser."
        primaryCta={{ label: 'Experimente', href: '/dashboard' }}
        mediaLabel="Vídeo hero: fluxo completo da jornada, da criação da sala ao fechamento"
        note="Com assistência de IA, eu consigo me autoguiar com perguntas, sínteses e resumos"
        highlights={['Autoguiado', 'Autoconhecimento', 'Expansão da Consciência']}
        metrics={[
          { value: '3 min', label: 'para abrir a sala' },
          { value: '1 painel', label: 'para tudo da sessão' },
          { value: '100%', label: 'rastreio completo da jornada' }
        ]}
      />
      
      <CTA
        title="Leve seu trabalho para um novo nível de presença"
        subtitle="Crie sua primeira sala agora e descubra por que facilitadores e terapeutas utilizam o Maha Lilah Online."
        primaryCta={{ label: 'Ver planos', href: '/planos' }}
        secondaryCta={{ label: 'Falar com a equipe', href: '/contato' }}
        badges={['Inicio rápido', 'Suporte humano', 'Assistência com IA', 'Deck exclusivo para o Jogo']}
      />

      <SectionShell>
        <SectionHeader
          eyebrow="O que é Maha Lilah?"
          title="Mais que um jogo: uma jornada de autoconhecimento no tabuleiro"
          subtitle="Maha Lilah é um tabuleiro hindu de autoconhecimento com 72 casas em 8 níveis. Você lança o dado e avança: escadas elevam o caminho e serpentes mostram quedas e aprendizados. A jornada espelha o seu momento e ajuda a encontrar clareza e próximo passo — até a casa 68 (Consciência Cósmica)."
        />
      </SectionShell>

      <Features
        eyebrow="Para quem é"
        title="Uma experiência que se adapta ao seu jeito de jogar e conduzir"
        subtitle="Do autoguiado à prática terapêutica — com estrutura, fluidez e presença no tabuleiro online."
        items={[
          {
            title: 'Jornada autoguiada',
            description: "Para quando eu quero clareza sozinho(a): perguntas por casa, registro leve por jogada e assistência de IA opcional para destravar reflexão e fechar com síntese."
          },
          {
            title: 'Terapeuta + assistido',
            description: 'Para sessões 1:1: sala com link seguro, condução no tabuleiro ao vivo, registro por jogada e histórico com relatório em PDF para acompanhar o processo.'
          },
          {
            title: 'Grupos e vivências',
            description: 'Para rodas e workshops: turnos organizados, tabuleiro compartilhado e uma dinâmica que mantém foco e profundidade com várias pessoas.'
          },
          {
            title: 'Facilitadores de comunidade',
            description: 'Para turmas recorrentes: fluxo simples para repetir encontros com consistência e manter qualidade de condução.'
          }
        ]}
      />

      <SectionShell>
        <SectionHeader
          eyebrow="POR QUE AS PESSOAS VOLTAM"
          title="O progresso fica visível — e a experiência continua viva"
          subtitle="Cada detalhe do Maha Lilah Online foi pensado para manter o fluxo do jogo e a profundidade da jornada."
        />
        <div className="grid gap-4 rounded-3xl border border-border/70 bg-surface/70 p-5 text-sm text-ink-muted sm:grid-cols-2 sm:p-8">
          {[
            'Autoguiado com constância: retome do ponto exato e veja evolução ao longo do tempo',
            'IA opcional (no momento certo): perguntas melhores na casa certa + síntese final para integrar',
            'Cartas de apoio: novas perspectivas sem forçar significado',
            'Registro leve por jogada: o essencial fica guardado sem burocracia',
            'Histórico seguro + relatório em PDF confiança para continuar e acompanhar',
            'Para terapeutas: memória por sessão + exportação para continuidade',
            'Ao vivo quando precisar: sala com link e presença em tempo real',
            'Clareza de turno (para grupos): o centro da rodada fica evidente'        
          ].map((item) => (
            <div key={item} className="flex items-start gap-3">
              <span className="mt-1 h-2.5 w-2.5 rounded-full bg-gold" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </SectionShell>

      <Steps
        eyebrow="Como começa"
        title="Em 3 passos, você já está jogando e conduzindo"
        subtitle="Tudo pronto para autoguiado e para sessões com clientes - sem curva longa de aprendizado."
        steps={[
          {
            title: 'Escolha o seu modo',
            description: 'Autoguiado (solo) ou sessão terapêutica, com estrutura e continuidade.'
          },
          {
            title: 'Crie a sala e convide',
            description: 'Gere uma sala em segundos e, se houver participantes, envie o link por e-mail com entrada segura.'
          },
          {
            title: 'Jogue no tabuleiro e registre',
            description: 'Role o dado, avance pelas casas e registre o essencial por jogada. Ative a assistência de IA (opcional) para sugestões de perguntas e uma síntese final.'
          }
        ]}
      />

      <VideoSection
        eyebrow="Demonstração"
        title="Veja o ciclo completo em menos de 90 segundos"
        subtitle="Da criação da sala ao fechamento: tabuleiro ao vivo e online, registro e síntese - com ritmo, beleza e clareza"
        mediaLabel="Vídeo curto mostrando criação da sala, convites, jogadas, cartas e síntese"
        bullets={[
          'Criação de sala em segundos (sem configuração técnica)',
          'Convite por e-mail com link único e entrada segura',
          'Dado e tabuleiro em tempo real com sensação de presença',
          'Turnos claros (quem está no centro fica evidente)',
          'Cartas/apoios no momento certo para destravar a sessão',
          'Assistência de IA opcional: sugere perguntas e amplia perspectivas',
          'Síntese final por um clique (fechamento claro e acionável)',
          'Histórico por sessão com relatório em PDF para continuidade terapêutica'
        ]}
      />

      <ImageGallery
        eyebrow="Visão do produto"
        title="Encantamento com propósito em cada tela"
        subtitle="Interface pensada para presença e continuidade: tabuleiro no centro, registro por jogada e fechamento claro — para você conduzir sem se perder no processo."
        items={[
          {
            label: 'Sala ao vivo (presença real)',
            variant: 'horizontal',
            imageSrc: '/marketing/visao-produto/tela-01.webp',
            description:
              'Tabuleiro compartilhado em tempo real — todos veem o mesmo movimento e o centro da rodada fica claro.'
          },
          {
            label: 'Registro por jogada (sem burocracia)',
            variant: 'vertical',
            imageSrc: '/marketing/visao-produto/tela-02.webp',
            description:
              'Em cada movimento, você registra o essencial (emoção, insight, ação). Fica leve, consistente e fácil de retomar.'
          },
          {
            label: 'Síntese final por IA (fechamento claro)',
            variant: 'horizontal',
            imageSrc: '/marketing/visao-produto/tela-03.webp',
            description:
              'Um clique para consolidar padrões, aprendizados e próximos passos — ótimo para continuidade entre sessões.'
          },
          {
            label: 'IA durante a sessão (perguntas que destravam)',
            variant: 'vertical',
            imageSrc: '/marketing/visao-produto/tela-04.webp',
            description:
              'Peça sugestões na hora certa: perguntas, ângulos e provocações para aprofundar sem invadir sua condução.'
          },
          {
            label: 'Dashboard do terapeuta (visão profissional)',
            variant: 'horizontal',
            imageSrc: '/marketing/visao-produto/tela-05.webp',
            description:
              'Convites, participantes e indicadores num painel só — para acompanhar evolução e consistência de condução.'
          },
          {
            label: 'Linha da jornada (memória viva)',
            variant: 'vertical',
            imageSrc: '/marketing/visao-produto/tela-06.webp',
            description:
              'Histórico completo do caminho: casas visitadas, registros e momentos-chave para lembrar ‘como chegou até aqui’.'
          }
        ]}
      />

      <Testimonials
        eyebrow="Prova social"
        title="Quem conduz percebe diferença na primeira semana"
        subtitle="Relatos reais de profissionais e facilitadores que adotaram o fluxo."
        items={[
          {
            quote:
              'A experiência ficou mais fluida. O grupo se mantém conectado e eu não perco o fio da condução.',
            name: 'Marina A.',
            role: 'Terapeuta integrativa'
          },
          {
            quote:
              'O deck randômico traz profundidade sem engessar. A plataforma sustenta o processo com leveza.',
            name: 'Rafael L.',
            role: 'Facilitador de grupos'
          },
          {
            quote:
              'Antes eu me perdia nos registros. Agora eu fecho a sessão com clareza e plano de continuidade.',
            name: 'Beatriz M.',
            role: 'Psicoterapeuta corporal'
          }
        ]}
      />

   
    </div>
  )
}
