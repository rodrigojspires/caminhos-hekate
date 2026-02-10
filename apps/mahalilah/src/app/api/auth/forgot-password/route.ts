import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@hekate/database'
import { sendPasswordResetEmail } from '@/lib/email'
import { generatePasswordResetToken } from '@/lib/tokens'
import { ForgotPasswordSchema } from '@/lib/validations/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = ForgotPasswordSchema.parse(body)

    const user = await prisma.user.findUnique({
      where: { email: validatedData.email }
    })

    // Retorna sucesso sempre para não expor se o email existe ou não.
    if (user) {
      try {
        const resetToken = await generatePasswordResetToken(user.email)
        await sendPasswordResetEmail({
          to: user.email,
          resetToken
        })
      } catch (emailError) {
        console.error('Erro ao enviar email de redefinição de senha:', emailError)
      }
    }

    return NextResponse.json(
      {
        message: 'Se o email existir em nossa base, você receberá um link para redefinir sua senha.'
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro no forgot-password (Maha Lilah):', error)

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
