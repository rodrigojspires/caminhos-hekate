import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { prisma } from "@hekate/database"
import { ResetPasswordSchema } from "@/lib/validations/auth"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = ResetPasswordSchema.parse(body)
    const { token, password, confirmPassword } = validatedData

    // Additional server-side validation
    if (password !== confirmPassword) {
      return NextResponse.json(
        { message: "As senhas não coincidem" },
        { status: 400 }
      )
    }

    // Find valid reset token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    })

    if (!resetToken || resetToken.expires < new Date()) {
      return NextResponse.json(
        { message: "Token de recuperação inválido ou expirado" },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: resetToken.email }
    })

    if (!user) {
      return NextResponse.json(
        { message: "Usuário não encontrado" },
        { status: 400 }
      )
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Update user password
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
      },
    })

    // Delete used reset token
    await prisma.passwordResetToken.delete({
      where: { token },
    })

    return NextResponse.json(
      {
        message: "Senha redefinida com sucesso",
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Reset password error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          message: "Dados inválidos",
          errors: error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}