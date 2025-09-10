import { PrismaClient, ReminderStatus } from '@prisma/client'
import { RecurringEventsNotificationService } from '@/lib/notifications/recurring-events-notification-service'
import { RecurrenceEngine } from '@/lib/recurrence/engine'
import { broadcastNotification, sendNotificationToUser } from '@/lib/notification-stream'

const prisma = new PrismaClient()
const notificationService = new RecurringEventsNotificationService()
const recurrenceEngine = new RecurrenceEngine()

export interface ReminderProcessorConfig {
  batchSize: number
  intervalMs: number
  maxRetries: number
  lookAheadDays: number
}

const DEFAULT_CONFIG: ReminderProcessorConfig = {
  batchSize: 50,
  intervalMs: 60000, // 1 minuto
  maxRetries: 3,
  lookAheadDays: 30
}

export class ReminderProcessor {
  private config: ReminderProcessorConfig
  private isRunning = false
  private intervalId: NodeJS.Timeout | null = null
  private processingQueue = new Set<string>()

  constructor(config: Partial<ReminderProcessorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /** Atualiza a configuração do processador em runtime */
  updateConfig(config: Partial<ReminderProcessorConfig>) {
    const prevInterval = this.config.intervalMs
    this.config = { ...this.config, ...config }

    // Se o processador estiver rodando e o intervalo mudar, reiniciar o timer
    if (this.isRunning && config.intervalMs && config.intervalMs !== prevInterval) {
      if (this.intervalId) {
        clearInterval(this.intervalId)
      }
      this.intervalId = setInterval(() => {
        this.processReminders()
      }, this.config.intervalMs)
    }
  }

  /**
   * Inicia o processamento em background
   */
  start() {
    if (this.isRunning) {
      console.log('Reminder processor já está rodando')
      return
    }

    this.isRunning = true
    console.log('Iniciando reminder processor...')

    // Processar imediatamente
    this.processReminders()

    // Configurar intervalo
    this.intervalId = setInterval(() => {
      this.processReminders()
    }, this.config.intervalMs)

    console.log(`Reminder processor iniciado com intervalo de ${this.config.intervalMs}ms`)
  }

  /**
   * Para o processamento em background
   */
  stop() {
    if (!this.isRunning) {
      return
    }

    this.isRunning = false
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }

    console.log('Reminder processor parado')
  }

  /**
   * Executa um ciclo de processamento imediatamente, independente do estado isRunning
   */
  async processNow() {
    try {
      await this.generateRecurringInstances()
      await this.processPendingReminders()
      await this.cleanupExpiredReminders()
      return {
        processed: this.processingQueue.size,
        stats: this.getStats()
      }
    } catch (error) {
      console.error('Erro ao processar lembretes sob demanda:', error)
      throw error
    }
  }

  /**
   * Processa lembretes em loop quando em execução contínua
   */
  private async processReminders() {
    if (!this.isRunning) return

    try {
      console.log('Processando lembretes...')

      // 1. Gerar instâncias de eventos recorrentes
      await this.generateRecurringInstances()

      // 2. Processar lembretes pendentes
      await this.processPendingReminders()

      // 3. Limpar lembretes expirados
      await this.cleanupExpiredReminders()

      console.log('Processamento de lembretes concluído')
    } catch (error) {
      console.error('Erro no processamento de lembretes:', error)
    }
  }

  /**
   * Gera instâncias futuras de eventos recorrentes
   */
  private async generateRecurringInstances() {
    try {
      const lookAheadDate = new Date()
      lookAheadDate.setDate(lookAheadDate.getDate() + this.config.lookAheadDays)

      // Buscar séries recorrentes que precisam de novas instâncias
      const series = await prisma.recurringEvent.findMany({
        where: {
          isActive: true,
          OR: [
            { endDate: null },
            { endDate: { gte: new Date() } }
          ]
        },
        include: {
          parentEvent: true
        }
      })

      for (const serie of series) {
        try {
          const generateFrom = new Date(serie.parentEvent.startDate)

          // Gerar instâncias até a data de look-ahead
          const recurrenceRule = serie.recurrenceRule as any
          if (!recurrenceRule) continue

          // Simular geração de instâncias (implementação simplificada)
          const instances = []
          let currentDate = new Date(generateFrom)
          let count = 0
          
          while (currentDate <= lookAheadDate && count < 10) {
            instances.push({
              startDate: new Date(currentDate),
              endDate: new Date(currentDate.getTime() + (serie.parentEvent.endDate?.getTime() || currentDate.getTime()) - serie.parentEvent.startDate.getTime())
            })
            
            // Incrementar data baseado na regra (simplificado)
            currentDate.setDate(currentDate.getDate() + 7) // Assumir semanal
            count++
          }

          if (instances.length > 0) {
            console.log(`Geradas ${instances.length} instâncias para série ${serie.id}`)
          }
        } catch (error) {
          console.error(`Erro ao gerar instâncias para série ${serie.id}:`, error)
        }
      }
    } catch (error) {
      console.error('Erro ao gerar instâncias recorrentes:', error)
    }
  }

  /**
   * Processa lembretes que devem ser enviados
   */
  private async processPendingReminders() {
    try {
      const now = new Date()
      const batchEndTime = new Date(now.getTime() + (5 * 60 * 1000)) // 5 minutos à frente

      // Buscar lembretes que devem ser enviados
      const reminders = await prisma.eventReminder.findMany({
        where: {
          // cleaned
          status: ReminderStatus.PENDING,
          triggerTime: {
            lte: batchEndTime
          },
          retryCount: {
            lt: this.config.maxRetries
          }
        },
        include: {
          event: true,
          user: true
        },
        take: this.config.batchSize,
        orderBy: {
          triggerTime: 'asc'
        }
      })

      console.log(`Processando ${reminders.length} lembretes`)

      for (const reminder of reminders) {
        // Evitar processamento duplicado
        if (this.processingQueue.has(reminder.id)) {
          continue
        }

        this.processingQueue.add(reminder.id)

        try {
          await this.processReminder(reminder)
        } catch (error) {
          console.error(`Erro ao processar lembrete ${reminder.id}:`, error)
          
          // Incrementar contador de tentativas
          await prisma.eventReminder.update({
            where: { id: reminder.id },
            data: {
              retryCount: { increment: 1 },
              lastError: error instanceof Error ? error.message : 'Erro desconhecido',
              status: reminder.retryCount + 1 >= this.config.maxRetries ? ReminderStatus.FAILED : ReminderStatus.PENDING
            }
          })
        } finally {
          this.processingQueue.delete(reminder.id)
        }
      }
    } catch (error) {
      console.error('Erro ao processar lembretes pendentes:', error)
    }
  }

  /**
   * Processa um lembrete individual
   */
  private async processReminder(reminder: any) {
    const now = new Date()
    
    // Verificar se ainda não é hora de enviar
    // if (reminder.reminderDate > now) { removed
    if (reminder.triggerTime > now) {
      return
    }

    try {
      // Criar notificação
      await notificationService.createEventReminderNotification(
        reminder.userId,
        reminder.event,
        // keep type
        reminder.type,
        // use triggerTime instead of reminderDate
        reminder.triggerTime
      )

      // Enviar notificação em tempo real para o usuário específico
      sendNotificationToUser(reminder.userId, {
        type: 'event_reminder',
        title: `Lembrete: ${reminder.event.title}`,
        message: `Seu evento "${reminder.event.title}" ${this.getTimeMessage(reminder.event.startDate)}`,
        priority: 'high',
        data: {
          eventId: reminder.eventId,
          reminderId: reminder.id,
          eventStartDate: reminder.event.startDate
        }
      })

      // Marcar como enviado
      await prisma.eventReminder.update({
        where: { id: reminder.id },
        data: {
          status: ReminderStatus.SENT,
          sentAt: now
        }
      })

      console.log(`Lembrete ${reminder.id} enviado com sucesso`)
    } catch (error) {
      console.error(`Erro ao enviar lembrete ${reminder.id}:`, error)
      throw error
    }
  }

  /**
   * Remove lembretes expirados
   */
  private async cleanupExpiredReminders() {
    try {
      const expiredDate = new Date()
      expiredDate.setDate(expiredDate.getDate() - 7) // Remover lembretes de mais de 7 dias

      const result = await prisma.eventReminder.deleteMany({
        where: {
          OR: [
            {
              status: ReminderStatus.SENT,
              sentAt: {
                lt: expiredDate
              }
            },
            {
              status: ReminderStatus.FAILED,
              updatedAt: {
                lt: expiredDate
              }
            }
          ]
        }
      })

      if (result.count > 0) {
        console.log(`Removidos ${result.count} lembretes expirados`)
      }
    } catch (error) {
      console.error('Erro ao limpar lembretes expirados:', error)
    }
  }

  /**
   * Gera mensagem de tempo para o lembrete
   */
  private getTimeMessage(eventDate: Date): string {
    const now = new Date()
    const diffMs = eventDate.getTime() - now.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMinutes < 0) {
      return 'já começou'
    } else if (diffMinutes < 60) {
      return `começa em ${diffMinutes} minutos`
    } else if (diffHours < 24) {
      return `começa em ${diffHours} horas`
    } else {
      return `começa em ${diffDays} dias`
    }
  }

  /**
   * Obtém estatísticas do processador
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      config: this.config,
      processingQueueSize: this.processingQueue.size
    }
  }
}

// Instância singleton
let processorInstance: ReminderProcessor | null = null

export function getReminderProcessor(config?: Partial<ReminderProcessorConfig>): ReminderProcessor {
  if (!processorInstance) {
    processorInstance = new ReminderProcessor(config)
  } else if (config && Object.keys(config).length > 0) {
    // Aplicar atualização de configuração se já existir instância
    processorInstance.updateConfig(config)
  }
  return processorInstance
}

// Auto-iniciar em produção
if (process.env.NODE_ENV === 'production' && process.env.AUTO_START_REMINDER_PROCESSOR === 'true') {
  const processor = getReminderProcessor()
  processor.start()
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('Recebido SIGTERM, parando reminder processor...')
    processor.stop()
  })
  
  process.on('SIGINT', () => {
    console.log('Recebido SIGINT, parando reminder processor...')
    processor.stop()
  })
}