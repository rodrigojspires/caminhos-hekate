import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getReminderProcessor } from '@/lib/background/reminder-processor'
import { z } from 'zod'

// Schema para configuração do processador
const processorConfigSchema = z.object({
  batchSize: z.number().min(1).max(200).optional(),
  intervalMs: z.number().min(10000).max(300000).optional(), // 10s a 5min
  maxRetries: z.number().min(1).max(10).optional(),
  lookAheadDays: z.number().min(1).max(90).optional()
})

// Schema para ações do processador
const processorActionSchema = z.object({
  action: z.enum(['start', 'stop', 'restart', 'process_now'])
})

// GET - Obter status e estatísticas do processador
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Verificar se o usuário é admin (você pode ajustar essa lógica)
    const isAdmin = session.user.email?.includes('admin') || 
                   process.env.ADMIN_EMAILS?.split(',')?.includes(session.user.email || '')
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem acessar.' },
        { status: 403 }
      )
    }

    const processor = getReminderProcessor()
    const stats = processor.getStats()

    return NextResponse.json({
      status: 'success',
      data: {
        ...stats,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
        environment: process.env.NODE_ENV
      }
    })
  } catch (error) {
    console.error('Erro ao obter status do processador:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Controlar o processador (start, stop, restart, process_now)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Verificar se o usuário é admin
    const isAdmin = session.user.email?.includes('admin') || 
                   process.env.ADMIN_EMAILS?.split(',')?.includes(session.user.email || '')
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem controlar o processador.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action } = processorActionSchema.parse(body)

    const processor = getReminderProcessor()
    let result: any = {}

    switch (action) {
      case 'start':
        processor.start()
        result = { message: 'Processador iniciado' }
        break

      case 'stop':
        processor.stop()
        result = { message: 'Processador parado' }
        break

      case 'restart':
        processor.stop()
        // Aguardar um pouco antes de reiniciar
        await new Promise(resolve => setTimeout(resolve, 1000))
        processor.start()
        result = { message: 'Processador reiniciado' }
        break

      case 'process_now':
        // Executar processamento imediato usando API pública
        const onDemand = await processor.processNow()
        result = { 
          message: 'Processamento manual executado.',
          ...onDemand
        }
        break

      default:
        return NextResponse.json(
          { error: 'Ação inválida' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      status: 'success',
      data: {
        ...result,
        stats: processor.getStats()
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Erro ao controlar processador:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar configuração do processador
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Verificar se o usuário é admin
    const isAdmin = session.user.email?.includes('admin') || 
                   process.env.ADMIN_EMAILS?.split(',')?.includes(session.user.email || '')
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem configurar o processador.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const config = processorConfigSchema.parse(body)

    // Para atualizar a configuração, precisamos parar e reiniciar com nova config
    const currentProcessor = getReminderProcessor()
    const wasRunning = currentProcessor.getStats().isRunning

    if (wasRunning) {
      currentProcessor.stop()
    }

    // Atualizar configuração na instância existente
    currentProcessor.updateConfig(config)
    
    if (wasRunning) {
      currentProcessor.start()
    }

    return NextResponse.json({
      status: 'success',
      data: {
        message: 'Configuração atualizada',
        config,
        stats: currentProcessor.getStats()
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Configuração inválida', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Erro ao atualizar configuração do processador:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}