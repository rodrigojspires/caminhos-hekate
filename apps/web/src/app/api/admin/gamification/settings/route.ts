import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { z } from 'zod'
import {
  GAMIFICATION_POINT_SETTINGS
} from '@/lib/gamification/point-settings'
import {
  ensureGamificationPointSettings,
  invalidateGamificationPointSettingsCache
} from '@/lib/gamification/point-settings.server'
import { SettingsCache } from '@/lib/cache'

export const dynamic = 'force-dynamic'

const UpdateSchema = z.object({
  settings: z.array(
    z.object({
      key: z.string().min(1),
      value: z.union([z.number(), z.string()])
    })
  ).min(1)
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    await ensureGamificationPointSettings()

    const settings = await prisma.systemSettings.findMany({
      where: { key: { in: GAMIFICATION_POINT_SETTINGS.map((item) => item.key) } }
    })

    const map = new Map(settings.map((setting) => [setting.key, setting.value]))

    const payload = GAMIFICATION_POINT_SETTINGS.map((item) => ({
      key: item.key,
      field: item.field,
      label: item.label,
      description: item.description,
      section: item.section,
      defaultValue: item.defaultValue,
      value: map.get(item.key) ?? item.defaultValue
    }))

    return NextResponse.json({ settings: payload })
  } catch (error) {
    console.error('Erro ao buscar configuracoes de gamificacao:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await request.json()
    const data = UpdateSchema.parse(body)

    const definitionMap = new Map(GAMIFICATION_POINT_SETTINGS.map((item) => [item.key, item]))

    for (const item of data.settings) {
      if (!definitionMap.has(item.key)) {
        return NextResponse.json({ error: `Chave invalida: ${item.key}` }, { status: 400 })
      }
    }

    const updates = data.settings.map((item) => {
      const definition = definitionMap.get(item.key)!
      const numericValue = typeof item.value === 'number' ? item.value : Number(item.value)
      const safeValue = Number.isFinite(numericValue) ? numericValue : definition.defaultValue

      return prisma.systemSettings.upsert({
        where: { key: item.key },
        update: {
          value: safeValue,
          name: definition.label,
          description: definition.description,
          type: 'NUMBER',
          category: 'GAMIFICATION',
          updatedAt: new Date()
        },
        create: {
          key: item.key,
          value: safeValue,
          type: 'NUMBER',
          category: 'GAMIFICATION',
          name: definition.label,
          description: definition.description,
          order: GAMIFICATION_POINT_SETTINGS.findIndex((entry) => entry.key === item.key)
        }
      })
    })

    await prisma.$transaction(updates)

    SettingsCache.invalidate()
    invalidateGamificationPointSettingsCache()

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Erro ao atualizar configuracoes de gamificacao:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados invalidos', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
