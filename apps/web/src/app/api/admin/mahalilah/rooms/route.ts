import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma, MahaLilahParticipantRole, MahaLilahRoomStatus, MahaLilahPlanType } from '@hekate/database'
import { z } from 'zod'
import { customAlphabet } from 'nanoid'
import { resendEmailService } from '@/lib/resend-email'

const CreateRoomSchema = z.object({
  therapistEmail: z.string().email(),
  maxParticipants: z.coerce.number().int().min(1).max(12).default(4),
  planType: z.enum(['SINGLE_SESSION', 'SUBSCRIPTION', 'SUBSCRIPTION_LIMITED']).optional(),
  therapistPlays: z.boolean().default(true),
  therapistSoloPlay: z.boolean().default(false)
})

const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const generator = customAlphabet(alphabet, 6)

function getMahaLilahEmailIdentity() {
  const from = process.env.MAHALILAH_FROM_EMAIL
  if (!from) {
    throw new Error('MAHALILAH_FROM_EMAIL não configurado')
  }

  return {
    from,
    fromName: process.env.MAHALILAH_FROM_NAME || 'Maha Lilah Online',
    replyTo: process.env.MAHALILAH_REPLY_TO_EMAIL || from
  }
}

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
        isTrial: room.isTrial,
        maxParticipants: room.maxParticipants,
        therapistPlays: room.therapistPlays,
        therapistSoloPlay: room.therapistSoloPlay,
        createdAt: room.createdAt,
        createdBy: room.createdByUser,
        orderId: room.orderId,
        participantsCount: room.participants.filter((participant) => (
          participant.role === MahaLilahParticipantRole.PLAYER ||
          (room.therapistPlays && participant.role === MahaLilahParticipantRole.THERAPIST)
        )).length,
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
    const therapistSoloPlay = Boolean(data.therapistSoloPlay)
    const therapistPlays = therapistSoloPlay ? true : data.therapistPlays

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
          therapistPlays,
          therapistSoloPlay,
          isTrial: false,
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

    const baseUrl =
      process.env.NEXT_PUBLIC_MAHALILAH_URL ||
      process.env.NEXTAUTH_URL_MAHALILAH ||
      'https://mahalilahonline.com.br'
    const roomUrl = `${baseUrl}/rooms/${room.code}`
    const emailIdentity = getMahaLilahEmailIdentity()

    try {
      await resendEmailService.sendEmail({
        to: therapist.email,
        from: emailIdentity.from,
        fromName: emailIdentity.fromName,
        replyTo: emailIdentity.replyTo,
        subject: `Sua sala Maha Lilah foi criada (${room.code})`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2a2f">
            <h2>Sala Maha Lilah criada com sucesso</h2>
            <p>Olá ${therapist.name || therapist.email},</p>
            <p>Uma nova sala foi criada para você no Maha Lilah Online.</p>
            <p><strong>Código:</strong> ${room.code}</p>
            <p>
              <a href="${roomUrl}" style="display:inline-block;padding:10px 18px;background:#2f7f6f;color:#fff;border-radius:999px;text-decoration:none;">
                Entrar na sala
              </a>
            </p>
            <p style="font-size:12px;color:#5d6b75;">Equipe Maha Lilah Online</p>
            <p style="font-size:12px;color:#5d6b75;">Se você não esperava esta criação, ignore este email.</p>
          </div>
        `,
        text: `Sala Maha Lilah criada.\nCódigo: ${room.code}\nAcesse: ${roomUrl}\n\nEquipe Maha Lilah Online`
      })
    } catch (error) {
      console.warn('Falha ao enviar email de criação de sala Maha Lilah:', error)
    }

    return NextResponse.json({ room }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: error.errors }, { status: 400 })
    }
    console.error('Erro ao criar sala Maha Lilah (admin):', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
