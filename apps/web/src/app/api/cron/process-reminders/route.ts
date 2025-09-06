import { NextRequest, NextResponse } from 'next/server'
import { notificationService } from '@/lib/services/notificationService'
import { prisma } from '@hekate/database'
import { ReminderStatus } from '@prisma/client'

// POST /api/cron/process-reminders - Processar lembretes agendados
export async function POST(request: NextRequest) {
  try {
    // Verificar se a requisição tem autorização (para segurança do cron job)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    console.log('Iniciando processamento de lembretes agendados...')
    
    // Processar lembretes pendentes
    await notificationService.processScheduledReminders()
    
    console.log('Processamento de lembretes concluído')
    
    return NextResponse.json({
      success: true,
      message: 'Lembretes processados com sucesso',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Erro ao processar lembretes:', error)
    
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

// GET /api/cron/process-reminders - Status do processador de lembretes
export async function GET() {
  try {
    // Buscar estatísticas de lembretes
    const stats = await prisma.eventReminder.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    })
    
    const scheduledCount = await prisma.eventReminder.count({
      where: {
        status: ReminderStatus.PENDING,
        triggerTime: {
          lte: new Date()
        }
      }
    })
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      statistics: {
        byStatus: stats.reduce((acc, stat) => {
          acc[stat.status] = stat._count.id
          return acc
        }, {} as Record<string, number>),
        pendingToProcess: scheduledCount
      }
    })
  } catch (error) {
    console.error('Erro ao obter status:', error)
    
    return NextResponse.json(
      { 
        status: 'error',
        error: 'Erro interno do servidor',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}