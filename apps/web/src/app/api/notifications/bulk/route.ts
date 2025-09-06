import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { z } from 'zod'

// Schema para operações em lote
const BulkOperationSchema = z.object({
  action: z.enum(['mark_all_read', 'delete_all', 'mark_read', 'delete']),
  notificationIds: z.array(z.string()).optional() // Para operações específicas
})

// POST /api/notifications/bulk - Operações em lote
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const data = BulkOperationSchema.parse(body)

    let result: any = {}

    switch (data.action) {
      case 'mark_all_read':
        // Marcar todas as notificações não lidas como lidas
        result = await prisma.notification.updateMany({
          where: {
            userId: session.user.id,
            status: 'pending'
          },
          data: {
            status: 'sent',
            sentAt: new Date()
          }
        })
        
        return NextResponse.json({
          message: `${result.count} notificações marcadas como lidas`,
          count: result.count
        })

      case 'delete_all':
        // Excluir todas as notificações do usuário
        result = await prisma.notification.deleteMany({
          where: {
            userId: session.user.id
          }
        })
        
        return NextResponse.json({
          message: `${result.count} notificações excluídas`,
          count: result.count
        })

      case 'mark_read':
        // Marcar notificações específicas como lidas
        if (!data.notificationIds || data.notificationIds.length === 0) {
          return NextResponse.json(
            { error: 'IDs das notificações são obrigatórios' },
            { status: 400 }
          )
        }

        result = await prisma.notification.updateMany({
          where: {
            id: { in: data.notificationIds },
            userId: session.user.id,
            status: 'pending'
          },
          data: {
            status: 'sent',
            sentAt: new Date()
          }
        })
        
        return NextResponse.json({
          message: `${result.count} notificações marcadas como lidas`,
          count: result.count
        })

      case 'delete':
        // Excluir notificações específicas
        if (!data.notificationIds || data.notificationIds.length === 0) {
          return NextResponse.json(
            { error: 'IDs das notificações são obrigatórios' },
            { status: 400 }
          )
        }

        result = await prisma.notification.deleteMany({
          where: {
            id: { in: data.notificationIds },
            userId: session.user.id
          }
        })
        
        return NextResponse.json({
          message: `${result.count} notificações excluídas`,
          count: result.count
        })

      default:
        return NextResponse.json(
          { error: 'Ação não suportada' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Erro na operação em lote:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}