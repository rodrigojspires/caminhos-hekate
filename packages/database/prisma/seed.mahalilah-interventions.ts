import { PrismaClient } from '@prisma/client'

export type SeedInterventionPromptInput = {
  locale: string
  name: string
  systemPrompt?: string | null
  userPromptTemplate: string
}

export type SeedInterventionConfigInput = {
  triggerId: string
  title: string
  description: string
  enabled: boolean
  useAi: boolean
  sensitive: boolean
  requireTherapistApproval: boolean
  autoApproveWhenTherapistSolo: boolean
  severity: 'INFO' | 'ATTENTION' | 'CRITICAL'
  cooldownMoves: number
  cooldownMinutes: number
  thresholds: Record<string, number>
  metadata?: Record<string, unknown>
  prompts?: SeedInterventionPromptInput[]
}

export const MAHALILAH_INTERVENTION_SEED_DATA: SeedInterventionConfigInput[] = [
  {
    triggerId: 'turn_idle_soft',
    title: 'Inatividade leve no turno',
    description:
      '90 segundos sem rolar o dado com turno ativo.',
    enabled: true,
    useAi: false,
    sensitive: false,
    requireTherapistApproval: false,
    autoApproveWhenTherapistSolo: true,
    severity: 'INFO',
    cooldownMoves: 0,
    cooldownMinutes: 2,
    thresholds: {
      inactivitySeconds: 90,
      inactivityMinutes: 2,
    },
    metadata: {
      titleTemplate: 'Retome o ritmo da jogada',
      messageTemplate:
        'Já são {{inactivitySeconds}} segundos sem rolagem. Faça uma retomada consciente e siga no seu próprio ritmo.',
      reflectionQuestion:
        'O que precisa ser reorganizado internamente para você retomar agora?',
      microAction:
        'Respire fundo uma vez e defina uma intenção curta para a próxima jogada.',
    },
  },
  {
    triggerId: 'turn_idle_hard',
    title: 'Inatividade crítica no turno',
    description:
      '180 segundos sem rolar o dado com turno ativo.',
    enabled: true,
    useAi: false,
    sensitive: false,
    requireTherapistApproval: false,
    autoApproveWhenTherapistSolo: true,
    severity: 'ATTENTION',
    cooldownMoves: 0,
    cooldownMinutes: 4,
    thresholds: {
      inactivitySeconds: 180,
      inactivityMinutes: 3,
    },
    metadata: {
      titleTemplate: 'Pausa longa detectada',
      messageTemplate:
        'A jogada ficou em pausa por {{inactivitySeconds}} segundos. Reengaje com acolhimento e clareza.',
      reflectionQuestion:
        'Qual foi a principal distração ou resistência neste intervalo?',
      microAction:
        'Faça uma pausa breve de presença e volte para a próxima rolagem com foco.',
    },
  },
  {
    triggerId: 'start_lock',
    title: 'Travamento no início',
    description:
      '4 tentativas sem sair da casa inicial.',
    enabled: true,
    useAi: false,
    sensitive: false,
    requireTherapistApproval: false,
    autoApproveWhenTherapistSolo: true,
    severity: 'ATTENTION',
    cooldownMoves: 2,
    cooldownMinutes: 10,
    thresholds: {
      preStartRollCount: 4,
    },
    metadata: {
      aiOptional: true,
      titleTemplate: 'Travamento inicial percebido',
      messageTemplate:
        'Foram {{rollsUntilStart}} tentativas sem sair da casa inicial. Pode haver proteção interna antes do próximo passo.',
      reflectionQuestion:
        'O que você precisa reconhecer agora para avançar com mais segurança?',
      microAction:
        'Nomeie em voz baixa uma condição de segurança interna para seguir.',
    },
  },
  {
    triggerId: 'repeat_house_short',
    title: 'Repetição curta de casa',
    description:
      'Mesma casa 2x em até 6 jogadas.',
    enabled: true,
    useAi: true,
    sensitive: false,
    requireTherapistApproval: false,
    autoApproveWhenTherapistSolo: true,
    severity: 'INFO',
    cooldownMoves: 2,
    cooldownMinutes: 12,
    thresholds: {
      houseRepeatCount: 2,
      repeatedHouseWindowMoves: 6,
    },
    prompts: [
      {
        locale: 'pt-BR',
        name: 'Leitura de repetição curta',
        systemPrompt:
          'Você é assistente terapêutico do Maha Lilah. Responda de forma objetiva, acolhedora e sem diagnóstico.',
        userPromptTemplate:
          'Contexto do jogador (JSON):\n{{contextJson}}\n\nA casa {{houseNumber}} repetiu {{repeatCount}} vezes em até {{windowMoves}} jogadas.\nGere intervenção no formato JSON puro:\n{"title":"...","message":"...","reflectionQuestion":"...","microAction":"..."}\n\nRegras:\n- português claro\n- mensagem curta\n- 1 pergunta reflexiva\n- 1 microação prática',
      },
    ],
  },
  {
    triggerId: 'shadow_streak',
    title: 'Sequência de casas sombra',
    description:
      '3 casas sombra seguidas.',
    enabled: true,
    useAi: true,
    sensitive: true,
    requireTherapistApproval: true,
    autoApproveWhenTherapistSolo: true,
    severity: 'CRITICAL',
    cooldownMoves: 2,
    cooldownMinutes: 15,
    thresholds: {
      shadowStreakCount: 3,
    },
    metadata: {
      approvalPolicy: 'recommended',
    },
    prompts: [
      {
        locale: 'pt-BR',
        name: 'Leitura de sequência sombra',
        systemPrompt:
          'Você é assistente terapêutico do Maha Lilah. Produza intervenção acolhedora, objetiva e sem diagnóstico.',
        userPromptTemplate:
          'Contexto do jogador (JSON):\n{{contextJson}}\n\nForam detectadas {{shadowCount}} casas sombra seguidas.\nCrie uma intervenção no formato JSON puro:\n{"title":"...","message":"...","reflectionQuestion":"...","microAction":"..."}',
      },
    ],
  },
  {
    triggerId: 'double_snake',
    title: 'Duas descidas por cobra',
    description:
      '2 descidas por cobra em até 4 jogadas.',
    enabled: true,
    useAi: true,
    sensitive: true,
    requireTherapistApproval: true,
    autoApproveWhenTherapistSolo: true,
    severity: 'CRITICAL',
    cooldownMoves: 3,
    cooldownMinutes: 15,
    thresholds: {
      snakeStreakCount: 2,
      snakeWindowMoves: 4,
    },
    metadata: {
      approvalPolicy: 'recommended',
    },
    prompts: [
      {
        locale: 'pt-BR',
        name: 'Leitura de dupla cobra',
        systemPrompt:
          'Você é assistente terapêutico do Maha Lilah. Evite diagnóstico e mantenha uma linguagem prática.',
        userPromptTemplate:
          'Contexto do jogador (JSON):\n{{contextJson}}\n\nForam detectadas {{snakeCount}} descidas por cobra em até {{windowMoves}} jogadas.\nCrie uma intervenção no formato JSON puro:\n{"title":"...","message":"...","reflectionQuestion":"...","microAction":"..."}',
      },
    ],
  },
  {
    triggerId: 'no_therapy_after_strong_move',
    title: 'Sem registro terapêutico após jogada intensa',
    description:
      'Jogada intensa e sem registro terapêutico após 2 jogadas.',
    enabled: true,
    useAi: false,
    sensitive: false,
    requireTherapistApproval: false,
    autoApproveWhenTherapistSolo: true,
    severity: 'ATTENTION',
    cooldownMoves: 2,
    cooldownMinutes: 10,
    thresholds: {
      noTherapyWindowMoves: 2,
      strongMoveMinDelta: 8,
    },
  },
  {
    triggerId: 'high_intensity_recurrence',
    title: 'Recorrência de alta intensidade emocional',
    description:
      'Intensidade >= 8 repetida em 3 registros próximos.',
    enabled: true,
    useAi: true,
    sensitive: true,
    requireTherapistApproval: true,
    autoApproveWhenTherapistSolo: true,
    severity: 'CRITICAL',
    cooldownMoves: 3,
    cooldownMinutes: 20,
    thresholds: {
      intensityMin: 8,
      intensityRepeatCount: 3,
      intensityWindowEntries: 5,
    },
    metadata: {
      approvalPolicy: 'mandatory',
    },
    prompts: [
      {
        locale: 'pt-BR',
        name: 'Leitura de intensidade recorrente',
        systemPrompt:
          'Você é assistente terapêutico do Maha Lilah. Seja acolhedor, responsável e sem diagnóstico clínico.',
        userPromptTemplate:
          'Contexto do jogador (JSON):\n{{contextJson}}\n\nA intensidade emocional alta se repetiu {{highIntensityCount}} vezes em registros próximos.\nCrie uma intervenção no formato JSON puro:\n{"title":"...","message":"...","reflectionQuestion":"...","microAction":"..."}',
      },
    ],
  },
  {
    triggerId: 'session_fatigue',
    title: 'Fadiga de sessão',
    description:
      '40+ jogadas na sessão.',
    enabled: true,
    useAi: false,
    sensitive: false,
    requireTherapistApproval: false,
    autoApproveWhenTherapistSolo: true,
    severity: 'ATTENTION',
    cooldownMoves: 5,
    cooldownMinutes: 30,
    thresholds: {
      fatigueMoveCount: 40,
    },
  },
  {
    triggerId: 'therapist_silence',
    title: 'Silêncio terapêutico prolongado',
    description:
      '8+ jogadas sem intervenção do terapeuta (quando aplicável).',
    enabled: true,
    useAi: false,
    sensitive: false,
    requireTherapistApproval: false,
    autoApproveWhenTherapistSolo: true,
    severity: 'INFO',
    cooldownMoves: 4,
    cooldownMinutes: 20,
    thresholds: {
      therapistSilenceMoves: 8,
    },
  },
]

export async function seedMahaLilahInterventions(prisma: PrismaClient) {
  const db = prisma as any
  if (!db.mahaLilahInterventionConfig || !db.mahaLilahInterventionPrompt) {
    throw new Error(
      'Prisma Client sem os modelos de intervenção. Rode `pnpm --filter @hekate/database db:generate` e aplique as migrations (`db:migrate:deploy`).',
    )
  }

  for (const config of MAHALILAH_INTERVENTION_SEED_DATA) {
    const persistedConfig = await db.mahaLilahInterventionConfig.upsert({
      where: { triggerId: config.triggerId },
      update: {},
      create: {
        triggerId: config.triggerId,
        title: config.title,
        description: config.description,
        enabled: config.enabled,
        useAi: config.useAi,
        sensitive: config.sensitive,
        requireTherapistApproval: config.requireTherapistApproval,
        autoApproveWhenTherapistSolo: config.autoApproveWhenTherapistSolo,
        severity: config.severity,
        cooldownMoves: config.cooldownMoves,
        cooldownMinutes: config.cooldownMinutes,
        thresholds: config.thresholds as any,
        metadata: (config.metadata || {}) as any,
      },
      select: { id: true },
    })

    if (!config.prompts?.length) continue

    for (const prompt of config.prompts) {
      const existingPrompt = await db.mahaLilahInterventionPrompt.findFirst({
        where: {
          configId: persistedConfig.id,
          locale: prompt.locale,
          name: prompt.name,
        },
        select: { id: true },
      })
      if (existingPrompt) continue

      await db.mahaLilahInterventionPrompt.create({
        data: {
          configId: persistedConfig.id,
          locale: prompt.locale,
          name: prompt.name,
          isActive: true,
          systemPrompt: prompt.systemPrompt || null,
          userPromptTemplate: prompt.userPromptTemplate,
        },
      })
    }
  }
}

async function tryLoadDotenv() {
  try {
    const [{ config }, path] = await Promise.all([
      import('dotenv') as Promise<{ config: (options?: any) => void }>,
      import('path') as Promise<typeof import('path')>,
    ])
    config({ path: path.resolve(process.cwd(), '../../.env') })
    config()
  } catch {
    // ignore
  }
}

export async function runSeedMahaLilahInterventionsOnly() {
  await tryLoadDotenv()
  const prisma = new PrismaClient()

  try {
    console.log('🌱 Iniciando seed exclusivo do motor de intervenções Maha Lilah...')
    await seedMahaLilahInterventions(prisma)
    console.log(
      `✅ Intervenções criadas/atualizadas: ${MAHALILAH_INTERVENTION_SEED_DATA.length}`,
    )
  } finally {
    await prisma.$disconnect()
  }
}

if (process.argv[1] && process.argv[1].endsWith('seed.mahalilah-interventions.ts')) {
  runSeedMahaLilahInterventionsOnly()
    .then(() => {
      console.log('🎉 Seed do motor de intervenções concluído')
    })
    .catch((error) => {
      console.error('❌ Erro no seed do motor de intervenções:', error)
      process.exit(1)
    })
}
