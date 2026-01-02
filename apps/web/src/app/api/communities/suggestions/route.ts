import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import notificationService from '@/lib/notifications/notification-service'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const title = String(body.title || '').trim()
    const description = String(body.description || '').trim()

    if (!title || !description) {
      return NextResponse.json({ error: 'Título e descrição são obrigatórios' }, { status: 400 })
    }

    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true }
    })

    await Promise.all(
      admins.map((admin) =>
        notificationService.createNotification({
          userId: admin.id,
          type: 'SYSTEM_ANNOUNCEMENT' as any,
          title: 'Nova sugestão de comunidade',
          message: `${title} — ${description}`,
          data: {
            title,
            description,
            suggestedBy: {
              id: session.user.id,
              name: session.user.name,
              email: session.user.email
            }
          },
          priority: 'MEDIUM'
        })
      )
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Erro ao enviar sugestão de comunidade:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
