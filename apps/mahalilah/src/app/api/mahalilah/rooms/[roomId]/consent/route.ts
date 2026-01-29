import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

interface RouteParams {
  params: { roomId: string }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const participant = await prisma.mahaLilahParticipant.findFirst({
      where: { roomId: params.roomId, userId: session.user.id }
    })

    if (!participant) {
      return NextResponse.json({ error: 'Participante não encontrado' }, { status: 404 })
    }

    const updated = await prisma.mahaLilahParticipant.update({
      where: { id: participant.id },
      data: { consentAcceptedAt: new Date() }
    })

    return NextResponse.json({ participant: updated })
  } catch (error) {
    console.error('Erro ao aceitar consentimento Maha Lilah:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
