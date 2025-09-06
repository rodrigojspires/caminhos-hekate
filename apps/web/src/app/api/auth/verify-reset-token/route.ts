import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@hekate/database"
import { VerifyEmailSchema } from "@/lib/validations/auth"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = VerifyEmailSchema.parse(body)
    const { token } = validatedData

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

    return NextResponse.json(
      {
        message: "Token válido",
        valid: true,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Verify reset token error:", error)

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