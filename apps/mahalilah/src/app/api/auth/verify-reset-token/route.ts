import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@hekate/database'
import { VerifyResetTokenSchema } from '@/lib/validations/auth'
import { applyRateLimit } from '@/lib/security/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const rateLimited = applyRateLimit({
      request,
      scope: 'auth:verify-reset-token',
      limit: 30,
      windowMs: 15 * 60 * 1000
    })
    if (rateLimited) return rateLimited

    const body = await request.json()
    const validatedData = VerifyResetTokenSchema.parse(body)

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token: validatedData.token }
    })

    if (!resetToken) {
      return NextResponse.json(
        { message: 'Token de recuperação inválido ou expirado' },
        { status: 400 }
      )
    }

    if (resetToken.expires < new Date()) {
      await prisma.passwordResetToken.delete({ where: { token: validatedData.token } }).catch(() => undefined)
      return NextResponse.json(
        { message: 'Token de recuperação inválido ou expirado' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        message: 'Token válido',
        valid: true
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro no verify-reset-token (Maha Lilah):', error)

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
