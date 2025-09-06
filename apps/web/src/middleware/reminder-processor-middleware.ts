import { NextRequest, NextResponse } from 'next/server'
import { getReminderProcessor } from '@/lib/background/reminder-processor'

// Flag para controlar se o processador já foi inicializado
let processorInitialized = false

/**
 * Middleware para inicializar automaticamente o processador de lembretes
 * Executa apenas uma vez quando a aplicação é iniciada
 */
export function initializeReminderProcessor() {
  if (processorInitialized) {
    return
  }

  // Verificar se deve auto-inicializar
  const autoStart = process.env.AUTO_START_REMINDER_PROCESSOR === 'true'
  const isProduction = process.env.NODE_ENV === 'production'
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  // Inicializar apenas em produção ou se explicitamente habilitado
  if (!autoStart && !isProduction) {
    console.log('🔄 Processador de lembretes não inicializado automaticamente')
    console.log('💡 Para habilitar, defina AUTO_START_REMINDER_PROCESSOR=true')
    return
  }

  try {
    console.log('🚀 Inicializando processador de lembretes...')
    
    const config = {
      batchSize: parseInt(process.env.REMINDER_BATCH_SIZE || '50'),
      intervalMs: parseInt(process.env.REMINDER_INTERVAL_MS || '60000'),
      maxRetries: parseInt(process.env.REMINDER_MAX_RETRIES || '3'),
      lookAheadDays: parseInt(process.env.REMINDER_LOOKAHEAD_DAYS || '30')
    }

    const processor = getReminderProcessor(config)
    processor.start()
    
    processorInitialized = true
    console.log('✅ Processador de lembretes iniciado automaticamente')
    
    // Configurar graceful shutdown
    const shutdown = () => {
      console.log('🛑 Parando processador de lembretes...')
      processor.stop()
      processorInitialized = false
    }

    process.on('SIGTERM', shutdown)
    process.on('SIGINT', shutdown)
    process.on('beforeExit', shutdown)
    
  } catch (error) {
    console.error('❌ Erro ao inicializar processador de lembretes:', error)
  }
}

/**
 * Middleware do Next.js para inicializar o processador
 */
export function reminderProcessorMiddleware(request: NextRequest) {
  // Inicializar processador na primeira requisição
  initializeReminderProcessor()
  
  // Continuar com a requisição normalmente
  return NextResponse.next()
}

/**
 * Hook para verificar status do processador
 */
export function getReminderProcessorStatus() {
  if (!processorInitialized) {
    return {
      initialized: false,
      running: false,
      message: 'Processador não inicializado'
    }
  }

  try {
    const processor = getReminderProcessor()
    const stats = processor.getStats()
    
    return {
      initialized: true,
      running: stats.isRunning,
      config: stats.config,
      processingQueueSize: stats.processingQueueSize
    }
  } catch (error) {
    return {
      initialized: true,
      running: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }
  }
}

/**
 * Função para forçar inicialização manual
 */
export function forceInitializeProcessor() {
  processorInitialized = false
  initializeReminderProcessor()
  return getReminderProcessorStatus()
}