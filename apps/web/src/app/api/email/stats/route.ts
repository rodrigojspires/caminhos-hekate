import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { emailService } from '@/lib/email'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Schema para filtros de estatísticas
const StatsFiltersSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  templateId: z.string().optional(),
  campaignId: z.string().optional(),
  status: z.enum(['PENDING', 'SENT', 'DELIVERED', 'BOUNCED', 'FAILED']).optional(),
  groupBy: z.enum(['day', 'week', 'month']).default('day')
})

// GET /api/email/stats - Obter estatísticas de email
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar permissões
    if (!['ADMIN', 'EDITOR', 'VIEWER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())
    const validatedParams = StatsFiltersSchema.parse(params)

    // Converter datas
    const filters = {
      ...validatedParams,
      startDate: validatedParams.startDate ? new Date(validatedParams.startDate) : undefined,
      endDate: validatedParams.endDate ? new Date(validatedParams.endDate) : undefined
    }

    const stats = await emailService.getEmailStats(filters)

    return NextResponse.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Parâmetros inválidos',
        details: error.errors
      }, { status: 400 })
    }
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
}