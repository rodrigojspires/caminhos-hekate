import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { analyticsService } from '@/lib/analytics'
import { z } from 'zod'

// Schema para validação de dashboard
const dashboardSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  config: z.object({
    widgets: z.array(z.object({
      id: z.string(),
      type: z.enum(['metric', 'chart', 'table']),
      title: z.string(),
      query: z.string(),
      config: z.record(z.any()),
    })),
    layout: z.array(z.object({
      i: z.string(),
      x: z.number(),
      y: z.number(),
      w: z.number(),
      h: z.number(),
    })),
  }),
  isDefault: z.boolean().optional().default(false),
})

// GET /api/analytics/dashboards - Obter dashboards do usuário
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const dashboards = await analyticsService.getUserDashboards(session.user.id)
    return NextResponse.json(dashboards)
  } catch (error) {
    console.error('Erro ao obter dashboards:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/analytics/dashboards - Criar novo dashboard
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = dashboardSchema.parse(body)

    const dashboard = await analyticsService.createDashboard({
      userId: session.user.id,
      ...validatedData,
    })

    return NextResponse.json(dashboard, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Erro ao criar dashboard:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}