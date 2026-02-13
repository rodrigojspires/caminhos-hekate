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

const faqItems = [
  {
    question: 'Preciso ser terapeuta para usar?',
    answer: 'Não. Você pode conduzir jornadas autoguiadas, em grupo ou com acompanhamento profissional.'
  },
  {
    question: 'Cada jogador rola o próprio dado?',
    answer: 'Sim. Cada pessoa joga na própria vez, com organização e visibilidade para o grupo.'
  },
  {
    question: 'O que é o deck randômico?',
    answer: 'Cartas que você puxa no momento certo para abrir novas perguntas e destravar a conversa.'
  },
  {
    question: 'A IA substitui terapia?',
    answer: 'Não. Ela apenas apoia com perguntas e síntese final, sempre com limites e decisão humana.'
  },
  {
    question: 'Os registros ficam salvos?',
    answer: 'Sim. Histórico por sala e por facilitador, com export para continuidade da jornada.'
  }
]

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
        primaryCta={{ label: 'Ver planos', href: '/planos' }}
        secondaryCta={{ label: 'Experimente', href: '/como-funciona' }}
        mediaLabel="Vídeo hero: fluxo completo da jornada, da criação da sala ao fechamento"
        note="Não substitui terapia ou atendimento médico"
        highlights={['Tempo real', 'Login obrigatório', 'Consentimento registrado', 'Mercado Pago']}
        metrics={[
          { value: '3 min', label: 'para abrir a sala' },
          { value: '1 painel', label: 'para tudo da sessão' },
          { value: '100%', label: 'rastreio de jornada' }
        ]}
      />

      <SectionShell>
        <SectionHeader
          eyebrow="O que é Maha Lilah?"
          title="Uma plataforma para conduzir jornadas terapêuticas ao vivo"
          subtitle="Em 30 segundos: você cria a sala, convida participantes por e-mail, conduz o tabuleiro com turnos claros e fecha com registros organizados."
        />
        <div className="rounded-3xl border border-border/70 bg-surface/70 p-5 text-sm text-ink-muted sm:p-8">
          <p>
            O Maha Lilah combina experiência simbólica com estrutura prática de condução.
            Você mantém profundidade terapêutica sem perder o ritmo da sessão.
          </p>
          <Link href="/como-funciona" className="mt-4 inline-flex text-sm text-gold">
            Leitura de 30s: como funciona →
          </Link>
        </div>
      </SectionShell>

      <Features
        eyebrow="Para quem é"
        title="Uma experiência que se adapta ao seu jeito de conduzir"
        subtitle="Do autoconhecimento individual à facilitação de grupos, com fluidez e presença."
        items={[
          {
            title: 'Jornada autoguiada',
            description: 'Para quem quer clareza emocional com estrutura de perguntas e registro leve.'
          },
          {
            title: 'Terapeuta + assistido',
            description: 'Condução profissional com histórico por sessão e export para acompanhamento.'
          },
          {
            title: 'Grupos e vivências',
            description: 'Turnos organizados, visão compartilhada e segurança para múltiplos participantes.'
          },
          {
            title: 'Facilitadores de comunidade',
            description: 'Fluxo simples para abrir turmas recorrentes sem perder qualidade de condução.'
          }
        ]}
      />

      <SectionShell>
        <SectionHeader
          eyebrow="Por que converte"
          title="Retenção nasce da sensação de progresso real"
          subtitle="Cada detalhe do produto foi pensado para manter engajamento sem sacrificar profundidade."
        />
        <div className="grid gap-4 rounded-3xl border border-border/70 bg-surface/70 p-5 text-sm text-ink-muted sm:grid-cols-2 sm:p-8">
          {[
            'Entrada simples: login e convite por e-mail em minutos',
            'Clareza de turno: o grupo sabe sempre quem está no centro',
            'Apoio na hora certa: deck randômico para destravar conversas',
            'Memória terapêutica: registros curtos e consistentes por jogada',
            'Fechamento objetivo: síntese final assistida por IA por botão',
            'Confiança para voltar: histórico seguro e exportável'
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
        title="Em três passos, você já está conduzindo"
        subtitle="Sem curva técnica longa e sem fricção no meio do caminho."
        steps={[
          {
            title: 'Escolha o plano ideal',
            description: 'Sessão avulsa para testar ou assinatura para quem precisa de constância.'
          },
          {
            title: 'Crie a sala e convide',
            description: 'Convites por e-mail com vínculo de identidade e entrada segura.'
          },
          {
            title: 'Conduza e registre ao vivo',
            description: 'Ritmo do grupo, profundidade terapêutica e histórico completo em um só fluxo.'
          }
        ]}
      />

      <VideoSection
        eyebrow="Demonstração"
        title="Veja o ciclo completo em menos de 90 segundos"
        subtitle="Da criação da sala ao fechamento da sessão, tudo com ritmo, beleza e clareza."
        mediaLabel="Vídeo curto mostrando criação da sala, convites, jogadas, cartas e síntese"
        bullets={[
          'Experiência em tempo real com sensação de presença',
          'Deck randômico para ampliar perspectivas sem forçar significado',
          'Registro terapêutico que favorece continuidade entre sessões'
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

      <SectionShell>
        <SectionHeader
          eyebrow="Números verificáveis"
          title="Indicadores reais do mês atual"
          subtitle={
            hasLiveData
              ? 'Dados operacionais extraídos da plataforma para validar tração e uso.'
              : 'Indicadores em modo de fallback durante o build. Em produção, os dados carregam automaticamente.'
          }
        />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-border/70 bg-surface/70 p-5">
            <p className="font-serif text-3xl text-gold">{sessionsThisMonth}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.16em] text-ink-muted">salas criadas no mês</p>
          </div>
          <div className="rounded-3xl border border-border/70 bg-surface/70 p-5">
            <p className="font-serif text-3xl text-gold">{therapistsActiveThisMonth}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.16em] text-ink-muted">terapeutas/facilitadores ativos</p>
          </div>
          <div className="rounded-3xl border border-border/70 bg-surface/70 p-5">
            <p className="font-serif text-3xl text-gold">{entriesThisMonth}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.16em] text-ink-muted">registros terapêuticos no mês</p>
          </div>
        </div>
      </SectionShell>

      <SectionShell>
        <SectionHeader
          eyebrow="Mini-cases"
          title="Antes e depois do retrabalho"
          subtitle="Contextos anonimizados para mostrar impacto operacional sem expor clientes."
        />
        <div className="grid gap-4 md:grid-cols-2">
          {[
            {
              title: 'Terapeuta individual (agenda semanal)',
              before: 'Antes: fechamento disperso e notas soltas.',
              after: 'Depois: fechamento com síntese + histórico organizado por sessão.'
            },
            {
              title: 'Facilitador de grupo (6-8 participantes)',
              before: 'Antes: sobreposição de fala e pouca rastreabilidade.',
              after: 'Depois: turnos claros, registro por participante e retorno mais estruturado.'
            }
          ].map((item) => (
            <article key={item.title} className="rounded-3xl border border-border/70 bg-surface/70 p-5 text-sm text-ink-muted">
              <h3 className="font-serif text-xl text-ink">{item.title}</h3>
              <p className="mt-3">{item.before}</p>
              <p className="mt-2 text-ink">{item.after}</p>
            </article>
          ))}
        </div>
      </SectionShell>

      <FAQ
        eyebrow="FAQ"
        title="Dúvidas frequentes antes de começar"
        subtitle="Respostas rápidas para você decidir com segurança."
        items={faqItems}
        ctaLabel="Ver FAQ completa"
        ctaHref="/faq"
      />

      <CTA
        title="Leve seu trabalho para um novo nível de presença"
        subtitle="Crie sua primeira sala agora e descubra por que facilitadores e terapeutas permanecem no Maha Lilah."
        primaryCta={{ label: 'Ver planos', href: '/planos' }}
        secondaryCta={{ label: 'Falar com a equipe', href: '/contato' }}
        badges={['Setup rápido', 'Sem curva complexa', 'Suporte humano']}
      />

      <LegalNotice
        items={[
          'Maha Lilah Online é uma plataforma de apoio terapêutico e não substitui atendimento clínico ou emergencial.',
          'Resultados variam conforme contexto, condução profissional e comprometimento dos participantes.'
        ]}
      />
    </div>
  )
}
