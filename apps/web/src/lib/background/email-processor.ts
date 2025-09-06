import { prisma } from '@hekate/database'
import { emailService } from '@/lib/email'

// Processa envios agendados/pendentes em loop simples
export async function runEmailProcessor(intervalMs = 5000) {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const now = new Date()
      const queued = await prisma.emailSend.findMany({
        where: {
          OR: [
            { status: 'QUEUED' as any, scheduledFor: { lte: now } },
            { status: 'PENDING' as any, scheduledFor: null }
          ]
        },
        orderBy: { createdAt: 'asc' },
        take: 10
      })
      for (const item of queued) {
        try {
          await (emailService as any).processEmailSend(item.id)
        } catch (e) {
          console.error('Erro ao processar email:', item.id, e)
        }
      }
    } catch (error) {
      console.error('Loop de processamento de email falhou:', error)
    }
    await new Promise(res => setTimeout(res, intervalMs))
  }
}

// Execução direta (node dist/...)
if (require.main === module) {
  runEmailProcessor().catch(err => {
    console.error('Email processor fatal:', err)
    process.exit(1)
  })
}

