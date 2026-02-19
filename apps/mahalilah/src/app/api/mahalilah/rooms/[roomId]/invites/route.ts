import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma, MahaLilahInviteRole, MahaLilahParticipantRole } from '@hekate/database'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { sendInviteEmail } from '@/lib/email'

const InviteSchema = z.object({
  emails: z.array(z.string().email()).min(1)
})
const DeleteInviteSchema = z.object({
  inviteId: z.string().min(1)
})

interface RouteParams {
  params: { roomId: string }
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
      return NextResponse.json({ error: 'Sem permissão para excluir convites' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const parsed = DeleteInviteSchema.safeParse({
      inviteId: searchParams.get('inviteId')
    })
    if (!parsed.success) {
      return NextResponse.json({ error: 'Convite inválido.' }, { status: 400 })
    }

    const { inviteId } = parsed.data
    const deleted = await prisma.mahaLilahInvite.deleteMany({
      where: {
        id: inviteId,
        roomId: room.id,
        acceptedAt: null
      }
    })

    if (deleted.count === 0) {
      const invite = await prisma.mahaLilahInvite.findFirst({
        where: { id: inviteId, roomId: room.id },
        select: { acceptedAt: true }
      })

      if (!invite) {
        return NextResponse.json({ error: 'Convite não encontrado.' }, { status: 404 })
      }

      if (invite.acceptedAt) {
        return NextResponse.json(
          { error: 'Não é possível excluir um convite já aceito.' },
          { status: 400 }
        )
      }

      return NextResponse.json({ error: 'Não foi possível excluir o convite.' }, { status: 400 })
    }

    return NextResponse.json({ ok: true, inviteId })
  } catch (error) {
    console.error('Erro ao excluir convite Maha Lilah:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const payload = await request.json()
    const data = InviteSchema.parse(payload)

    const room = await prisma.mahaLilahRoom.findUnique({
      where: { id: params.roomId },
      include: { participants: true }
    })

    if (!room) {
      return NextResponse.json({ error: 'Sala não encontrada' }, { status: 404 })
    }

    if (room.createdByUserId !== session.user.id) {
      return NextResponse.json({ error: 'Sem permissão para convidar' }, { status: 403 })
    }

    const normalizedEmails = data.emails.map((email) => email.toLowerCase())

    const participantsCount = room.participants.filter((participant) => (
      participant.role === MahaLilahParticipantRole.PLAYER ||
      (room.therapistPlays && participant.role === MahaLilahParticipantRole.THERAPIST)
    )).length
    const availableSlots = room.maxParticipants - participantsCount

    if (availableSlots <= 0) {
      return NextResponse.json({ error: 'Sala já atingiu o limite de participantes.' }, { status: 400 })
    }

    const emailsToInvite: string[] = []

    for (const email of normalizedEmails) {
      const user = await prisma.user.findUnique({ where: { email } })
      if (user) {
        const existingParticipant = await prisma.mahaLilahParticipant.findUnique({
          where: {
            roomId_userId: { roomId: room.id, userId: user.id }
          }
        })

        if (existingParticipant) {
          continue
        }
      }
      if (!emailsToInvite.includes(email)) {
        emailsToInvite.push(email)
      }
    }

    if (emailsToInvite.length > availableSlots) {
      return NextResponse.json({ error: 'Quantidade de convites excede o limite da sala.' }, { status: 400 })
    }

    const invites: Array<{ id: string; email: string; token: string }> = []

    for (const email of emailsToInvite) {
      const invite = await prisma.mahaLilahInvite.upsert({
        where: { roomId_email: { roomId: room.id, email } },
        create: {
          roomId: room.id,
          email,
          role: MahaLilahInviteRole.PLAYER,
          token: nanoid(32),
          invitedByUserId: session.user.id,
          sentAt: new Date()
        },
        update: {
          sentAt: new Date(),
          invitedByUserId: session.user.id
        }
      })

      invites.push(invite)

      const baseUrl =
        process.env.NEXT_PUBLIC_MAHALILAH_URL ||
        process.env.NEXTAUTH_URL ||
        'https://mahalilahonline.com.br'
      const inviteUrl = `${baseUrl}/invite/${invite.token}`
      await sendInviteEmail({
        to: email,
        therapistName: session.user.name || session.user.email,
        roomCode: room.code,
        inviteUrl
      })
    }

    return NextResponse.json({ invites })
  } catch (error) {
    console.error('Erro ao enviar convites Maha Lilah:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
