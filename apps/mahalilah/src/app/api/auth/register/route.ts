import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import {
  prisma,
  MahaLilahInviteRole,
  MahaLilahParticipantRole
} from '@hekate/database'
import { generateEmailVerificationToken } from '@/lib/tokens'
import { sendEmailVerificationEmail } from '@/lib/email'
import { applyRateLimit } from '@/lib/security/rate-limit'

const RegisterSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  callbackUrl: z.string().max(2048).optional()
})

const GENERIC_REGISTER_MESSAGE =
  'Se o e-mail puder ser utilizado, você receberá as instruções para ativar a conta.'

async function assignPendingTherapistInvitesToUser(params: {
  userId: string
  email: string
  userName?: string | null
}) {
  const now = new Date()

  return prisma.$transaction(async (tx) => {
    const pendingInvites = await tx.mahaLilahInvite.findMany({
      where: {
        email: params.email,
        role: MahaLilahInviteRole.THERAPIST,
        acceptedAt: null
      },
      select: {
        id: true,
        roomId: true,
        participant: {
          select: {
            userId: true
          }
        }
      }
    })

    if (pendingInvites.length === 0) {
      return 0
    }

    let claimedInvites = 0

    for (const invite of pendingInvites) {
      if (invite.participant && invite.participant.userId !== params.userId) {
        continue
      }

      await tx.mahaLilahParticipant.upsert({
        where: {
          roomId_userId: {
            roomId: invite.roomId,
            userId: params.userId
          }
        },
        update: {
          inviteId: invite.id,
          role: MahaLilahParticipantRole.THERAPIST,
          displayName: params.userName || null,
          joinedAt: now
        },
        create: {
          roomId: invite.roomId,
          userId: params.userId,
          role: MahaLilahParticipantRole.THERAPIST,
          displayName: params.userName || null,
          inviteId: invite.id,
          joinedAt: now
        }
      })

      await tx.mahaLilahInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: now }
      })

      await tx.mahaLilahRoom.update({
        where: { id: invite.roomId },
        data: { createdByUserId: params.userId }
      })

      claimedInvites += 1
    }

    return claimedInvites
  })
}

function normalizeCallbackPath(value: string | undefined): string | undefined {
  if (!value) return undefined

  const trimmed = value.trim()
  if (!trimmed) return undefined

  let decoded = trimmed
  try {
    decoded = decodeURIComponent(trimmed)
  } catch {
    decoded = trimmed
  }

  if (!decoded.startsWith('/') || decoded.startsWith('//')) {
    return undefined
  }

  return decoded
}

export async function POST(request: NextRequest) {
  try {
    const rateLimited = applyRateLimit({
      request,
      scope: 'auth:register',
      limit: 5,
      windowMs: 15 * 60 * 1000
    })
    if (rateLimited) return rateLimited

    const body = await request.json()
    const data = RegisterSchema.parse(body)
    const normalizedEmail = data.email.trim().toLowerCase()
    const callbackUrl = normalizeCallbackPath(data.callbackUrl)

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    })

    if (existingUser) {
      try {
        await assignPendingTherapistInvitesToUser({
          userId: existingUser.id,
          email: normalizedEmail,
          userName: existingUser.name
        })
      } catch (inviteError) {
        console.error(
          'Erro ao vincular convites de terapeuta no cadastro existente (Maha Lilah):',
          inviteError
        )
      }

      if (!existingUser.emailVerified) {
        try {
          const verificationToken = await generateEmailVerificationToken(existingUser.email)
          await sendEmailVerificationEmail({
            to: existingUser.email,
            verificationToken,
            callbackUrl
          })
        } catch (emailError) {
          console.error('Erro ao reenviar verificação de email (Maha Lilah):', emailError)
        }
      }

      return NextResponse.json(
        { message: GENERIC_REGISTER_MESSAGE },
        { status: 200 }
      )
    }

    const hashedPassword = await bcrypt.hash(data.password, 12)

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: normalizedEmail,
        password: hashedPassword,
        role: 'MEMBER',
        registrationPortal: 'MAHA_LILAH',
        emailVerified: null
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    })

    try {
      await assignPendingTherapistInvitesToUser({
        userId: user.id,
        email: user.email,
        userName: user.name
      })
    } catch (inviteError) {
      console.error(
        'Erro ao vincular convites de terapeuta no novo cadastro (Maha Lilah):',
        inviteError
      )
    }

    try {
      const verificationToken = await generateEmailVerificationToken(user.email)
      await sendEmailVerificationEmail({
        to: user.email,
        verificationToken,
        callbackUrl
      })
    } catch (emailError) {
      console.error('Erro ao enviar verificação de email (Maha Lilah):', emailError)
    }

    return NextResponse.json(
      { message: GENERIC_REGISTER_MESSAGE },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          message: 'Dados inválidos',
          errors: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      )
    }

    console.error('Erro ao registrar usuário (Maha Lilah):', error)
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 })
  }
}
