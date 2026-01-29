import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma, MahaLilahParticipantRole, MahaLilahRoomStatus, MahaLilahPlanType } from '@hekate/database'
import { z } from 'zod'
import { customAlphabet } from 'nanoid'

const CreateRoomSchema = z.object({
  therapistEmail: z.string().email(),
  maxParticipants: z.number().int().min(2).max(12).default(4),
  planType: z.enum(['SINGLE_SESSION', 'SUBSCRIPTION', 'SUBSCRIPTION_LIMITED']).optional()
})

const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const generator = customAlphabet(alphabet, 6)

async function ensureUniqueCode() {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = generator()
    const exists = await prisma.mahaLilahRoom.findUnique({ where: { code } })
    if (!exists) return code
  }
  throw new Error('Não foi possível gerar um código único para a sala.')
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const where: Record<string, any> = {}
    if (status && ['ACTIVE', 'CLOSED', 'COMPLETED'].includes(status)) {
      where.status = status
    }

    const rooms = await prisma.mahaLilahRoom.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        createdByUser: { select: { id: true, name: true, email: true } },
        participants: true,
        invites: true,
        _count: {
          select: {
            moves: true,
            therapyEntries: true,
            cardDraws: true
          }
        }
      }
    })

    return NextResponse.json({
      rooms: rooms.map((room) => ({
        id: room.id,
        code: room.code,
        status: room.status,
        planType: room.planType,
        maxParticipants: room.maxParticipants,
        createdAt: room.createdAt,
        createdBy: room.createdByUser,
        orderId: room.orderId,
        participantsCount: room.participants.length,
        invitesCount: room.invites.length,
        stats: room._count
      }))
    })
  } catch (error) {
    console.error('Erro ao listar salas Maha Lilah (admin):', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const payload = await request.json()
    const data = CreateRoomSchema.parse(payload)

    const therapist = await prisma.user.findUnique({
      where: { email: data.therapistEmail }
    })

    if (!therapist) {
      return NextResponse.json({ error: 'Terapeuta não encontrado' }, { status: 404 })
    }

    const code = await ensureUniqueCode()
    const consentTextVersion = process.env.MAHALILAH_CONSENT_VERSION || 'v1'
    const planType = (data.planType || 'SINGLE_SESSION') as MahaLilahPlanType

    const room = await prisma.$transaction(async (tx) => {
      const created = await tx.mahaLilahRoom.create({
        data: {
          code,
          createdByUserId: therapist.id,
          status: MahaLilahRoomStatus.ACTIVE,
          maxParticipants: data.maxParticipants,
          planType,
          consentTextVersion
        }
      })

      await tx.mahaLilahParticipant.create({
        data: {
          roomId: created.id,
          userId: therapist.id,
          role: MahaLilahParticipantRole.THERAPIST,
          displayName: therapist.name || null
        }
      })

      await tx.mahaLilahGameState.create({
        data: { roomId: created.id }
      })

      return created
    })

    return NextResponse.json({ room }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: error.errors }, { status: 400 })
    }
    console.error('Erro ao criar sala Maha Lilah (admin):', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
