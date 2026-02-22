import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@hekate/database'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const SeveritySchema = z.enum(['INFO', 'ATTENTION', 'CRITICAL'])

const ThresholdsSchema = z.object({
  houseRepeatCount: z.number().int().min(0).max(999).nullable().optional(),
  repeatedHouseWindowMoves: z.number().int().min(0).max(999).nullable().optional(),
  snakeStreakCount: z.number().int().min(0).max(999).nullable().optional(),
  preStartRollCount: z.number().int().min(0).max(999).nullable().optional(),
  inactivityMinutes: z.number().int().min(0).max(999).nullable().optional(),
  inactivitySeconds: z.number().int().min(0).max(9999).nullable().optional(),
  shadowStreakCount: z.number().int().min(0).max(999).nullable().optional(),
  snakeWindowMoves: z.number().int().min(0).max(999).nullable().optional(),
  noTherapyWindowMoves: z.number().int().min(0).max(999).nullable().optional(),
  strongMoveMinDelta: z.number().int().min(0).max(999).nullable().optional(),
  intensityMin: z.number().int().min(0).max(999).nullable().optional(),
  intensityRepeatCount: z.number().int().min(0).max(999).nullable().optional(),
  intensityWindowEntries: z.number().int().min(0).max(999).nullable().optional(),
  fatigueMoveCount: z.number().int().min(0).max(9999).nullable().optional(),
  therapistSilenceMoves: z.number().int().min(0).max(9999).nullable().optional(),
})

const PromptSchema = z.object({
  id: z.string().optional(),
  locale: z.string().trim().min(2).max(20),
  name: z.string().trim().min(2).max(120),
  isActive: z.boolean(),
  systemPrompt: z.string().trim().max(6000).nullable().optional(),
  userPromptTemplate: z.string().trim().min(1).max(24000),
})

const InterventionConfigSchema = z.object({
  id: z.string().optional(),
  triggerId: z
    .string()
    .trim()
    .min(3)
    .max(120)
    .regex(/^[A-Za-z0-9_]+$/, 'Use apenas letras, números e underscore'),
  title: z.string().trim().min(2).max(140),
  description: z.string().trim().max(700).nullable().optional(),
  enabled: z.boolean(),
  useAi: z.boolean(),
  sensitive: z.boolean(),
  requireTherapistApproval: z.boolean(),
  autoApproveWhenTherapistSolo: z.boolean(),
  severity: SeveritySchema,
  cooldownMoves: z.number().int().min(0).max(999),
  cooldownMinutes: z.number().int().min(0).max(9999),
  thresholds: ThresholdsSchema.optional().default({}),
  metadata: z.record(z.unknown()).nullable().optional(),
  prompts: z.array(PromptSchema).max(20).default([]),
})

const SaveInterventionsSchema = z.object({
  configs: z.array(InterventionConfigSchema).max(80),
})

function ensureAdmin(session: any) {
  return Boolean(session?.user && session.user.role === 'ADMIN')
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

function asNonNegativeInt(value: unknown) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return Math.floor(parsed)
}

function normalizeThresholds(value: unknown) {
  const raw = asRecord(value)
  const normalized: Record<string, number> = {}

  const keys = [
    'houseRepeatCount',
    'repeatedHouseWindowMoves',
    'snakeStreakCount',
    'preStartRollCount',
    'inactivityMinutes',
    'inactivitySeconds',
    'shadowStreakCount',
    'snakeWindowMoves',
    'noTherapyWindowMoves',
    'strongMoveMinDelta',
    'intensityMin',
    'intensityRepeatCount',
    'intensityWindowEntries',
    'fatigueMoveCount',
    'therapistSilenceMoves',
  ] as const

  keys.forEach((key) => {
    const parsed = asNonNegativeInt(raw[key])
    if (parsed != null) normalized[key] = parsed
  })

  return normalized
}

function normalizeMetadata(value: unknown) {
  return asRecord(value)
}

function validateConfigs(configs: z.infer<typeof InterventionConfigSchema>[]) {
  const triggerIds = new Set<string>()
  for (const config of configs) {
    if (triggerIds.has(config.triggerId)) {
      throw new Error(`Trigger duplicado no payload: ${config.triggerId}`)
    }
    triggerIds.add(config.triggerId)

    if (config.useAi) {
      const activePrompts = config.prompts.filter((prompt) => prompt.isActive)
      if (activePrompts.length === 0) {
        throw new Error(
          `O gatilho ${config.triggerId} usa IA e precisa de ao menos um prompt ativo.`,
        )
      }
    }
  }
}

async function fetchInterventionCatalog() {
  const configs = await prisma.mahaLilahInterventionConfig.findMany({
    include: {
      prompts: {
        orderBy: [{ locale: 'asc' }, { updatedAt: 'desc' }, { name: 'asc' }],
      },
    },
    orderBy: [{ enabled: 'desc' }, { createdAt: 'asc' }],
  })

  return {
    configs: configs.map((config) => ({
      id: config.id,
      triggerId: config.triggerId,
      title: config.title,
      description: config.description,
      enabled: config.enabled,
      useAi: config.useAi,
      sensitive: config.sensitive,
      requireTherapistApproval: config.requireTherapistApproval,
      autoApproveWhenTherapistSolo: config.autoApproveWhenTherapistSolo,
      severity: config.severity,
      cooldownMoves: Number(config.cooldownMoves),
      cooldownMinutes: Number(config.cooldownMinutes),
      thresholds: normalizeThresholds(config.thresholds),
      metadata: normalizeMetadata(config.metadata),
      prompts: config.prompts.map((prompt) => ({
        id: prompt.id,
        locale: prompt.locale,
        name: prompt.name,
        isActive: prompt.isActive,
        systemPrompt: prompt.systemPrompt,
        userPromptTemplate: prompt.userPromptTemplate,
      })),
    })),
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!ensureAdmin(session)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const payload = await fetchInterventionCatalog()
    return NextResponse.json(payload)
  } catch (error) {
    console.error('Erro ao carregar catálogo de intervenções Maha Lilah (admin):', error)
    return NextResponse.json(
      { error: 'Erro ao carregar catálogo de intervenções.' },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!ensureAdmin(session)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = SaveInterventionsSchema.parse(body)
    validateConfigs(parsed.configs)

    await prisma.$transaction(async (tx) => {
      const keepConfigIds = new Set<string>()

      for (const config of parsed.configs) {
        let persistedConfigId: string | null = null

        if (config.id) {
          const existingById = await tx.mahaLilahInterventionConfig.findUnique({
            where: { id: config.id },
            select: { id: true },
          })

          if (existingById) {
            const updated = await tx.mahaLilahInterventionConfig.update({
              where: { id: config.id },
              data: {
                triggerId: config.triggerId,
                title: config.title,
                description: config.description || null,
                enabled: config.enabled,
                useAi: config.useAi,
                sensitive: config.sensitive,
                requireTherapistApproval: config.requireTherapistApproval,
                autoApproveWhenTherapistSolo: config.autoApproveWhenTherapistSolo,
                severity: config.severity as any,
                cooldownMoves: config.cooldownMoves,
                cooldownMinutes: config.cooldownMinutes,
                thresholds: normalizeThresholds(config.thresholds) as any,
                metadata: normalizeMetadata(config.metadata) as any,
              },
              select: { id: true },
            })
            persistedConfigId = updated.id
          }
        }

        if (!persistedConfigId) {
          const upserted = await tx.mahaLilahInterventionConfig.upsert({
            where: { triggerId: config.triggerId },
            create: {
              triggerId: config.triggerId,
              title: config.title,
              description: config.description || null,
              enabled: config.enabled,
              useAi: config.useAi,
              sensitive: config.sensitive,
              requireTherapistApproval: config.requireTherapistApproval,
              autoApproveWhenTherapistSolo: config.autoApproveWhenTherapistSolo,
              severity: config.severity as any,
              cooldownMoves: config.cooldownMoves,
              cooldownMinutes: config.cooldownMinutes,
              thresholds: normalizeThresholds(config.thresholds) as any,
              metadata: normalizeMetadata(config.metadata) as any,
            },
            update: {
              title: config.title,
              description: config.description || null,
              enabled: config.enabled,
              useAi: config.useAi,
              sensitive: config.sensitive,
              requireTherapistApproval: config.requireTherapistApproval,
              autoApproveWhenTherapistSolo: config.autoApproveWhenTherapistSolo,
              severity: config.severity as any,
              cooldownMoves: config.cooldownMoves,
              cooldownMinutes: config.cooldownMinutes,
              thresholds: normalizeThresholds(config.thresholds) as any,
              metadata: normalizeMetadata(config.metadata) as any,
            },
            select: { id: true },
          })
          persistedConfigId = upserted.id
        }

        keepConfigIds.add(persistedConfigId)

        const keepPromptIds = new Set<string>()

        for (const prompt of config.prompts) {
          let savedPromptId: string | null = null

          if (prompt.id) {
            const existingPrompt = await tx.mahaLilahInterventionPrompt.findUnique({
              where: { id: prompt.id },
              select: { id: true, configId: true },
            })

            if (existingPrompt && existingPrompt.configId === persistedConfigId) {
              const updatedPrompt = await tx.mahaLilahInterventionPrompt.update({
                where: { id: prompt.id },
                data: {
                  locale: prompt.locale,
                  name: prompt.name,
                  isActive: prompt.isActive,
                  systemPrompt: prompt.systemPrompt || null,
                  userPromptTemplate: prompt.userPromptTemplate,
                },
                select: { id: true },
              })
              savedPromptId = updatedPrompt.id
            }
          }

          if (!savedPromptId) {
            const existingByKey = await tx.mahaLilahInterventionPrompt.findFirst({
              where: {
                configId: persistedConfigId,
                locale: prompt.locale,
                name: prompt.name,
              },
              select: { id: true },
            })

            if (existingByKey) {
              const updatedPrompt = await tx.mahaLilahInterventionPrompt.update({
                where: { id: existingByKey.id },
                data: {
                  isActive: prompt.isActive,
                  systemPrompt: prompt.systemPrompt || null,
                  userPromptTemplate: prompt.userPromptTemplate,
                },
                select: { id: true },
              })
              savedPromptId = updatedPrompt.id
            } else {
              const createdPrompt = await tx.mahaLilahInterventionPrompt.create({
                data: {
                  configId: persistedConfigId,
                  locale: prompt.locale,
                  name: prompt.name,
                  isActive: prompt.isActive,
                  systemPrompt: prompt.systemPrompt || null,
                  userPromptTemplate: prompt.userPromptTemplate,
                },
                select: { id: true },
              })
              savedPromptId = createdPrompt.id
            }
          }

          if (!savedPromptId) {
            throw new Error(
              `Falha ao persistir prompt "${prompt.name}" do gatilho ${config.triggerId}.`,
            )
          }

          keepPromptIds.add(savedPromptId)
        }

        if (keepPromptIds.size === 0) {
          await tx.mahaLilahInterventionPrompt.deleteMany({
            where: { configId: persistedConfigId },
          })
        } else {
          await tx.mahaLilahInterventionPrompt.deleteMany({
            where: {
              configId: persistedConfigId,
              id: {
                notIn: Array.from(keepPromptIds),
              },
            },
          })
        }
      }

      if (keepConfigIds.size === 0) {
        await tx.mahaLilahInterventionConfig.deleteMany()
      } else {
        await tx.mahaLilahInterventionConfig.deleteMany({
          where: {
            id: {
              notIn: Array.from(keepConfigIds),
            },
          },
        })
      }
    })

    const payload = await fetchInterventionCatalog()
    return NextResponse.json(payload)
  } catch (error) {
    console.error('Erro ao salvar catálogo de intervenções Maha Lilah (admin):', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 },
      )
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Erro ao salvar catálogo de intervenções.' },
      { status: 500 },
    )
  }
}
