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
  thresholds: {
    houseRepeatCount?: number
    repeatedHouseWindowMoves?: number
    snakeStreakCount?: number
    preStartRollCount?: number
    inactivityMinutes?: number
  }
  metadata?: Record<string, unknown>
  prompts?: SeedInterventionPromptInput[]
}

export const MAHALILAH_INTERVENTION_SEED_DATA: SeedInterventionConfigInput[] = [
  {
    triggerId: 'HOUSE_REPEAT_PATTERN',
    title: 'Casa recorrente detectada',
    description:
      'Dispara quando o participante repete a mesma casa várias vezes em uma janela curta.',
    enabled: true,
    useAi: false,
    sensitive: false,
    requireTherapistApproval: false,
    autoApproveWhenTherapistSolo: true,
    severity: 'ATTENTION',
    cooldownMoves: 2,
    cooldownMinutes: 8,
    thresholds: {
      houseRepeatCount: 3,
      repeatedHouseWindowMoves: 10,
    },
    metadata: {
      titleTemplate: 'Tema recorrente na casa {{houseNumber}}',
      messageTemplate:
        'A casa {{houseNumber}} reapareceu {{repeatCount}} vezes nas últimas {{windowMoves}} jogadas. Isso pode indicar um tema que está pedindo integração consciente nesta etapa da jornada.',
      reflectionQuestion:
        'O que esta repetição está tentando me mostrar e que ainda não foi integrado?',
      microAction:
        'Registre em uma frase qual aprendizado desta casa você escolhe praticar nas próximas 24 horas.',
    },
  },
  {
    triggerId: 'SNAKE_STREAK_PATTERN',
    title: 'Sequência de descidas detectada',
    description:
      'Dispara quando há sequência de descidas (cobras) em poucas jogadas.',
    enabled: true,
    useAi: false,
    sensitive: true,
    requireTherapistApproval: true,
    autoApproveWhenTherapistSolo: true,
    severity: 'CRITICAL',
    cooldownMoves: 3,
    cooldownMinutes: 12,
    thresholds: {
      snakeStreakCount: 2,
    },
    metadata: {
      titleTemplate: 'Atenção para padrão de queda',
      messageTemplate:
        'Foram identificadas {{snakeCount}} descidas em sequência. Esse padrão pode estar associado a uma trava emocional, autocrítica elevada ou retorno a estratégias antigas de proteção.',
      reflectionQuestion:
        'Qual contexto interno ou externo costuma anteceder essas quedas de energia e clareza?',
      microAction:
        'Escolha uma ação breve de autorregulação antes da próxima rolagem (respiração, pausa ou anotação do gatilho percebido).',
    },
  },
  {
    triggerId: 'PRE_START_STUCK_PATTERN',
    title: 'Demora para iniciar o caminho',
    description:
      'Dispara quando o participante demora para iniciar a jornada (muitos 6 não obtidos).',
    enabled: true,
    useAi: false,
    sensitive: false,
    requireTherapistApproval: false,
    autoApproveWhenTherapistSolo: true,
    severity: 'INFO',
    cooldownMoves: 2,
    cooldownMinutes: 10,
    thresholds: {
      preStartRollCount: 4,
    },
    metadata: {
      titleTemplate: 'Resistência inicial percebida',
      messageTemplate:
        'Foram {{rollsUntilStart}} tentativas sem iniciar a jornada. Esse momento pode sinalizar proteção, hesitação ou necessidade de segurança antes de avançar.',
      reflectionQuestion:
        'O que precisa estar presente para eu me sentir seguro(a) para dar o próximo passo?',
      microAction:
        'Nomeie uma pequena condição de segurança interna que você pode ativar agora.',
    },
  },
  {
    triggerId: 'INACTIVITY_REENGAGE_AI',
    title: 'Reengajar após pausa longa',
    description:
      'Gatilho com IA para retomada quando há intervalo grande sem rolagem.',
    enabled: true,
    useAi: true,
    sensitive: true,
    requireTherapistApproval: true,
    autoApproveWhenTherapistSolo: true,
    severity: 'ATTENTION',
    cooldownMoves: 2,
    cooldownMinutes: 20,
    thresholds: {
      inactivityMinutes: 8,
    },
    prompts: [
      {
        locale: 'pt-BR',
        name: 'Retomada após pausa',
        systemPrompt:
          'Você é assistente terapêutico do Maha Lilah. Gere intervenção breve, prática e acolhedora. Evite diagnóstico.',
        userPromptTemplate:
          'Contexto do jogador (JSON):\n{{contextJson}}\n\nHouve uma pausa de {{inactivityMinutes}} minutos sem rolagem. Gere uma intervenção para retomada no formato JSON puro:\n{"title":"...","message":"...","reflectionQuestion":"...","microAction":"..."}\n\nRegras:\n- Português claro.\n- Mensagem curta e objetiva (máximo 90 palavras).\n- Pergunta reflexiva única.\n- Microação prática de 1 passo.',
      },
    ],
  },
  {
    triggerId: 'HOUSE_REPEAT_AI',
    title: 'Ampliação com IA para repetição de casa',
    description:
      'Gatilho com IA para aprofundar significado de repetição de casa.',
    enabled: true,
    useAi: true,
    sensitive: false,
    requireTherapistApproval: false,
    autoApproveWhenTherapistSolo: true,
    severity: 'INFO',
    cooldownMoves: 3,
    cooldownMinutes: 15,
    thresholds: {
      houseRepeatCount: 4,
      repeatedHouseWindowMoves: 12,
    },
    prompts: [
      {
        locale: 'pt-BR',
        name: 'Leitura de repetição',
        systemPrompt:
          'Você é assistente terapêutico do Maha Lilah. Produza intervenção curta, sem exageros e com linguagem simples.',
        userPromptTemplate:
          'Contexto do jogador (JSON):\n{{contextJson}}\n\nA casa {{houseNumber}} repetiu {{repeatCount}} vezes nas últimas {{windowMoves}} jogadas.\nCrie uma intervenção terapêutica no formato JSON puro:\n{"title":"...","message":"...","reflectionQuestion":"...","microAction":"..."}\n\nConecte a resposta ao simbolismo da casa e ao caminho já percorrido.',
      },
    ],
  },
]

export async function seedMahaLilahInterventions(prisma: PrismaClient) {
  for (const config of MAHALILAH_INTERVENTION_SEED_DATA) {
    const persistedConfig = await prisma.mahaLilahInterventionConfig.upsert({
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
      const existingPrompt = await prisma.mahaLilahInterventionPrompt.findFirst({
        where: {
          configId: persistedConfig.id,
          locale: prompt.locale,
          name: prompt.name,
        },
        select: { id: true },
      })
      if (existingPrompt) continue

      await prisma.mahaLilahInterventionPrompt.create({
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
