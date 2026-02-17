import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma, MahaLilahParticipantRole } from '@hekate/database'
import { z } from 'zod'

interface RouteParams {
  params: { roomId: string; participantId: string }
}

const UpdateParticipantSchema = z
  .object({
    therapistSummary: z.string().max(8000).nullable().optional()
  })
  .refine((payload) => payload.therapistSummary !== undefined, {
    message: 'Nada para atualizar.'
  })

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const payload = await request.json()
    const data = UpdateParticipantSchema.parse(payload)

    const room = await prisma.mahaLilahRoom.findUnique({
      where: { id: params.roomId },
      select: { id: true }
    })

    if (!room) {
      return NextResponse.json({ error: 'Sala não encontrada' }, { status: 404 })
    }

    const requesterParticipant = await prisma.mahaLilahParticipant.findFirst({
      where: {
        roomId: room.id,
        userId: session.user.id
      },
      select: {
        role: true
      }
    })

    if (requesterParticipant?.role !== MahaLilahParticipantRole.THERAPIST) {
      return NextResponse.json(
        { error: 'Apenas terapeutas da sala podem editar a síntese.' },
        { status: 403 }
      )
    }

    const participant = await prisma.mahaLilahParticipant.findUnique({
      where: { id: params.participantId },
      select: { id: true, roomId: true }
    })

    if (!participant || participant.roomId !== room.id) {
      return NextResponse.json({ error: 'Participante não encontrado' }, { status: 404 })
    }

    const normalizedSummary = data.therapistSummary?.trim()
      ? data.therapistSummary.trim()
      : null

    const updatedParticipant = await prisma.mahaLilahParticipant.update({
      where: { id: participant.id },
      data: {
        therapistSummary: normalizedSummary
      },
      select: {
        id: true,
        therapistSummary: true
      }
    })

    return NextResponse.json({ participant: updatedParticipant })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
    }
    console.error('Erro ao atualizar participante Maha Lilah:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
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
