import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@hekate/database'
import { generateEmailVerificationToken } from '@/lib/tokens'
import { sendEmailVerificationEmail } from '@/lib/email'
import { applyRateLimit } from '@/lib/security/rate-limit'
import { ResendVerificationSchema } from '@/lib/validations/auth'

const GENERIC_RESEND_MESSAGE =
  'Se o email existir e ainda não estiver verificado, enviaremos um novo link de confirmação.'

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
      scope: 'auth:resend-verification',
      limit: 5,
      windowMs: 15 * 60 * 1000
    })
    if (rateLimited) return rateLimited

    const body = await request.json()
    const validatedData = ResendVerificationSchema.parse(body)
    const normalizedEmail = validatedData.email.trim().toLowerCase()
    const callbackUrl = normalizeCallbackPath(validatedData.callbackUrl)

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { email: true, emailVerified: true }
    })

    if (user && !user.emailVerified) {
      try {
        const verificationToken = await generateEmailVerificationToken(user.email)
        await sendEmailVerificationEmail({
          to: user.email,
          verificationToken,
          callbackUrl
        })
      } catch (emailError) {
        console.error('Erro ao reenviar verificação de email (Maha Lilah):', emailError)
      }
    }

    return NextResponse.json(
      {
        message: GENERIC_RESEND_MESSAGE
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro no resend-verification (Maha Lilah):', error)

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

    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 })
  }
}
