import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { analyticsService } from '@/lib/analytics'
import { z } from 'zod'

// Schema para validação de métricas
const metricSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  value: z.number(),
  unit: z.string().optional(),
  dimensions: z.record(z.any()).optional(),
  sessionId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
})

// Schema para validação de eventos
const eventSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  action: z.string().min(1),
  label: z.string().optional(),
  value: z.number().optional(),
  sessionId: z.string().optional(),
  page: z.string().optional(),
  properties: z.record(z.any()).optional(),
})

// GET /api/analytics - Obter estatísticas do dashboard
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const category = searchParams.get('category')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const groupBy = searchParams.get('groupBy') as 'hour' | 'day' | 'week' | 'month'

    switch (type) {
      case 'stats':
        const stats = await analyticsService.getDashboardStats(
          session.user.role === 'ADMIN' ? undefined : session.user.id
        )
        return NextResponse.json(stats)

      case 'metrics':
        const metrics = await analyticsService.getMetrics({
          category: category || undefined,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          userId: session.user.role === 'ADMIN' ? undefined : session.user.id,
          groupBy: groupBy || 'day',
        })
        return NextResponse.json(metrics)

      case 'events':
        const events = await analyticsService.getEvents({
          category: category || undefined,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          userId: session.user.role === 'ADMIN' ? undefined : session.user.id,
          limit: 100,
        })
        return NextResponse.json(events)

      default:
        return NextResponse.json({ error: 'Tipo de consulta inválido' }, { status: 400 })
    }
  } catch (error) {
    console.error('Erro ao obter analytics:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/analytics - Registrar métrica ou evento
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const body = await request.json()
    const { type, data } = body

    // Obter informações da requisição
    const userAgent = request.headers.get('user-agent') || undefined
    const referer = request.headers.get('referer') || undefined
    const forwarded = request.headers.get('x-forwarded-for')
    const ipAddress = forwarded ? forwarded.split(',')[0] : request.ip || undefined

    if (type === 'metric') {
      const validatedData = metricSchema.parse(data)
      await analyticsService.recordMetric({
        ...validatedData,
        userId: session?.user?.id,
      })
    } else if (type === 'event') {
      const validatedData = eventSchema.parse(data)
      await analyticsService.recordEvent({
        ...validatedData,
        userId: session?.user?.id,
        ipAddress,
        userAgent,
        referrer: referer,
      })
    } else {
      return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Erro ao registrar analytics:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}