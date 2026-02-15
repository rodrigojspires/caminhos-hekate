import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@hekate/database'
import { ResetPasswordSchema } from '@/lib/validations/auth'
import { applyRateLimit } from '@/lib/security/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const rateLimited = applyRateLimit({
      request,
      scope: 'auth:reset-password',
      limit: 10,
      windowMs: 15 * 60 * 1000
    })
    if (rateLimited) return rateLimited

    const body = await request.json()
    const validatedData = ResetPasswordSchema.parse(body)
    const { token, password } = validatedData

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token }
    })

    if (!resetToken) {
      return NextResponse.json(
        { message: 'Token de recuperação inválido ou expirado' },
        { status: 400 }
      )
    }

    if (resetToken.expires < new Date()) {
      await prisma.passwordResetToken.delete({ where: { token } }).catch(() => undefined)
      return NextResponse.json(
        { message: 'Token de recuperação inválido ou expirado' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: resetToken.email }
    })

    if (!user) {
      return NextResponse.json({ message: 'Usuário não encontrado' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
      }),
      prisma.passwordResetToken.delete({
        where: { token }
      })
    ])

    return NextResponse.json({ message: 'Senha redefinida com sucesso' }, { status: 200 })
  } catch (error) {
    console.error('Erro no reset-password (Maha Lilah):', error)

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
