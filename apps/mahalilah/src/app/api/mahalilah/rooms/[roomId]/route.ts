import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { z } from 'zod'

interface RouteParams {
  params: { roomId: string }
}

const UpdateRoomSchema = z
  .object({
    isVisibleToPlayers: z.boolean().optional(),
    therapistSummary: z.string().max(8000).nullable().optional()
  })
  .refine(
    (payload) =>
      payload.isVisibleToPlayers !== undefined ||
      payload.therapistSummary !== undefined,
    {
      message: 'Nada para atualizar.'
    }
  )

function decrementMahaRoomsUsed(rawMetadata: unknown) {
  if (!rawMetadata || typeof rawMetadata !== 'object') return null

  const metadata = rawMetadata as Record<string, any>
  const mahalilah = metadata.mahalilah
  if (!mahalilah || typeof mahalilah !== 'object') return null

  const roomsUsed = Number(mahalilah.roomsUsed || 0)
  if (!Number.isFinite(roomsUsed) || roomsUsed <= 0) return null

  return {
    ...metadata,
    mahalilah: {
      ...mahalilah,
      roomsUsed: roomsUsed - 1
    }
  }
}

function isMahaSubscriptionMetadata(rawMetadata: unknown, planType: string) {
  if (!rawMetadata || typeof rawMetadata !== 'object') return false
  const metadata = rawMetadata as Record<string, any>
  if (metadata.app !== 'mahalilah') return false
  if (!metadata.mahalilah || typeof metadata.mahalilah !== 'object') return false

  const metadataPlanType = metadata.mahalilah.planType
  if (typeof metadataPlanType === 'string') {
    return metadataPlanType === planType
  }

  return true
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const room = await prisma.mahaLilahRoom.findUnique({
      where: { id: params.roomId },
      select: {
        id: true,
        createdByUserId: true,
        planType: true,
        orderId: true
      }
    })

    if (!room) {
      return NextResponse.json({ error: 'Sala não encontrada' }, { status: 404 })
    }

    if (room.createdByUserId !== session.user.id) {
      return NextResponse.json({ error: 'Sem permissão para excluir esta sala' }, { status: 403 })
    }

    if (room.planType === 'SINGLE_SESSION') {
      return NextResponse.json(
        { error: 'Salas de sessão avulsa não podem ser excluídas.' },
        { status: 400 }
      )
    }

    const moveCount = await prisma.mahaLilahMove.count({
      where: { roomId: room.id }
    })

    if (moveCount > 0) {
      return NextResponse.json(
        { error: 'Só é possível excluir salas sem jogadas.' },
        { status: 400 }
      )
    }

    await prisma.$transaction(async (tx) => {
      await tx.mahaLilahRoom.delete({
        where: { id: room.id }
      })

      let roomsUsedReverted = false

      if (room.orderId) {
        const order = await tx.order.findUnique({
          where: { id: room.orderId },
          select: { id: true, metadata: true }
        })
        if (order) {
          const nextMetadata = decrementMahaRoomsUsed(order.metadata)
          if (nextMetadata) {
            await tx.order.update({
              where: { id: order.id },
              data: { metadata: nextMetadata }
            })
            roomsUsedReverted = true
          }
        }
      }

      if (!roomsUsedReverted) {
        const subscriptions = await tx.userSubscription.findMany({
          where: {
            userId: session.user.id,
            status: { in: ['ACTIVE', 'TRIALING'] }
          },
          orderBy: { createdAt: 'desc' },
          select: { id: true, metadata: true }
        })

        for (const subscription of subscriptions) {
          if (!isMahaSubscriptionMetadata(subscription.metadata, room.planType)) {
            continue
          }

          const nextMetadata = decrementMahaRoomsUsed(subscription.metadata)
          if (!nextMetadata) {
            continue
          }

          await tx.userSubscription.update({
            where: { id: subscription.id },
            data: { metadata: nextMetadata }
          })
          break
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao excluir sala Maha Lilah:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const payload = await request.json()
    const data = UpdateRoomSchema.parse(payload)

    const room = await prisma.mahaLilahRoom.findUnique({
      where: { id: params.roomId },
      select: { id: true, createdByUserId: true, status: true }
    })

    if (!room) {
      return NextResponse.json({ error: 'Sala não encontrada' }, { status: 404 })
    }

    if (room.createdByUserId !== session.user.id) {
      return NextResponse.json(
        { error: 'Sem permissão para atualizar esta sala' },
        { status: 403 }
      )
    }

    const normalizedSummary =
      data.therapistSummary === undefined
        ? undefined
        : data.therapistSummary?.trim()
          ? data.therapistSummary.trim()
          : null

    const updateData: {
      isVisibleToPlayers?: boolean
      therapistSummary?: string | null
    } = {}

    if (data.isVisibleToPlayers !== undefined) {
      updateData.isVisibleToPlayers = data.isVisibleToPlayers
    }
    if (normalizedSummary !== undefined) {
      updateData.therapistSummary = normalizedSummary
    }

    const updated = await prisma.mahaLilahRoom.update({
      where: { id: room.id },
      data: updateData,
      select: {
        id: true,
        isVisibleToPlayers: true,
        therapistSummary: true
      }
    })

    return NextResponse.json({ room: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
    }
    console.error('Erro ao atualizar sala Maha Lilah:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
