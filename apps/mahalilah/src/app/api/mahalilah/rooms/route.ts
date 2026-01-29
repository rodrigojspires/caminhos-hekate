import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma, MahaLilahParticipantRole, MahaLilahRoomStatus, MahaLilahPlanType } from '@hekate/database'
import { z } from 'zod'
import { generateRoomCode } from '@/lib/mahalilah/room-code'
import { RULES } from '@hekate/mahalilah-core'

const CreateRoomSchema = z.object({
  maxParticipants: z.number().int().min(2).max(12).default(4)
})

async function ensureUniqueCode() {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = generateRoomCode()
    const exists = await prisma.mahaLilahRoom.findUnique({ where: { code } })
    if (!exists) return code
  }
  throw new Error('Não foi possível gerar um código único para a sala.')
}

function parseDateRange(from?: string | null, to?: string | null) {
  const range: { gte?: Date; lte?: Date } = {}
  if (from) {
    const fromDate = from.length === 10 ? new Date(`${from}T00:00:00`) : new Date(from)
    if (!Number.isNaN(fromDate.getTime())) {
      range.gte = fromDate
    }
  }
  if (to) {
    const toDate = to.length === 10 ? new Date(`${to}T23:59:59.999`) : new Date(to)
    if (!Number.isNaN(toDate.getTime())) {
      range.lte = toDate
    }
  }
  return range
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const where: Record<string, any> = { createdByUserId: session.user.id }
    if (status && ['ACTIVE', 'CLOSED', 'COMPLETED'].includes(status)) {
      where.status = status
    }
    const createdAtRange = parseDateRange(from, to)
    if (createdAtRange.gte || createdAtRange.lte) {
      where.createdAt = createdAtRange
    }

    const rooms = await prisma.mahaLilahRoom.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        invites: true,
        participants: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        },
        playerStates: true,
        _count: {
          select: {
            moves: true,
            therapyEntries: true,
            cardDraws: true,
            aiReports: true
          }
        }
      }
    })

    return NextResponse.json({
      rooms: rooms.map((room) => {
        const rollsTotal = room.playerStates.reduce(
          (sum, state) => sum + (state.rollCountTotal || 0),
          0
        )
        const rollsUntilStart = room.playerStates.reduce(
          (sum, state) => sum + (state.rollCountUntilStart || 0),
          0
        )

        return {
          id: room.id,
          code: room.code,
          status: room.status,
          maxParticipants: room.maxParticipants,
          createdAt: room.createdAt,
          invites: room.invites.map((invite) => ({
            id: invite.id,
            email: invite.email,
            acceptedAt: invite.acceptedAt,
            sentAt: invite.sentAt
          })),
          participants: room.participants.map((participant) => ({
            id: participant.id,
            role: participant.role,
            consentAcceptedAt: participant.consentAcceptedAt,
            user: participant.user
          })),
          participantsCount: room.participants.length,
          stats: {
            moves: room._count.moves,
            therapyEntries: room._count.therapyEntries,
            cardDraws: room._count.cardDraws,
            aiReports: room._count.aiReports,
            rollsTotal,
            rollsUntilStart
          },
          startHouse: RULES.start.house
        }
      })
    })
  } catch (error) {
    console.error('Erro ao listar salas Maha Lilah:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

type Entitlement = {
  orderId: string
  planType: MahaLilahPlanType
  maxParticipants: number
  roomsLimit: number | null
  roomsUsed: number
}

function isExpired(expiresAt?: string | null) {
  if (!expiresAt) return false
  const d = new Date(expiresAt)
  return Number.isNaN(d.getTime()) ? false : d.getTime() < Date.now()
}

async function findEntitlement(userId: string, requestedMax: number) {
  const orders = await prisma.order.findMany({
    where: { userId, status: 'PAID' },
    orderBy: { createdAt: 'desc' }
  })

  for (const order of orders) {
    const meta = (order.metadata as any)?.mahalilah
    if (!meta || meta.active !== true) continue
    if (isExpired(meta.expiresAt)) continue
    if (meta.roomsLimit != null && meta.roomsUsed >= meta.roomsLimit) continue
    if (requestedMax > meta.maxParticipants) continue

    return {
      orderId: order.id,
      planType: meta.planType as MahaLilahPlanType,
      maxParticipants: meta.maxParticipants,
      roomsLimit: meta.roomsLimit ?? null,
      roomsUsed: meta.roomsUsed ?? 0
    } satisfies Entitlement
  }

  return null
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const payload = await request.json()
    const data = CreateRoomSchema.parse(payload)

    const entitlement = await findEntitlement(session.user.id, data.maxParticipants)
    if (!entitlement) {
      return NextResponse.json({ error: 'Sem plano ativo. Finalize a compra para criar a sala.' }, { status: 402 })
    }

    const code = await ensureUniqueCode()
    const consentTextVersion = process.env.MAHALILAH_CONSENT_VERSION || 'v1'

    const room = await prisma.$transaction(async (tx) => {
      const created = await tx.mahaLilahRoom.create({
        data: {
          code,
          createdByUserId: session.user.id,
          status: MahaLilahRoomStatus.ACTIVE,
          maxParticipants: data.maxParticipants,
          planType: entitlement.planType,
          orderId: entitlement.orderId,
          consentTextVersion
        }
      })

      await tx.mahaLilahParticipant.create({
        data: {
          roomId: created.id,
          userId: session.user.id,
          role: MahaLilahParticipantRole.THERAPIST,
          displayName: session.user.name || null
        }
      })

      await tx.mahaLilahGameState.create({
        data: { roomId: created.id }
      })

      const order = await tx.order.findUnique({ where: { id: entitlement.orderId } })
      if (order) {
        const meta = (order.metadata as any)?.mahalilah || {}
        await tx.order.update({
          where: { id: order.id },
          data: {
            metadata: {
              ...(order.metadata as any),
              mahalilah: {
                ...meta,
                roomsUsed: (meta.roomsUsed || 0) + 1
              }
            }
          }
        })
      }

      return created
    })

    return NextResponse.json({ room })
  } catch (error) {
    console.error('Erro ao criar sala Maha Lilah:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
