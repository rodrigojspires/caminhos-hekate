#!/usr/bin/env tsx

/**
 * Script para inicializar o processador de lembretes em background
 * Pode ser executado como um processo separado ou integrado à aplicação
 */

import { getReminderProcessor } from '../src/lib/background/reminder-processor'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Configuração do processador baseada em variáveis de ambiente
const config = {
  batchSize: parseInt(process.env.REMINDER_BATCH_SIZE || '50'),
  intervalMs: parseInt(process.env.REMINDER_INTERVAL_MS || '60000'), // 1 minuto
  maxRetries: parseInt(process.env.REMINDER_MAX_RETRIES || '3'),
  lookAheadDays: parseInt(process.env.REMINDER_LOOKAHEAD_DAYS || '30')
}

async function main() {
  console.log('🚀 Iniciando processador de lembretes...')
  console.log('📋 Configuração:', config)

  try {
    // Verificar conexão com o banco
    await prisma.$connect()
    console.log('✅ Conectado ao banco de dados')

    // Inicializar processador
    const processor = getReminderProcessor(config)
    
    // Configurar handlers de sinal para graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n🛑 Recebido sinal ${signal}, iniciando shutdown graceful...`)
      
      try {
        processor.stop()
        await prisma.$disconnect()
        console.log('✅ Shutdown concluído com sucesso')
        process.exit(0)
      } catch (error) {
        console.error('❌ Erro durante shutdown:', error)
        process.exit(1)
      }
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT', () => shutdown('SIGINT'))
    process.on('SIGUSR2', () => shutdown('SIGUSR2')) // Para nodemon

    // Iniciar processador
    processor.start()
    
    console.log('✅ Processador de lembretes iniciado com sucesso')
    console.log('📊 Para monitorar, acesse: /admin/reminder-processor')
    console.log('🔄 Pressione Ctrl+C para parar')

    // Manter o processo vivo
    const keepAlive = () => {
      setTimeout(() => {
        if (processor.getStats().isRunning) {
          keepAlive()
        }
      }, 5000)
    }
    
    keepAlive()

  } catch (error) {
    console.error('❌ Erro ao inicializar processador:', error)
    process.exit(1)
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Erro fatal:', error)
    process.exit(1)
  })
}

export { main as startReminderProcessor }