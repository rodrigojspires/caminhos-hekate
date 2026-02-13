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

export const metadata: Metadata = {
  title: 'Maha Lilah Online',
  description:
    'Conduza jornadas terapêuticas ao vivo com experiência encantadora, registro inteligente e segurança de ponta.',
  openGraph: {
    title: 'Maha Lilah Online',
    description:
      'Conduza jornadas terapêuticas ao vivo com experiência encantadora, registro inteligente e segurança de ponta.',
    url: '/'
  }
}

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
        title="Jogue ao vivo em um tabuleiro de autoconhecimento — com assistência de IA."
        subtitle="Crie sua sala, convide participantes e conduza a jornada com apoio inteligente do começo ao fim."
        primaryCta={{ label: 'Experimente', href: '/como-funciona' }}
        mediaLabel="Vídeo hero: fluxo completo da jornada, da criação da sala ao fechamento"
        note="Com a ajuda da Ia, você pode ser seu próprio Terapeuta na condução do jogo"
        highlights={['Autoguiado', 'Autoconhecimento', 'Expansão da Consciência']}
        metrics={[
          { value: '3 min', label: 'para abrir a sala' },
          { value: '1 painel', label: 'para tudo da sessão' },
          { value: '100%', label: 'rastreio de jornada' }
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
          title="Mais que um jogo, uma jornada terapêutica lúdica"
          subtitle="Maha Lilah é um jogo de tabuleiro hindu de autoconhecimento. O tabuleiro tem 72 casas, organizadas em 8 níveis, e cada casa representa um estado de consciência e uma experiência humana. A pessoa lança um dado e avança; as escadas elevam o caminho e as serpentes mostram quedas e aprendizados. A jornada busca chegar à casa 68, a Consciência Cósmica, como um espelho do momento presente."
        />
      </SectionShell>

      <Features
        eyebrow="Para quem é"
        title="Uma experiência que se adapta ao seu jeito de conduzir"
        subtitle="Do uso individual ao trabalho profissional e à facilitação de grupos — com estrutura, fluidez e presença."
        items={[
          {
            title: 'Jornada autoguiada',
            description: "Para quem quer se orientar sozinho(a) com perguntas bem construídas, clareza emocional e um registro simples para acompanhar insights, padrões e decisões ao longo do tempo."
          },
          {
            title: 'Terapeuta + assistido',
            description: 'Para conduções profissionais: você tem apoio de perguntas, organização por sessão e histórico do processo, com possibilidade de exportação para acompanhamento e documentação.'
          },
          {
            title: 'Grupos e vivências',
            description: 'Ideal para rodas, workshops e encontros: turnos organizados, leitura compartilhada e um formato seguro para múltiplos participantes — mantendo foco, tempo e qualidade.'
          },
          {
            title: 'Facilitadores de comunidade',
            description: 'Perfeito para turmas recorrentes: um fluxo leve para repetir encontros com consistência, sem engessar seu estilo de condução e sem perder a profundidade da experiência.'
          }
        ]}
      />

      <SectionShell>
        <SectionHeader
          eyebrow="POR QUE AS PESSOAS VOLTAM"
          title="O progresso fica visível — e a experiência continua viva"
          subtitle="Cada detalhe do Mahalilah Online foi pensado para manter o fluxo do jogo e a profundidade da jornada."
        />
        <div className="grid gap-4 rounded-3xl border border-border/70 bg-surface/70 p-5 text-sm text-ink-muted sm:grid-cols-2 sm:p-8">
          {[
            'Começo rápido: entrar e convidar por e-mail leva poucos minutos',
            'IA que guia sem invadir: perguntas inteligentes para destravar reflexão na casa certa',
            'Cartas de apoio no momento certo: sugestões para destravar reflexão e conversa',
            'Síntese de encerramento: um resumo final (opcional) para consolidar o que foi visto',
            'Turnos claros: o grupo sempre sabe quem está no centro da rodada',
            'Registro leve por jogada: memória curta, consistente e fácil de retomar',
            'Confiança para continuar: histórico seguro e exportável quando você precisar',
            'Para terapeutas: memória por sessão + exportação para acompanhamento'            
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
        subtitle="Tudo pronto para autoguiado e para sessões com clientes. Sem curva longa de aprendizado."
        steps={[
          {
            title: 'Escolha o seu modo',
            description: 'Use como jornada autoguiada para você ou como sessão terapêutica com estrutura e continuidade.'
          },
          {
            title: 'Crie a sala e convide',
            description: 'Gere uma sala em segundos e convide por e-mail com link único e entrada segura.'
          },
          {
            title: 'Conduza e registre ao vivo',
            description: 'O tabuleiro organiza o ritmo. Você registra o essencial por jogada e ativa a assistência de IA para sugestões de perguntas e uma síntese final (opcional).'
          }
        ]}
      />

      <VideoSection
        eyebrow="Demonstração"
        title="Veja o ciclo completo em menos de 90 segundos"
        subtitle="Da criação da sala ao fechamento da sessão, tudo com ritmo, beleza e clareza."
        mediaLabel="Vídeo curto mostrando criação da sala, convites, jogadas, cartas e síntese"
        bullets={[
          'Criação de sala em segundos (sem configuração técnica)',
          'Convite por e-mail com link único e entrada segura',
          'Dado e tabuleiro em tempo real com sensação de presença',
          'Turnos claros (quem está no centro fica evidente)',
          'Cartas/apoios no momento certo para destravar a sessão',
          'Assistência de IA opcional: sugere perguntas e amplia perspectivas',
          'Síntese final por um clique (fechamento claro e acionável)',
          'Histórico por sessão com exportação para continuidade terapêutica'
        ]}
      />

      <ImageGallery
        eyebrow="Visão do produto"
        title="Encantamento com propósito em cada tela"
        subtitle="Interface envolvente para aumentar permanência, adesão e retorno às próximas sessões."
        items={[
          { label: 'Sala ao vivo com tabuleiro compartilhado', variant: 'horizontal' },
          { label: 'Modo terapia com registro por jogada', variant: 'vertical' },
          { label: 'Resumo final e linha de evolução da sessão', variant: 'horizontal' },
          { label: 'Dashboard para terapeutas e facilitadores', variant: 'vertical' }
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
