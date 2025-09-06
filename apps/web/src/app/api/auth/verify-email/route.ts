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

    // Find verification token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
    })

    if (!verificationToken || verificationToken.expires < new Date()) {
      return NextResponse.json(
        { message: "Token de verificação inválido ou expirado" },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: verificationToken.identifier }
    })

    if (!user) {
      return NextResponse.json(
        { message: "Usuário não encontrado" },
        { status: 400 }
      )
    }

    // Delete used verification token
    await prisma.verificationToken.delete({
      where: { token },
    })

    return NextResponse.json(
      {
        message: "Email verificado com sucesso",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Email verification error:", error)

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