import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma, MahaLilahParticipantRole } from '@hekate/database'

interface RouteParams {
  params: { roomId: string; participantId: string }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const room = await prisma.mahaLilahRoom.findUnique({
      where: { id: params.roomId },
      select: { id: true, createdByUserId: true }
    })

    if (!room) {
      return NextResponse.json({ error: 'Sala não encontrada' }, { status: 404 })
    }

    if (room.createdByUserId !== session.user.id) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const participant = await prisma.mahaLilahParticipant.findUnique({
      where: { id: params.participantId }
    })

    if (!participant || participant.roomId !== room.id) {
      return NextResponse.json({ error: 'Participante não encontrado' }, { status: 404 })
    }

    if (participant.role === MahaLilahParticipantRole.THERAPIST) {
      return NextResponse.json({ error: 'Não é possível remover o terapeuta' }, { status: 400 })
    }

    const moveCount = await prisma.mahaLilahMove.count({
      where: { participantId: participant.id }
    })

    if (moveCount > 0) {
      return NextResponse.json({
        error: 'Não é possível remover após o início da sessão'
      }, { status: 400 })
    }

    await prisma.mahaLilahParticipant.delete({
      where: { id: participant.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao remover participante Maha Lilah:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
